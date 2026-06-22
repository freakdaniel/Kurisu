import type {
  ActiveTurnState,
  AppBootstrapPayload,
  AuthStatusSnapshot,
  DesktopSessionDetail,
  DesktopSessionEvent,
  McpSnapshot,
  SessionPreview,
} from '@/types/desktop';

export interface BootstrapState {
  bootstrap: AppBootstrapPayload;
  authSnapshot: AuthStatusSnapshot;
  mcpSnapshot: McpSnapshot;
  activeTurnSessions: Record<string, true>;
  liveSessionEvents: Record<string, DesktopSessionEvent[]>;
  streamingSnapshots: Record<string, string>;
  reattachedSessionId: string;
  isReady: boolean;
  sessionCache: Record<string, DesktopSessionDetail>;
  latestSessionEvent: DesktopSessionEvent | null;
}

export const MAX_LIVE_SESSION_EVENTS = 240;

export function buildTurnReattachedEvent(activeTurn: ActiveTurnState): DesktopSessionEvent {
  return {
    sessionId: activeTurn.sessionId,
    kind: 'turnReattached',
    timestampUtc: activeTurn.lastUpdatedAtUtc,
    message: activeTurn.contentSnapshot || activeTurn.thinkingSnapshot || `Reattached at ${activeTurn.stage}.`,
    agentName: '',
    workingDirectory: activeTurn.workingDirectory,
    gitBranch: activeTurn.gitBranch,
    commandName: '',
    toolName: activeTurn.toolName,
    toolCallId: '',
    toolCallGroupId: '',
    toolArgumentsJson: '{}',
    status: activeTurn.status,
    contentDelta: '',
    contentSnapshot: activeTurn.contentSnapshot,
    thinkingDelta: '',
    thinkingSnapshot: activeTurn.thinkingSnapshot,
    toolOutput: '',
    approvalState: '',
    changedFiles: [],
    questions: [],
    answers: [],
    title: '',
  };
}

function isContentOnlyStreamingEvent(event: DesktopSessionEvent): boolean {
  return (
    event.kind === 'assistantStreaming' &&
    (!!event.contentDelta || !!event.contentSnapshot) &&
    !event.thinkingDelta &&
    !event.thinkingSnapshot &&
    !event.toolName
  );
}

function isThinkingOnlyStreamingEvent(event: DesktopSessionEvent): boolean {
  return (
    event.kind === 'assistantStreaming' &&
    (!!event.thinkingDelta || !!event.thinkingSnapshot) &&
    !event.contentDelta &&
    !event.contentSnapshot &&
    !event.toolName
  );
}

export function appendLiveSessionEvent(
  history: DesktopSessionEvent[],
  event: DesktopSessionEvent,
): DesktopSessionEvent[] {
  if (event.kind === 'turnStarted' || event.kind === 'turnReattached') {
    return [event];
  }

  const nextHistory = [...history];
  const lastEvent = nextHistory[nextHistory.length - 1];
  const shouldReplaceLast =
    !!lastEvent &&
    ((isContentOnlyStreamingEvent(lastEvent) && isContentOnlyStreamingEvent(event)) ||
      (isThinkingOnlyStreamingEvent(lastEvent) && isThinkingOnlyStreamingEvent(event)));

  if (shouldReplaceLast) {
    nextHistory[nextHistory.length - 1] = event;
  } else {
    nextHistory.push(event);
  }

  return nextHistory.slice(-MAX_LIVE_SESSION_EVENTS);
}

export type BootstrapAction =
  | { type: 'hydrate'; payload: AppBootstrapPayload }
  | { type: 'setReady'; ready: boolean }
  | { type: 'syncActiveTurns'; turns: ActiveTurnState[]; preferredSessionId?: string }
  | { type: 'updateAuth'; snapshot: AuthStatusSnapshot }
  | { type: 'updateMcp'; snapshot: McpSnapshot }
  | { type: 'updateLocale'; locale: string }
  | { type: 'sessionTitleUpdated'; sessionId: string; title: string }
  | { type: 'cacheSession'; sessionId: string; detail: DesktopSessionDetail }
  | { type: 'sessionEvent'; event: DesktopSessionEvent };

export function bootstrapReducer(
  state: BootstrapState,
  action: BootstrapAction,
): BootstrapState {
  switch (action.type) {
    case 'hydrate': {
      const payload = action.payload;
      return {
        ...state,
        bootstrap: payload,
        authSnapshot: payload.kurisuAuth,
        mcpSnapshot: payload.kurisuMcp,
        isReady: true,
      };
    }
    case 'setReady': {
      return { ...state, isReady: action.ready };
    }
    case 'syncActiveTurns': {
      const { turns, preferredSessionId = '' } = action;
      const activeTurnSessions: Record<string, true> = Object.fromEntries(
        turns.map((t) => [t.sessionId, true] as const),
      );
      const liveSessionEvents: Record<string, DesktopSessionEvent[]> = { ...state.liveSessionEvents };
      turns.forEach((turn) => {
        const existing = liveSessionEvents[turn.sessionId] ?? [];
        if (existing.length === 0) {
          liveSessionEvents[turn.sessionId] = [buildTurnReattachedEvent(turn)];
        }
      });
      const streamingSnapshots: Record<string, string> = Object.fromEntries(
        turns.filter((t) => t.contentSnapshot).map((t) => [t.sessionId, t.contentSnapshot] as const),
      );
      let reattachedSessionId = state.reattachedSessionId;
      let latestSessionEvent = state.latestSessionEvent;
      if (turns.length === 0) {
        reattachedSessionId = '';
      } else {
        const sorted = [...turns].sort(
          (a, b) => Date.parse(b.lastUpdatedAtUtc) - Date.parse(a.lastUpdatedAtUtc),
        );
        const targetId = preferredSessionId || sorted[0]?.sessionId || '';
        if (targetId) {
          const activeTurn = sorted.find((t) => t.sessionId === targetId);
          if (activeTurn) {
            reattachedSessionId = activeTurn.sessionId;
            latestSessionEvent = buildTurnReattachedEvent(activeTurn);
          }
        }
      }
      return {
        ...state,
        activeTurnSessions,
        liveSessionEvents,
        streamingSnapshots,
        reattachedSessionId,
        latestSessionEvent,
      };
    }
    case 'updateAuth': {
      return {
        ...state,
        authSnapshot: action.snapshot,
        bootstrap: { ...state.bootstrap, kurisuAuth: action.snapshot },
      };
    }
    case 'updateMcp': {
      return { ...state, mcpSnapshot: action.snapshot };
    }
    case 'updateLocale': {
      return { ...state, bootstrap: { ...state.bootstrap, currentLocale: action.locale } };
    }
    case 'sessionTitleUpdated': {
      const recentSessions = state.bootstrap.recentSessions.map((s) =>
        s.sessionId === action.sessionId ? { ...s, title: action.title } : s,
      );
      const detail = state.sessionCache[action.sessionId];
      const sessionCache = detail
        ? {
            ...state.sessionCache,
            [action.sessionId]: {
              ...detail,
              session: { ...detail.session, title: action.title },
            },
          }
        : state.sessionCache;
      return {
        ...state,
        bootstrap: { ...state.bootstrap, recentSessions },
        sessionCache,
      };
    }
    case 'cacheSession': {
      return {
        ...state,
        sessionCache: { ...state.sessionCache, [action.sessionId]: action.detail },
      };
    }
    case 'sessionEvent': {
      const { event } = action;
      const history = state.liveSessionEvents[event.sessionId] ?? [];
      const liveSessionEvents = {
        ...state.liveSessionEvents,
        [event.sessionId]: appendLiveSessionEvent(history, event),
      };
      const activeTurnSessions = applyActiveTurnTransition(state.activeTurnSessions, event);
      const streamingSnapshots = applyStreamingSnapshotTransition(state.streamingSnapshots, event);
      const reattachedSessionId = applyReattachedTransition(state.reattachedSessionId, event);
      return {
        ...state,
        liveSessionEvents,
        activeTurnSessions,
        streamingSnapshots,
        reattachedSessionId,
        latestSessionEvent: event,
      };
    }
    default:
      return state;
  }
}

function applyActiveTurnTransition(
  current: Record<string, true>,
  event: DesktopSessionEvent,
): Record<string, true> {
  if (event.kind === 'turnStarted') {
    return { ...current, [event.sessionId]: true };
  }
  if (
    event.kind === 'toolApproved' ||
    event.kind === 'toolCompleted' ||
    event.kind === 'toolFailed' ||
    event.kind === 'toolBlocked' ||
    event.kind === 'assistantPreparingContext' ||
    event.kind === 'assistantGenerating' ||
    event.kind === 'assistantCompleted' ||
    event.kind === 'userInputReceived'
  ) {
    if (event.sessionId in current) {
      return current;
    }
    return { ...current, [event.sessionId]: true };
  }
  if (event.kind === 'turnCompleted' || event.kind === 'turnCancelled') {
    if (!(event.sessionId in current)) return current;
    const next = { ...current };
    delete next[event.sessionId];
    return next;
  }
  return current;
}

function applyStreamingSnapshotTransition(
  current: Record<string, string>,
  event: DesktopSessionEvent,
): Record<string, string> {
  if (event.kind === 'turnReattached' && event.contentSnapshot) {
    return { ...current, [event.sessionId]: event.contentSnapshot };
  }
  if (event.kind === 'assistantStreaming') {
    if (event.contentSnapshot) {
      return { ...current, [event.sessionId]: event.contentSnapshot };
    }
    if (event.contentDelta) {
      return {
        ...current,
        [event.sessionId]: `${current[event.sessionId] ?? ''}${event.contentDelta}`,
      };
    }
  }
  if (event.kind === 'turnCompleted' || event.kind === 'turnCancelled') {
    if (!(event.sessionId in current)) return current;
    const next = { ...current };
    delete next[event.sessionId];
    return next;
  }
  return current;
}

function applyReattachedTransition(
  current: string,
  event: DesktopSessionEvent,
): string {
  if (event.kind === 'turnStarted') return '';
  if (event.kind === 'turnCompleted' || event.kind === 'turnCancelled') {
    return current === event.sessionId ? '' : current;
  }
  return current;
}

export function preloadRecentSessions(
  sessions: SessionPreview[],
  loadSessionDetail: (
    sessionId: string,
    options?: { force?: boolean; limit?: number },
  ) => Promise<DesktopSessionDetail | null>,
): void {
  if (sessions.length === 0) return;
  void Promise.allSettled(
    sessions.map((session) => loadSessionDetail(session.sessionId, { limit: 120 })),
  );
}
