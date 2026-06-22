import type { TFunction } from 'i18next';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { CheckSquare } from 'lucide-react';
import type { TaskSummary } from '@/lib/parsers';
import { normalizeTaskStatus } from '@/lib/parsers';

export function getTaskStatusLabel(t: TFunction, status: string): string {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'completed' || normalized === 'done') {
    return t('chat.tasks.completed');
  }

  if (normalized === 'in_progress') {
    return t('chat.tasks.inProgress');
  }

  if (normalized === 'cancelled') {
    return t('chat.tasks.stopped');
  }

  return t('chat.tasks.pending');
}

export function getTaskProgressLabel(t: TFunction, completedCount: number, totalCount: number): string {
  return t('chat.tasks.progress', { completed: completedCount, total: totalCount });
}

export function renderTaskSummaryContent(taskSummary: TaskSummary, t: TFunction) {
  return (
    <VStack spacing={1.5} align="stretch">
      <Text fontSize="xs" color="gray.400">
        {getTaskProgressLabel(t, taskSummary.completedCount, taskSummary.totalCount)}
      </Text>
      {taskSummary.items.map((item) => {
        const normalizedStatus = normalizeTaskStatus(item.status);
        const isCompleted = normalizedStatus === 'completed' || normalizedStatus === 'done';
        const isCancelled = normalizedStatus === 'cancelled';
        const supportingBits = [
          getTaskStatusLabel(t, item.status),
          item.owner ? t('chat.tasks.owner', { owner: item.owner }) : '',
          item.blockedBy.length > 0
            ? t('chat.tasks.blockedBy', { blockedBy: item.blockedBy.join(', ') })
            : '',
        ].filter(Boolean);

        return (
          <HStack key={item.id} spacing={2} align="start">
            <Box mt="2px" color={isCompleted ? 'green.400' : isCancelled ? 'gray.600' : 'gray.500'}>
              <CheckSquare size={12} />
            </Box>
            <Box flex={1} minW={0}>
              <Text
                fontSize="xs"
                color={isCompleted ? 'gray.200' : 'gray.300'}
                textDecoration={isCompleted || isCancelled ? 'line-through' : 'none'}
                whiteSpace="pre-wrap"
                wordBreak="break-word"
              >
                {item.subject}
              </Text>
              {item.description && (
                <Text fontSize="10px" color="gray.500" whiteSpace="pre-wrap" wordBreak="break-word">
                  {item.description}
                </Text>
              )}
              {supportingBits.length > 0 && (
                <Text fontSize="10px" color="gray.500" whiteSpace="pre-wrap" wordBreak="break-word">
                  {supportingBits.join(' • ')}
                </Text>
              )}
            </Box>
          </HStack>
        );
      })}
    </VStack>
  );
}
