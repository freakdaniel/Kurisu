import type { TFunction } from 'i18next';
import type { DesktopSessionEntry, DesktopSessionEvent } from '@/types/desktop';
import type { DisplayBlock } from '@/features/chat/types';
import {
  createLiveThoughtEntry,
  isToolLifecycleEvent,
  LIVE_TOOL_SOURCE,
  isToolPendingStatus,
  normalizeToolLifecycleStatus,
  type LiveReasoningSegment,
} from '@/features/chat/live/liveToolEntries';

export function buildLiveReasoningArtifacts(
  events: DesktopSessionEvent[],
  workingDirectory: string,
  gitBranch: string,
): DisplayBlock[] {
  const segments: LiveReasoningSegment[] = [];
  let currentThought: LiveReasoningSegment | null = null;

  const closeThought = () => {
    currentThought = null;
  };

  for (const event of events) {
    const eventWorkingDirectory = event.workingDirectory || workingDirectory;
    const eventGitBranch = event.gitBranch || gitBranch;

    if (event.contentDelta || event.kind === 'assistantCompleted' || event.kind === 'turnCompleted') {
      closeThought();
    }

    const thinkingDelta = event.thinkingDelta ?? '';
    const thinkingSnapshot = event.thinkingSnapshot ?? '';
    const currentThoughtBody = currentThought?.entry.body ?? '';
    const nextThoughtText: string = thinkingSnapshot
      ? thinkingSnapshot
      : thinkingDelta
        ? `${currentThoughtBody}${thinkingDelta}`
        : '';

    if (nextThoughtText.trim()) {
      if (!currentThought) {
        currentThought = {
          type: 'thought',
          id: `live-thought-${segments.length}-${event.timestampUtc}`,
          entry: createLiveThoughtEntry(
            `live-thought-${segments.length}-${event.timestampUtc}`,
            nextThoughtText,
            event.timestampUtc,
            eventWorkingDirectory,
            eventGitBranch,
          ),
        };
        segments.push(currentThought);
      } else {
        currentThought.entry = {
          ...currentThought.entry,
          body: nextThoughtText,
          timestamp: event.timestampUtc,
          workingDirectory: eventWorkingDirectory,
          gitBranch: eventGitBranch,
        };
      }

      continue;
    }

    if (!isToolLifecycleEvent(event)) {
      continue;
    }

    closeThought();

    const normalizedStatus = normalizeToolLifecycleStatus(event.kind, event.status);
    const existingSegment =
      (event.toolCallId
        ? segments.find((segment) => segment.type === 'tool' && segment.entry.id === event.toolCallId)
        : undefined) ??
      [...segments].reverse().find((segment) =>
        segment.type === 'tool' &&
        segment.entry.toolName === event.toolName &&
        isToolPendingStatus(segment.entry.status),
      );

    const toolEntry: DesktopSessionEntry = {
      id: existingSegment?.entry.id || event.toolCallId || `live-tool-${segments.length}-${event.toolName}-${event.timestampUtc}`,
      type: 'tool',
      timestamp: event.timestampUtc,
      workingDirectory: eventWorkingDirectory,
      gitBranch: eventGitBranch,
      title: event.toolName,
      body: event.toolOutput || event.message || existingSegment?.entry.body || '',
      thinkingBody: '',
      status: normalizedStatus,
      toolName: event.toolName,
      approvalState: event.approvalState || existingSegment?.entry.approvalState || '',
      exitCode: null,
      arguments: event.toolArgumentsJson || existingSegment?.entry.arguments || '{}',
      scope: event.toolCallGroupId || existingSegment?.entry.scope || `live-tool-group-${segments.length}`,
      sourcePath: LIVE_TOOL_SOURCE,
      resolutionStatus: 'live',
      resolvedAt: '',
      changedFiles: event.changedFiles ?? existingSegment?.entry.changedFiles ?? [],
      questions: event.questions ?? existingSegment?.entry.questions ?? [],
      answers: event.answers ?? existingSegment?.entry.answers ?? [],
      isExplicitAskRule: false,
      matchedApprovalRule: '',
    };

    if (existingSegment) {
      existingSegment.entry = toolEntry;
    } else {
      segments.push({
        type: 'tool',
        id: toolEntry.id,
        entry: toolEntry,
      });
    }
  }

  const blocks: DisplayBlock[] = [];
  let currentBlock: DisplayBlock | null = null;

  for (const segment of segments) {
    const blockType: DisplayBlock['type'] = segment.type === 'thought' ? 'thought' : 'tool-group';
    const shouldSplitToolGroup =
      blockType === 'tool-group' &&
      currentBlock?.type === 'tool-group' &&
      ((currentBlock.entries[currentBlock.entries.length - 1]?.scope || '') !== (segment.entry.scope || '')) &&
      ((currentBlock.entries[currentBlock.entries.length - 1]?.scope || '') || (segment.entry.scope || ''));

    if (!currentBlock || currentBlock.type !== blockType || shouldSplitToolGroup) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      currentBlock = { type: blockType, entries: [segment.entry] };
    } else {
      currentBlock.entries.push(segment.entry);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

export function getLatestLiveThinkingSnapshot(
  events: DesktopSessionEvent[],
): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.thinkingSnapshot?.trim()) {
      return event.thinkingSnapshot;
    }

    if (event.thinkingDelta?.trim()) {
      return event.thinkingDelta;
    }
  }

  return '';
}

export function resolveLiveReasoningStatus(
  events: DesktopSessionEvent[],
  isTurnActive: boolean,
  hasStreamingResponse: boolean,
): 'running' | 'completed' {
  let status: 'running' | 'completed' =
    isTurnActive && !hasStreamingResponse ? 'running' : 'completed';

  for (const event of events) {
    const hasThinkingUpdate = !!event.thinkingDelta || !!event.thinkingSnapshot;
    const hasResponseUpdate = !!event.contentDelta || !!event.contentSnapshot;

    if (event.kind === 'assistantCompleted' || event.kind === 'turnCompleted' || event.kind === 'turnCancelled') {
      status = 'completed';
      continue;
    }

    if (hasResponseUpdate) {
      status = 'completed';
      continue;
    }

    if (
      hasThinkingUpdate ||
      isToolLifecycleEvent(event) ||
      event.kind === 'turnStarted' ||
      event.kind === 'turnReattached' ||
      event.kind === 'assistantPreparingContext' ||
      event.kind === 'assistantGenerating' ||
      event.kind === 'toolApproved' ||
      event.kind === 'userInputReceived'
    ) {
      status = 'running';
    }
  }

  return status;
}

export function getReasoningToggleLabel(t: TFunction, isStreaming: boolean): string {
  if (isStreaming) {
    return t('chat.reasoning.timelineTitle');
  }

  return t('chat.reasoning.finished');
}

export function formatThinkingDuration(t: TFunction, durationMs: number): string {
  if (durationMs < 1_000) {
    return t('chat.reasoning.durationMilliseconds', { value: Math.max(1, Math.round(durationMs)) });
  }

  if (durationMs < 60_000) {
    const seconds = durationMs / 1_000;
    const formatted = seconds < 10 ? seconds.toFixed(1).replace(/\.0$/, '') : Math.round(seconds).toString();
    return t('chat.reasoning.durationSeconds', { value: formatted });
  }

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1_000);
  return seconds > 0
    ? t('chat.reasoning.durationMinutesSeconds', { minutes, seconds })
    : t('chat.reasoning.durationMinutes', { minutes });
}

export function getThinkingStatusLabel(t: TFunction, durationMs: number): string {
  if (durationMs > 0) {
    return t('chat.reasoning.thoughtFor', { duration: formatThinkingDuration(t, durationMs) });
  }

  return t('chat.reasoning.thinking');
}

export function normalizeWittyLoadingPhrases(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) {
    return [fallback];
  }

  const phrases = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return phrases.length > 0 ? phrases : [fallback];
}

export function pickWittyLoadingPhrase(phrases: readonly string[], fallback: string, previous = ''): string {
  if (phrases.length === 0) {
    return fallback;
  }

  if (phrases.length === 1) {
    return phrases[0] || fallback;
  }

  const candidates = phrases.filter((phrase) => phrase !== previous);
  const pool = candidates.length > 0 ? candidates : phrases;
  return pool[Math.floor(Math.random() * pool.length)] || fallback;
}
