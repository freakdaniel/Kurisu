import { useCallback } from 'react';
import { Box, HStack, IconButton, Spinner, Text, VStack } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Check, PanelRightClose } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DesktopSessionEntry } from '@/types/desktop';
import { getToolInfo, getToolStatusColor } from '@/features/chat/messages/ToolCallCard';
import {
  getEntryTextLocal,
  getToolArgSummaryLocal,
  isThinkingEntryLocal,
} from '@/features/chat/messages/toolHelpers';

function formatTimestamp(ts: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export interface ThinkingPanelProps {
  openAssistantId: string | null;
  onClose: () => void;
  activeReasoningAssistantEntry: DesktopSessionEntry | null;
  activeReasoningEntries: DesktopSessionEntry[];
  isReasoningInProgress: boolean;
}

export function ThinkingPanel({
  openAssistantId,
  onClose,
  activeReasoningAssistantEntry,
  activeReasoningEntries,
  isReasoningInProgress,
}: ThinkingPanelProps) {
  const { t } = useTranslation();

  const hasActiveReasoningText =
    !!activeReasoningAssistantEntry?.thinkingBody?.trim() &&
    !activeReasoningEntries.some((entry) => isThinkingEntryLocal(entry));

  const renderTimestamp = useCallback((ts: string) => formatTimestamp(ts), []);

  return (
    <AnimatePresence initial={false}>
      {openAssistantId && (
        <motion.div
          key="reasoning-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 360, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden', flexShrink: 0 }}
        >
          <VStack
            h="100%"
            w="360px"
            align="stretch"
            spacing={0}
            bg="#202024"
            borderLeft="1px solid"
            borderColor="rgba(255,255,255,0.06)"
          >
            <HStack
              justify="space-between"
              align="center"
              px={4}
              py={3}
              minH="60px"
              borderBottom="1px solid"
              borderColor="rgba(255,255,255,0.06)"
              flexShrink={0}
            >
              <Text fontSize="sm" fontWeight="semibold" color="white">
                {t('chat.reasoning.timelineTitle')}
              </Text>
              <IconButton
                aria-label={t('chat.reasoning.closePanel')}
                icon={<PanelRightClose size={16} />}
                variant="ghost"
                size="sm"
                borderRadius="12px"
                color="gray.400"
                onClick={onClose}
                _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
              />
            </HStack>

            <Box
              flex={1}
              overflowY="auto"
              px={4}
              py={4}
              sx={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              <VStack align="stretch" spacing={5}>
                {hasActiveReasoningText && activeReasoningAssistantEntry && (
                  <Box position="relative" pl={7}>
                    <Box position="absolute" left="7px" top="26px" bottom="-10px" w="1px" bg="rgba(255,255,255,0.08)" />
                    <Box
                      position="absolute"
                      left="0"
                      top="2px"
                      boxSize="15px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="#8f8f9b"
                    >
                      <Brain size={14} />
                    </Box>
                    <Text fontSize="sm" color="gray.200" fontWeight="semibold" mb={1}>
                      {t('chat.reasoning.reasoning')}
                    </Text>
                    <Text fontSize="sm" color="gray.400" lineHeight="1.8" whiteSpace="pre-wrap" wordBreak="break-word">
                      {activeReasoningAssistantEntry.thinkingBody}
                    </Text>
                  </Box>
                )}

                {activeReasoningEntries.map((entry) => {
                  const isThought = isThinkingEntryLocal(entry);
                  const info = getToolInfo(entry.toolName || entry.title || '');
                  const ToolIcon = isThought ? Brain : info.Icon;
                  const label = isThought
                    ? t('chat.reasoning.reasoning')
                    : t(info.labelKey);
                  const summary = isThought ? getEntryTextLocal(entry) : getToolArgSummaryLocal(entry);
                  return (
                    <Box key={entry.id} position="relative" pl={7}>
                      <Box position="absolute" left="7px" top="27px" bottom="-6px" w="1px" bg="rgba(255,255,255,0.08)" />
                      <Box
                        position="absolute"
                        left="0"
                        top="1px"
                        boxSize="15px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="#8f8f9b"
                      >
                        <ToolIcon size={14} />
                      </Box>
                      <HStack spacing={2} align="center" mb={1}>
                        <Text fontSize="sm" color="gray.200" fontWeight="semibold">
                          {label}
                        </Text>
                        {!isThought && (
                          <Box boxSize="6px" borderRadius="full" bg={getToolStatusColor(entry.status)} />
                        )}
                        {entry.timestamp && (
                          <Text fontSize="10px" color="gray.600">
                            {renderTimestamp(entry.timestamp)}
                          </Text>
                        )}
                      </HStack>
                      {summary && (
                        <Text fontSize="sm" color="gray.400" lineHeight="1.75" whiteSpace="pre-wrap" wordBreak="break-word">
                          {summary}
                        </Text>
                      )}
                    </Box>
                  );
                })}

                <Box position="relative" pl={7}>
                  <Box
                    position="absolute"
                    left="0"
                    top="1px"
                    boxSize="15px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="#9ca3af"
                  >
                    {isReasoningInProgress ? <Spinner size="xs" color="#8f8f9b" /> : <Check size={14} />}
                  </Box>
                  <Text fontSize="sm" color="gray.200" fontWeight="semibold">
                    {isReasoningInProgress
                      ? t('chat.reasoning.workInProgress')
                      : t('chat.reasoning.workCompleted')}
                  </Text>
                </Box>
              </VStack>
            </Box>
          </VStack>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
