import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DesktopSessionDetail, DesktopSessionEntry, DesktopSessionEvent } from '@/types/desktop';
import {
  buildLiveReasoningArtifacts,
  createStreamingAssistantEntry,
  getLatestLiveThinkingSnapshot,
  resolveLiveReasoningStatus,
  getReasoningArtifactsForEntry,
  type DisplayBlock,
} from '@/features/chat';

export interface UseMessageRoutingInput {
  selectedSessionId?: string;
  sessionDetail: DesktopSessionDetail | null;
  selectedSession: { workingDirectory?: string; gitBranch?: string } | undefined;
  selectedLiveSessionEvents: DesktopSessionEvent[];
  effectiveStreamingSnapshot: string;
  retainedStreamingSnapshot: { sessionId: string; text: string };
  isSessionStreaming: boolean;
  isComposerBusy: boolean;
  latestSessionEvent: { sessionId: string; timestampUtc: string } | null;
  isPendingSelectedSession: boolean;
}

export interface UseMessageRoutingResult {
  displaySessionDetail: DesktopSessionDetail | null;
  latestPendingUserEntryId: string;
  groupedEntries: DisplayBlock[];
  finalAssistantBlockIndices: Set<number>;
  reasoningArtifactsByAssistantId: Record<string, DisplayBlock[]>;
  assistantEntryById: Record<string, DesktopSessionEntry>;
  latestFinalAssistantEntryId: string;
  liveReasoningArtifacts: DisplayBlock[];
  latestLiveThinkingSnapshot: string;
  liveReasoningStatus: 'running' | 'completed';
  liveReasoningAssistantEntry: DesktopSessionEntry | null;
  isLiveReasoningPanel: boolean;
  activeReasoningArtifacts: DisplayBlock[];
  activeReasoningAssistantEntry: DesktopSessionEntry | null;
  activeReasoningEntries: DesktopSessionEntry[];
  isReasoningInProgress: boolean;
  openReasoningAssistantId: string | null;
  setOpenReasoningAssistantId: (id: string | null) => void;
  handleOpenReasoning: (entryId: string) => void;
  handleToggleLiveReasoning: () => void;
}

export function useMessageRouting(input: UseMessageRoutingInput): UseMessageRoutingResult {
  const liveReasoningAssistantId = input.selectedSessionId ? `streaming-${input.selectedSessionId}` : '';
  const [openReasoningAssistantId, setOpenReasoningAssistantId] = useState<string | null>(null);

  const displaySessionDetail = useMemo<DesktopSessionDetail | null>(() => {
    if (!input.sessionDetail || !input.selectedSessionId) {
      return input.sessionDetail;
    }

    const syntheticEntries: DesktopSessionEntry[] = input.isSessionStreaming ? [] : [];
    let baseEntries = input.sessionDetail.entries;
    const hasStreamingAssistant = input.effectiveStreamingSnapshot.length > 0;
    const lastNonSystemEntry = [...input.sessionDetail.entries]
      .reverse()
      .find((entry) => entry.type !== 'system' && entry.type !== 'tool_result');
    const lastEntryMatchesStreamingSnapshot =
      lastNonSystemEntry?.type === 'assistant' &&
      (lastNonSystemEntry.body ?? '').trim() === input.effectiveStreamingSnapshot;
    const shouldRenderSyntheticAssistant =
      hasStreamingAssistant &&
      (input.isComposerBusy || !lastEntryMatchesStreamingSnapshot);

    if (shouldRenderSyntheticAssistant) {
      if (input.isComposerBusy && lastEntryMatchesStreamingSnapshot && lastNonSystemEntry?.id) {
        baseEntries = input.sessionDetail.entries.filter((entry) => entry.id !== lastNonSystemEntry.id);
      }

      const timestamp = input.latestSessionEvent?.sessionId === input.selectedSessionId
        ? input.latestSessionEvent.timestampUtc
        : new Date().toISOString();
      syntheticEntries.push(
        createStreamingAssistantEntry(
          input.selectedSessionId,
          input.selectedSession?.workingDirectory ?? input.sessionDetail.session.workingDirectory,
          input.selectedSession?.gitBranch ?? input.sessionDetail.session.gitBranch,
          input.effectiveStreamingSnapshot,
          '',
          timestamp,
        ),
      );
    }

    if (syntheticEntries.length === 0) {
      return input.sessionDetail;
    }

    const replacedEntryCount = input.sessionDetail.entries.length - baseEntries.length;
    const syntheticAssistantCount = syntheticEntries.filter((entry) => entry.type === 'assistant').length;
    const syntheticToolCount = syntheticEntries.filter((entry) => entry.type === 'tool').length;
    const lastTimestamp = syntheticEntries[syntheticEntries.length - 1]?.timestamp ?? input.sessionDetail.summary.lastTimestamp;

    return {
      ...input.sessionDetail,
      entryCount: input.sessionDetail.entryCount + syntheticEntries.length - replacedEntryCount,
      windowSize: input.sessionDetail.windowSize + syntheticEntries.length - replacedEntryCount,
      summary: {
        ...input.sessionDetail.summary,
        assistantCount: input.sessionDetail.summary.assistantCount + syntheticAssistantCount - replacedEntryCount,
        toolCount: input.sessionDetail.summary.toolCount + syntheticToolCount,
        lastTimestamp,
      },
      entries: [...baseEntries, ...syntheticEntries],
    };
  }, [
    input.effectiveStreamingSnapshot,
    input.isComposerBusy,
    input.isSessionStreaming,
    input.latestSessionEvent,
    input.selectedSession?.gitBranch,
    input.selectedSession?.workingDirectory,
    input.selectedSessionId,
    input.sessionDetail,
  ]);

  const latestPendingUserEntryId = useMemo(
    () =>
      input.isPendingSelectedSession
        ? [...(displaySessionDetail?.entries ?? [])]
          .reverse()
          .find((entry) => entry.type === 'user' && entry.id.startsWith('user-'))?.id ?? ''
        : '',
    [displaySessionDetail?.entries, input.isPendingSelectedSession],
  );

  const groupedEntries = useMemo<DisplayBlock[]>(() => {
    if (!displaySessionDetail?.entries) return [];

    const blocks: DisplayBlock[] = [];
    let currentBlock: DisplayBlock | null = null;

    for (const entry of displaySessionDetail.entries) {
      if (entry.type === 'system' || entry.type === 'tool_result') continue;
      if (
        entry.type === 'tool' &&
        entry.status.trim().toLowerCase() === 'approval-required' &&
        !!entry.resolutionStatus?.trim()
      ) {
        continue;
      }

      const isUser = entry.type === 'user';
      const isTool = entry.type === 'tool' || !!entry.toolName;
      const isThought = entry.type?.toLowerCase() === 'thought' || entry.type?.toLowerCase() === 'thinking' ||
        entry.title?.toLowerCase() === 'thinking' || entry.title?.toLowerCase() === 'thought';

      const blockType: DisplayBlock['type'] =
        isThought ? 'thought' : isTool ? 'tool-group' : isUser ? 'user' : 'assistant';

      const shouldSplitToolGroup =
        blockType === 'tool-group' &&
        currentBlock?.type === 'tool-group' &&
        ((currentBlock.entries[currentBlock.entries.length - 1]?.scope || '') !== (entry.scope || '')) &&
        ((currentBlock.entries[currentBlock.entries.length - 1]?.scope || '') || (entry.scope || ''));

      if (!currentBlock || currentBlock.type !== blockType || shouldSplitToolGroup) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: blockType, entries: [entry] };
      } else {
        currentBlock.entries.push(entry);
      }
    }

    if (currentBlock) blocks.push(currentBlock);
    return blocks;
  }, [displaySessionDetail?.entries]);

  const finalAssistantBlockIndices = useMemo(() => {
    const set = new Set<number>();
    let lastAiIdx = -1;
    for (let i = 0; i < groupedEntries.length; i++) {
      if (groupedEntries[i].type === 'user') {
        if (lastAiIdx >= 0) set.add(lastAiIdx);
        lastAiIdx = -1;
      } else if (groupedEntries[i].type === 'assistant') {
        lastAiIdx = i;
      }
    }
    if (lastAiIdx >= 0) set.add(lastAiIdx);
    return set;
  }, [groupedEntries]);

  const reasoningArtifactsByAssistantId = useMemo(
    () => getReasoningArtifactsForEntry(groupedEntries, finalAssistantBlockIndices),
    [groupedEntries, finalAssistantBlockIndices],
  );

  const assistantEntryById = useMemo(() => {
    const mapping: Record<string, DesktopSessionEntry> = {};
    groupedEntries.forEach((block) => {
      if (block.type !== 'assistant') {
        return;
      }

      block.entries.forEach((entry) => {
        mapping[entry.id] = entry;
      });
    });
    return mapping;
  }, [groupedEntries]);
  const latestFinalAssistantEntryId = useMemo(() => {
    for (let index = groupedEntries.length - 1; index >= 0; index -= 1) {
      const block = groupedEntries[index];
      if (block.type !== 'assistant' || !finalAssistantBlockIndices.has(index)) {
        continue;
      }

      return block.entries[block.entries.length - 1]?.id ?? '';
    }

    return '';
  }, [finalAssistantBlockIndices, groupedEntries]);

  const liveReasoningArtifacts = useMemo<DisplayBlock[]>(
    () =>
      buildLiveReasoningArtifacts(
        input.selectedLiveSessionEvents,
        input.selectedSession?.workingDirectory ?? input.sessionDetail?.session.workingDirectory ?? '',
        input.selectedSession?.gitBranch ?? input.sessionDetail?.session.gitBranch ?? '',
      ),
    [
      input.selectedLiveSessionEvents,
      input.selectedSession?.gitBranch,
      input.selectedSession?.workingDirectory,
      input.sessionDetail?.session.gitBranch,
      input.sessionDetail?.session.workingDirectory,
    ],
  );
  const latestLiveThinkingSnapshot = useMemo(
    () => getLatestLiveThinkingSnapshot(input.selectedLiveSessionEvents),
    [input.selectedLiveSessionEvents],
  );
  const liveReasoningStatus = useMemo(
    () => resolveLiveReasoningStatus(
      input.selectedLiveSessionEvents,
      input.isComposerBusy,
      !!input.effectiveStreamingSnapshot.trim(),
    ),
    [input.effectiveStreamingSnapshot, input.isComposerBusy, input.selectedLiveSessionEvents],
  );
  const liveReasoningAssistantEntry = useMemo<DesktopSessionEntry | null>(() => {
    if (!input.selectedSessionId || !liveReasoningAssistantId) {
      return null;
    }

    return createStreamingAssistantEntry(
      input.selectedSessionId,
      input.selectedSession?.workingDirectory ?? input.sessionDetail?.session.workingDirectory ?? '',
      input.selectedSession?.gitBranch ?? input.sessionDetail?.session.gitBranch ?? '',
      input.effectiveStreamingSnapshot,
      latestLiveThinkingSnapshot,
      input.latestSessionEvent?.sessionId === input.selectedSessionId ? input.latestSessionEvent.timestampUtc : new Date().toISOString(),
    );
  }, [
    input.effectiveStreamingSnapshot,
    input.latestSessionEvent,
    input.selectedSession?.gitBranch,
    input.selectedSession?.workingDirectory,
    input.selectedSessionId,
    input.sessionDetail?.session.gitBranch,
    input.sessionDetail?.session.workingDirectory,
    latestLiveThinkingSnapshot,
    liveReasoningAssistantId,
  ]);
  const isLiveReasoningPanel =
    !!liveReasoningAssistantId &&
    openReasoningAssistantId === liveReasoningAssistantId &&
    (input.isComposerBusy || !!assistantEntryById[liveReasoningAssistantId] || liveReasoningArtifacts.length > 0);
  const activeReasoningArtifacts = openReasoningAssistantId
    ? (() => {
      const mappedArtifacts = reasoningArtifactsByAssistantId[openReasoningAssistantId] ?? [];
      const canUseLiveArtifacts =
        liveReasoningArtifacts.length > 0 &&
        (isLiveReasoningPanel || openReasoningAssistantId === latestFinalAssistantEntryId);
      return canUseLiveArtifacts ? liveReasoningArtifacts : mappedArtifacts;
    })()
    : [];
  const activeReasoningAssistantEntry = openReasoningAssistantId
    ? assistantEntryById[openReasoningAssistantId] ?? (isLiveReasoningPanel ? liveReasoningAssistantEntry : null)
    : null;
  const activeReasoningEntries = useMemo(
    () => activeReasoningArtifacts.flatMap((artifact) => artifact.entries),
    [activeReasoningArtifacts],
  );
  const isReasoningInProgress =
    isLiveReasoningPanel
      ? liveReasoningStatus === 'running'
      : false;

  const handleOpenReasoning = useCallback((entryId: string) => {
    setOpenReasoningAssistantId((current) => current === entryId ? null : entryId);
  }, []);

  const handleToggleLiveReasoning = useCallback(() => {
    setOpenReasoningAssistantId((current) =>
      current === liveReasoningAssistantId ? null : liveReasoningAssistantId);
  }, [liveReasoningAssistantId]);

  useEffect(() => {
    if (!input.selectedSessionId) {
      setOpenReasoningAssistantId(null);
      return;
    }

    if (!openReasoningAssistantId) {
      return;
    }

    if (openReasoningAssistantId === liveReasoningAssistantId && input.isComposerBusy) {
      return;
    }

    if (openReasoningAssistantId === liveReasoningAssistantId) {
      for (let index = groupedEntries.length - 1; index >= 0; index -= 1) {
        const block = groupedEntries[index];
        if (block.type !== 'assistant' || !finalAssistantBlockIndices.has(index)) {
          continue;
        }

        const entry = block.entries[block.entries.length - 1];
        if (entry?.id) {
          setOpenReasoningAssistantId(entry.id);
          return;
        }
      }

      return;
    }

    const hasArtifacts = openReasoningAssistantId in reasoningArtifactsByAssistantId;
    const hasThinking = !!assistantEntryById[openReasoningAssistantId]?.thinkingBody?.trim();
    if (!hasArtifacts && !hasThinking) {
      setOpenReasoningAssistantId(null);
    }
  }, [
    assistantEntryById,
    finalAssistantBlockIndices,
    groupedEntries,
    input.isComposerBusy,
    input.selectedSessionId,
    liveReasoningAssistantId,
    openReasoningAssistantId,
    reasoningArtifactsByAssistantId,
  ]);

  return {
    displaySessionDetail,
    latestPendingUserEntryId,
    groupedEntries,
    finalAssistantBlockIndices,
    reasoningArtifactsByAssistantId,
    assistantEntryById,
    latestFinalAssistantEntryId,
    liveReasoningArtifacts,
    latestLiveThinkingSnapshot,
    liveReasoningStatus,
    liveReasoningAssistantEntry,
    isLiveReasoningPanel,
    activeReasoningArtifacts,
    activeReasoningAssistantEntry,
    activeReasoningEntries,
    isReasoningInProgress,
    openReasoningAssistantId,
    setOpenReasoningAssistantId,
    handleOpenReasoning,
    handleToggleLiveReasoning,
  };
}
