import { useCallback, useState } from 'react';
import { useBootstrap } from '@/hooks/useBootstrap';
import { getProjectlessTempDirectory, joinDesktopPath } from '@/lib/paths';
import {
  createOptimisticSessionDetail,
  createOptimisticSessionPreview,
  createUserEntry,
  upsertOptimisticUserEntry,
} from '@/features/chat';

export interface UseTurnActionsInput {
  prompt: string;
  setPrompt: (value: string) => void;
  selectedSessionId: string | undefined;
  selectedSession: { workingDirectory?: string; gitBranch?: string; title?: string | null } | undefined;
  selectedProjectMode: 'project' | 'no-project';
  selectedProjectWorkingDirectory: string;
  runtimeBaseDirectory: string;
  workspaceRoot: string;
  onSelectSession?: (sessionId: string) => void;
  onClearPicker: () => void;
  onResetPickerQuery: () => void;
  sidebarMode: 'projects' | 'chats';
}

export interface UseTurnActionsResult {
  pendingTurnSessionIds: Record<string, true>;
  handleSubmit: () => Promise<void>;
  handleStopGeneration: () => Promise<void>;
  clearPendingTurn: (sessionId: string) => void;
}

export function useTurnActions(input: UseTurnActionsInput): UseTurnActionsResult {
  const { loadSessionDetail, setBootstrap, setSessionCache } = useBootstrap();
  const [pendingTurnSessionIds, setPendingTurnSessionIds] = useState<Record<string, true>>({});

  const clearPendingTurn = useCallback((sessionId: string) => {
    setPendingTurnSessionIds((current) => {
      if (!(sessionId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[sessionId];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmedPrompt = input.prompt.trim();
    const targetSessionId = input.selectedSessionId || window.crypto?.randomUUID?.() || `session-${Date.now()}`;
    const requestTimestamp = new Date().toISOString();
    const workingDirectory = input.selectedSession?.workingDirectory
      ?? (input.selectedProjectMode === 'no-project'
        ? joinDesktopPath(
          getProjectlessTempDirectory(input.runtimeBaseDirectory, input.workspaceRoot),
          window.crypto?.randomUUID?.() ?? `chat-${Date.now()}`,
        )
        : input.selectedProjectWorkingDirectory);

    if (!trimmedPrompt || !workingDirectory || !window.kurisuDesktop) {
      return;
    }

    const gitBranch = input.selectedSession?.gitBranch ?? '';
    const userEntry = createUserEntry(
      window.crypto?.randomUUID?.() ?? `user-${Date.now()}`,
      workingDirectory,
      gitBranch,
      trimmedPrompt,
      requestTimestamp,
    );
    const optimisticPreview = createOptimisticSessionPreview(
      targetSessionId,
      workingDirectory,
      input.selectedSession?.title ?? null,
      requestTimestamp,
      gitBranch,
    );

    input.setPrompt('');
    input.onClearPicker();
    input.onResetPickerQuery();
    setPendingTurnSessionIds((current) => ({ ...current, [targetSessionId]: true }));
    setBootstrap((current) => ({
      ...current,
      recentSessions: [optimisticPreview, ...current.recentSessions.filter((session) => session.sessionId !== targetSessionId)]
        .sort((left, right) => Date.parse(right.lastActivity) - Date.parse(left.lastActivity)),
    }));
    setSessionCache((current) => {
      const existingDetail = current[targetSessionId];
      const nextDetail = existingDetail
        ? upsertOptimisticUserEntry(existingDetail, userEntry)
        : createOptimisticSessionDetail(optimisticPreview, userEntry);
      return {
        ...current,
        [targetSessionId]: nextDetail,
      };
    });
    input.onSelectSession?.(targetSessionId);

    window.kurisuDesktop.startSessionTurn({
        sessionId: targetSessionId,
        prompt: trimmedPrompt,
        workingDirectory,
        surfaceContext: input.sidebarMode === 'chats' ? 'chats' : 'coder',
        toolName: '',
        toolArgumentsJson: '{}',
        approveToolExecution: false,
      })
      .then(async (result) => {
        if (!result?.session?.sessionId) {
          throw new Error('Desktop session turn did not return a valid session.');
        }

        setBootstrap((current) => ({
          ...current,
          recentSessions: [{
            ...result.session,
            title:
              result.createdNewSession &&
              current.recentSessions.find((session) => session.sessionId === result.session.sessionId)?.title === null
                ? null
                : result.session.title,
          }, ...current.recentSessions.filter((session) => session.sessionId !== result.session.sessionId)]
            .sort((left, right) => Date.parse(right.lastActivity) - Date.parse(left.lastActivity)),
        }));
        await loadSessionDetail(result.session.sessionId, { force: true, limit: 200 });
      })
      .catch((error) => {
        console.error('Failed to submit prompt:', error);
      })
      .finally(() => {
        clearPendingTurn(targetSessionId);
      });
  }, [
    clearPendingTurn,
    input,
    loadSessionDetail,
    setBootstrap,
    setSessionCache,
  ]);

  const handleStopGeneration = useCallback(async () => {
    if (!input.selectedSessionId || !window.kurisuDesktop) {
      return;
    }

    try {
      await window.kurisuDesktop.cancelSessionTurn({ sessionId: input.selectedSessionId });
    } catch (error) {
      console.error('Failed to cancel active turn:', error);
    } finally {
      clearPendingTurn(input.selectedSessionId);
    }
  }, [clearPendingTurn, input.selectedSessionId]);

  return {
    pendingTurnSessionIds,
    handleSubmit,
    handleStopGeneration,
    clearPendingTurn,
  };
}
