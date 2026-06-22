import { useCallback, useState } from 'react';
import { useBootstrap } from '@/hooks/useBootstrap';
import type { PendingApprovalPresentation } from '@/lib/approvalRules';

export type PendingApprovalDecision = 'allow-once' | 'always-allow' | 'deny';

export interface UseApprovalActionsInput {
  selectedSessionId: string | undefined;
  pendingApprovalPresentations: PendingApprovalPresentation[];
  onMarkTurnPending: () => void;
  onClearTurnPending: () => void;
}

export interface UseApprovalActionsResult {
  feedbackById: Record<string, string>;
  activePresentation: PendingApprovalPresentation | null;
  onFeedbackChange: (entryId: string, value: string) => void;
  onAllowOnce: () => void;
  onAlwaysAllow: () => void;
  onSubmitFeedback: () => void;
}

export function useApprovalActions(input: UseApprovalActionsInput): UseApprovalActionsResult {
  const { loadSessionDetail, setBootstrap } = useBootstrap();
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [resolvingIds, setResolvingIds] = useState<Record<string, true>>({});

  const visiblePresentations = input.pendingApprovalPresentations.filter(
    (presentation) => !resolvingIds[presentation.pendingEntry.id],
  );
  const activePresentation = visiblePresentations[0] ?? null;

  const clearApprovalState = useCallback((entryIds: string[]) => {
    setFeedbackById((current) => {
      const next = { ...current };
      for (const entryId of entryIds) {
        delete next[entryId];
      }
      return next;
    });

    setResolvingIds((current) => {
      const next = { ...current };
      for (const entryId of entryIds) {
        delete next[entryId];
      }
      return next;
    });
  }, []);

  const markApprovalsResolving = useCallback((entryIds: string[]) => {
    setResolvingIds((current) => {
      const next = { ...current };
      for (const entryId of entryIds) {
        next[entryId] = true;
      }
      return next;
    });
  }, []);

  const handleDecision = useCallback(async (
    presentation: PendingApprovalPresentation,
    decision: PendingApprovalDecision,
    feedback = '',
  ) => {
    if (!input.selectedSessionId || !window.kurisuDesktop) {
      return;
    }

    const trimmedFeedback = feedback.trim();
    const matchingPresentations = decision === 'always-allow'
      ? input.pendingApprovalPresentations.filter((candidate) =>
        candidate.pendingEntry.id !== presentation.pendingEntry.id &&
        candidate.signature === presentation.signature)
      : [];
    const optimisticEntryIds = [
      presentation.pendingEntry.id,
      ...matchingPresentations.map((candidate) => candidate.pendingEntry.id),
    ];

    markApprovalsResolving(optimisticEntryIds);
    input.onMarkTurnPending();

    try {
      await window.kurisuDesktop.approvePendingTool({
        sessionId: input.selectedSessionId,
        entryId: presentation.pendingEntry.id,
        decision,
        feedback: trimmedFeedback,
      });

      if (decision === 'always-allow') {
        const normalizedRule = presentation.suggestedRule.trim();
        if (normalizedRule) {
          setBootstrap((current) => {
            const existingRules = current.kurisuRuntime.approvalProfile.allowRules;
            if (existingRules.some((rule) => rule.toLowerCase() === normalizedRule.toLowerCase())) {
              return current;
            }

            return {
              ...current,
              kurisuRuntime: {
                ...current.kurisuRuntime,
                approvalProfile: {
                  ...current.kurisuRuntime.approvalProfile,
                  allowRules: [...existingRules, normalizedRule],
                },
              },
            };
          });
        }
      }

      await loadSessionDetail(input.selectedSessionId, { force: true, limit: 200 });
      clearApprovalState(optimisticEntryIds);
    } catch (error) {
      console.error('Failed to resolve pending tool approval:', error);
      clearApprovalState(optimisticEntryIds);
      input.onClearTurnPending();
    }
  }, [
    clearApprovalState,
    input,
    loadSessionDetail,
    markApprovalsResolving,
    setBootstrap,
  ]);

  const onFeedbackChange = useCallback((entryId: string, value: string) => {
    setFeedbackById((current) => ({ ...current, [entryId]: value }));
  }, []);

  const onAllowOnce = useCallback(() => {
    if (!activePresentation) return;
    handleDecision(activePresentation, 'allow-once');
  }, [activePresentation, handleDecision]);

  const onAlwaysAllow = useCallback(() => {
    if (!activePresentation) return;
    handleDecision(activePresentation, 'always-allow');
  }, [activePresentation, handleDecision]);

  const onSubmitFeedback = useCallback(() => {
    if (!activePresentation) return;
    const feedback = feedbackById[activePresentation.pendingEntry.id] ?? '';
    if (!feedback.trim()) return;
    handleDecision(activePresentation, 'deny', feedback);
  }, [activePresentation, feedbackById, handleDecision]);

  return {
    feedbackById,
    activePresentation,
    onFeedbackChange,
    onAllowOnce,
    onAlwaysAllow,
    onSubmitFeedback,
  };
}
