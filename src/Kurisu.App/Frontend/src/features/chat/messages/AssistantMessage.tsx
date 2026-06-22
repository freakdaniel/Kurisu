import { Box, Button, HStack, IconButton, Tooltip } from '@chakra-ui/react';
import { Brain, ChevronRight, Copy, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DesktopSessionEntry } from '@/types/desktop';
import type { DisplayBlock } from '@/features/chat/types';
import { copyTextToClipboard, StreamingAssistantBody } from '@/features/chat/markdown';
import { getReasoningToggleLabel } from '@/features/chat/live';

function formatMessageDetails(locale: string, t: TFunction, timestamp?: string): string {
  if (!timestamp) {
    return t('chat.message.timeUnavailable');
  }

  try {
    return new Date(timestamp).toLocaleString(locale || undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

export interface AssistantMessageProps {
  entry: DesktopSessionEntry;
  text: string;
  isStreaming: boolean;
  isFinalEntry: boolean;
  hasReasoningSummary: boolean;
  locale: string;
  onOpenReasoning: (entryId: string) => void;
}

export function AssistantMessage({
  entry,
  text,
  isStreaming,
  isFinalEntry,
  hasReasoningSummary,
  locale,
  onOpenReasoning,
}: AssistantMessageProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      key={entry.id}
      layout="position"
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      <Box py={2}>
        {hasReasoningSummary && (
          <Button
            variant="ghost"
            h="34px"
            px={3}
            mb={3}
            borderRadius="14px"
            fontWeight="normal"
            color="gray.300"
            bg="rgba(255,255,255,0.03)"
            _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
            leftIcon={<Brain size={14} />}
            rightIcon={<ChevronRight size={14} />}
            onClick={() => onOpenReasoning(entry.id)}
          >
            {getReasoningToggleLabel(t, isStreaming)}
          </Button>
        )}
        {text && (
          <StreamingAssistantBody text={text} isStreaming={isStreaming} />
        )}

        {isFinalEntry && !isStreaming && text && (
          <HStack spacing={1} mt={2} ml={1}>
            <Tooltip label={t('chat.message.copyRaw')} hasArrow>
              <IconButton
                aria-label={t('chat.message.copyRawMessage')}
                icon={<Copy size={15} />}
                variant="ghost"
                size="sm"
                color="gray.400"
                borderRadius="10px"
                _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
                onClick={() => { void copyTextToClipboard(text); }}
              />
            </Tooltip>
            <Tooltip label={formatMessageDetails(locale, t, entry.timestamp)} hasArrow>
              <IconButton
                aria-label={t('chat.message.info')}
                icon={<Info size={15} />}
                variant="ghost"
                size="sm"
                color="gray.400"
                borderRadius="10px"
                _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
              />
            </Tooltip>
          </HStack>
        )}
      </Box>
    </motion.div>
  );
}

export function getReasoningArtifactsForEntry(
  groupedEntries: DisplayBlock[],
  finalAssistantBlockIndices: Set<number>,
): Record<string, DisplayBlock[]> {
  const mapping: Record<string, DisplayBlock[]> = {};
  let pendingArtifacts: DisplayBlock[] = [];

  groupedEntries.forEach((block, blockIdx) => {
    if (block.type === 'user') {
      pendingArtifacts = [];
      return;
    }

    if (block.type === 'tool-group' || block.type === 'thought') {
      pendingArtifacts = [...pendingArtifacts, block];
      return;
    }

    if (block.type === 'assistant' && finalAssistantBlockIndices.has(blockIdx) && pendingArtifacts.length > 0) {
      const finalEntry = block.entries[block.entries.length - 1];
      if (finalEntry) {
        mapping[finalEntry.id] = pendingArtifacts;
      }
      pendingArtifacts = [];
    }
  });

  return mapping;
}
