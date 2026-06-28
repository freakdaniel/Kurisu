/**
 * Helper functions for grouping reasoning artifacts (thought blocks,
 * tool-call groups) alongside their corresponding assistant message.
 *
 * Lives in its own module so the `AssistantMessage.tsx` component file only
 * exports React components and respects the Fast Refresh invariant.
 */
import type { DisplayBlock } from '@/features/chat/types';

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
