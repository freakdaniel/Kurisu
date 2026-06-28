import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Spinner, Text, VStack, Center } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { DesktopSessionEntry } from '@/types/desktop';
import type { DisplayBlock } from '@/features/chat/types';
import { isApprovalPlaceholderText } from '@/lib/approvalRules';
import { UserMessage } from '@/features/chat/messages/UserMessage';
import { AssistantMessage } from '@/features/chat/messages/AssistantMessage';
import { getReasoningArtifactsForEntry } from '@/features/chat/messages/reasoningArtifacts';
import {
  ThinkingOrbit,
} from '@/features/chat/messages/AnimatedThinkingLabel';
import {
  PendingApprovalCard,
} from '@/features/chat/messages/PendingApprovalCard';

function groupEntries(entries: DesktopSessionEntry[]): DisplayBlock[] {
  const blocks: DisplayBlock[] = [];
  let currentBlock: DisplayBlock | null = null;

  for (const entry of entries) {
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
    const isThought = isThinkingEntryShared(entry);

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
}

function getFinalAssistantBlockIndices(blocks: DisplayBlock[]): Set<number> {
  const set = new Set<number>();
  let lastAiIdx = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'user') {
      if (lastAiIdx >= 0) set.add(lastAiIdx);
      lastAiIdx = -1;
    } else if (blocks[i].type === 'assistant') {
      lastAiIdx = i;
    }
  }
  if (lastAiIdx >= 0) set.add(lastAiIdx);
  return set;
}

function isThinkingEntryShared(entry: DesktopSessionEntry): boolean {
  const type = entry.type?.toLowerCase() ?? '';
  const title = entry.title?.toLowerCase() ?? '';
  return type === 'thought' || type === 'thinking' ||
    title === 'thinking' || title === 'thought';
}

export interface MessageListProps {
  displaySessionDetail: { entries: DesktopSessionEntry[]; session: { messageCount?: number } } | null | undefined;
  isLoadingSession: boolean;
  isAwaitingAssistantText: boolean;
  loadingPhrase: string;
  plainThinkingLabel: string;
  liveReasoningAssistantId: string;
  latestPendingUserEntryId: string;
  animatedUserEntryIdsRef: MutableRefObject<Set<string>>;
  locale: string;
  reasoningArtifactsByAssistantId?: Record<string, DisplayBlock[]>;
  liveReasoningArtifacts?: DisplayBlock[];
  latestLiveThinkingSnapshot?: string;
  activePendingApprovalPresentation: { pendingEntry: DesktopSessionEntry; suggestedRule: string; signature: string } | null;
  approvalFeedbackById: Record<string, string>;
  onApprovalFeedbackChange: (entryId: string, value: string) => void;
  onApprovalAllowOnce: () => void;
  onApprovalAlwaysAllow: () => void;
  onApprovalSubmitFeedback: () => void;
  onOpenReasoning: (entryId: string) => void;
  onToggleLiveReasoning: () => void;
}

export function MessageList(props: MessageListProps) {
  const { t } = useTranslation();

  const entries = useMemo(
    () => props.displaySessionDetail?.entries ?? [],
    [props.displaySessionDetail?.entries],
  );
  const groupedEntries = useMemo(() => groupEntries(entries), [entries]);
  const finalAssistantBlockIndices = useMemo(
    () => getFinalAssistantBlockIndices(groupedEntries),
    [groupedEntries],
  );
  const reasoningArtifactsByAssistantId = useMemo(
    () => props.reasoningArtifactsByAssistantId
      ?? getReasoningArtifactsForEntry(groupedEntries, finalAssistantBlockIndices),
    [props.reasoningArtifactsByAssistantId, groupedEntries, finalAssistantBlockIndices],
  );

  if (props.isLoadingSession) {
    return (
      <Center h="full">
        <VStack spacing={3}>
          <Spinner size="md" color="brand.500" />
          <Text fontSize="sm" color="gray.500">{t('chat.message.loading')}</Text>
        </VStack>
      </Center>
    );
  }

  if (!props.displaySessionDetail || props.displaySessionDetail.entries.length === 0) {
    return (
      <Center h="full">
        <Text fontSize="sm" color="gray.600">
          {t((props.displaySessionDetail?.session.messageCount ?? 0) > 0 ? 'chat.noReadableMessages' : 'chat.noMessages')}
        </Text>
      </Center>
    );
  }

  return (
    <Box px={4}>
      <Box mx="auto" maxW="4xl">
        <VStack spacing={0} align="stretch" py={4}>
          {groupedEntries.map((block, blockIdx) => {
            if (block.type === 'user') {
              return block.entries.map((entry) => {
                const text = entry.body || entry.title || '';
                return (
                  <UserMessage
                    key={entry.id}
                    entry={entry}
                    text={text}
                    locale={props.locale}
                    latestPendingUserEntryId={props.latestPendingUserEntryId}
                    animatedUserEntryIdsRef={props.animatedUserEntryIdsRef}
                  />
                );
              });
            }

            if (block.type === 'tool-group') {
              const pendingEntries = block.entries.filter((entry) => {
                const normalizedStatus = entry.status.trim().toLowerCase();
                return normalizedStatus === 'approval-required' || normalizedStatus === 'input-required';
              });

              if (pendingEntries.length === 0) {
                return null;
              }

              return (
                <VStack key={`approvals-${blockIdx}`} spacing={2} align="stretch" py={2}>
                  {pendingEntries.map((entry) => {
                    const activePresentation = props.activePendingApprovalPresentation;
                    if (!activePresentation || activePresentation.pendingEntry.id !== entry.id) {
                      return null;
                    }
                    return (
                      <Box key={entry.id} mt={2} ml={0}>
                        <PendingApprovalCard
                          entry={entry}
                          feedbackValue={props.approvalFeedbackById[entry.id] ?? ''}
                          onFeedbackChange={(value) => props.onApprovalFeedbackChange(entry.id, value)}
                          onAllowOnce={props.onApprovalAllowOnce}
                          onAlwaysAllow={props.onApprovalAlwaysAllow}
                          onSubmitFeedback={props.onApprovalSubmitFeedback}
                        />
                      </Box>
                    );
                  })}
                </VStack>
              );
            }

            if (block.type === 'thought') {
              return null;
            }

            return block.entries.map((entry, entryIdx) => {
              const text = entry.body ?? '';
              const thinking = entry.thinkingBody ?? '';
              const isStreamingEntry = entry.status === 'streaming';
              if (!text && !thinking) return null;
              if (isApprovalPlaceholderText(text)) return null;
              const isLastEntry = entryIdx === block.entries.length - 1;
              const isFinalAssistantEntry = isLastEntry && finalAssistantBlockIndices.has(blockIdx);
              const reasoningArtifacts = reasoningArtifactsByAssistantId[entry.id] ?? [];
              const hasReasoningSummary = isFinalAssistantEntry && !!text.trim() && (
                isStreamingEntry
                  ? ((props.liveReasoningArtifacts?.length ?? 0) > 0 || !!(props.latestLiveThinkingSnapshot ?? '').trim())
                  : (reasoningArtifacts.length > 0 || !!thinking.trim())
              );

              return (
                <AssistantMessage
                  key={entry.id}
                  entry={entry}
                  text={text}
                  isStreaming={isStreamingEntry}
                  isFinalEntry={isFinalAssistantEntry}
                  hasReasoningSummary={hasReasoningSummary}
                  locale={props.locale}
                  onOpenReasoning={props.onOpenReasoning}
                />
              );
            });
          })}
          <AnimatePresence initial={false}>
            {props.isAwaitingAssistantText && (
              <motion.div
                key="assistant-processing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <VStack align="start" spacing={2} py={2.5} px={1}>
                  <PendingProcessingButton
                    label={props.loadingPhrase || props.plainThinkingLabel}
                    onClick={props.onToggleLiveReasoning}
                  />
                </VStack>
              </motion.div>
            )}
          </AnimatePresence>
        </VStack>
      </Box>
    </Box>
  );
}

function PendingProcessingButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: '#d4d4d8',
        fontWeight: 400,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <Box display="inline-flex" alignItems="center" mr={2}>
        <ThinkingOrbit />
      </Box>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function EmptyMessage({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
