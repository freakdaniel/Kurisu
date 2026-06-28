import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { changeLanguage } from '@/i18n';
import { fallbackBootstrap } from './fallback';
import { bootstrapReducer, preloadRecentSessions, type BootstrapState } from './reducer';
import type {
  AppBootstrapPayload,
  ProviderListSnapshot,
  DesktopSessionDetail,
  McpSnapshot,
  DesktopSessionEvent,
} from '@/types/desktop';

export type { BootstrapState } from './reducer';

export interface BootstrapStateApi extends BootstrapState {
  setBootstrap: React.Dispatch<React.SetStateAction<AppBootstrapPayload>>;
  setSessionCache: React.Dispatch<React.SetStateAction<Record<string, DesktopSessionDetail>>>;
  setProviders: React.Dispatch<React.SetStateAction<ProviderListSnapshot>>;
  setMcpSnapshot: React.Dispatch<React.SetStateAction<McpSnapshot>>;
  setLatestSessionEvent: React.Dispatch<React.SetStateAction<DesktopSessionEvent | null>>;
  updateProviders: (snapshot: ProviderListSnapshot) => void;
  loadSessionDetail: (
    sessionId: string,
    options?: { force?: boolean; limit?: number },
  ) => Promise<DesktopSessionDetail | null>;
}

const BootstrapContext = createContext<BootstrapStateApi | null>(null);

function initialState(): BootstrapState {
  return {
    bootstrap: fallbackBootstrap,
    providers: fallbackBootstrap.kurisuProviders,
    mcpSnapshot: fallbackBootstrap.kurisuMcp,
    activeTurnSessions: {},
    liveSessionEvents: {},
    streamingSnapshots: {},
    reattachedSessionId: '',
    isReady: false,
    sessionCache: {},
    latestSessionEvent: null,
  };
}

function loadSessionDetailImpl(
  sessionId: string,
  options: { force?: boolean; limit?: number } | undefined,
  cache: Record<string, DesktopSessionDetail>,
  setCache: React.Dispatch<React.SetStateAction<Record<string, DesktopSessionDetail>>>,
  inflight: React.MutableRefObject<Record<string, Promise<DesktopSessionDetail | null>>>,
): Promise<DesktopSessionDetail | null> {
  if (!window.kurisuDesktop || !sessionId) {
    return Promise.resolve(null);
  }

  const force = options?.force ?? false;
  const limit = options?.limit ?? 200;

  if (!force && cache[sessionId]) {
    return Promise.resolve(cache[sessionId]);
  }

  if (!force && inflight.current[sessionId] !== undefined) {
    return inflight.current[sessionId];
  }

  const request = window.kurisuDesktop
    .getSession({ sessionId, offset: null, limit })
    .then((detail) => {
      if (detail) {
        setCache((current) => ({ ...current, [sessionId]: detail }));
      }
      return detail ?? null;
    })
    .finally(() => {
      delete inflight.current[sessionId];
    });

  inflight.current[sessionId] = request;
  return request;
}

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bootstrapReducer, undefined, initialState);
  const sessionCacheRef = useRef(state.sessionCache);
  const inflightSessionLoadsRef = useRef<Record<string, Promise<DesktopSessionDetail | null>>>({});
  const selectedSessionIdRef = useRef('');
  const didHydrateRef = useRef(false);

  useEffect(() => {
    sessionCacheRef.current = state.sessionCache;
  }, [state.sessionCache]);

  const setBootstrap = useCallback<React.Dispatch<React.SetStateAction<AppBootstrapPayload>>>(
    (updater) => {
      const current = state.bootstrap;
      const next = typeof updater === 'function' ? updater(current) : updater;
      dispatch({ type: 'hydrate', payload: next });
    },
    [state.bootstrap],
  );

  const setSessionCache = useCallback<
    React.Dispatch<React.SetStateAction<Record<string, DesktopSessionDetail>>>
  >((updater) => {
    const current = sessionCacheRef.current;
    const next = typeof updater === 'function' ? updater(current) : updater;
    for (const [sessionId, detail] of Object.entries(next)) {
      dispatch({ type: 'cacheSession', sessionId, detail });
    }
  }, []);

  const setProviders = useCallback<React.Dispatch<React.SetStateAction<ProviderListSnapshot>>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(state.providers) : updater;
      dispatch({ type: 'updateProviders', snapshot: next });
    },
    [state.providers],
  );

  const setMcpSnapshot = useCallback<React.Dispatch<React.SetStateAction<McpSnapshot>>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(state.mcpSnapshot) : updater;
      dispatch({ type: 'updateMcp', snapshot: next });
    },
    [state.mcpSnapshot],
  );

  const setLatestSessionEvent = useCallback<
    React.Dispatch<React.SetStateAction<DesktopSessionEvent | null>>
  >((updater) => {
    const next = typeof updater === 'function' ? updater(state.latestSessionEvent) : updater;
    if (next) {
      dispatch({ type: 'sessionEvent', event: next });
    }
  }, [state.latestSessionEvent]);

  const updateProviders = useCallback((snapshot: ProviderListSnapshot) => {
    dispatch({ type: 'updateProviders', snapshot });
  }, []);

  const loadSessionDetail = useCallback(
    async (
      sessionId: string,
      options?: { force?: boolean; limit?: number },
    ): Promise<DesktopSessionDetail | null> => {
      return loadSessionDetailImpl(
        sessionId,
        options,
        sessionCacheRef.current,
        setSessionCache,
        inflightSessionLoadsRef,
      );
    },
    [setSessionCache],
  );

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    const disposers: Array<() => void> = [];

    const hydrate = async () => {
      if (!window.kurisuDesktop) {
        dispatch({ type: 'setReady', ready: true });
        return;
      }

      const payload = await window.kurisuDesktop.bootstrap();
      const normalized: AppBootstrapPayload = {
        ...payload,
        kurisuProviders: payload.kurisuProviders,
        kurisuModels:
          'kurisuModels' in payload && payload.kurisuModels
            ? payload.kurisuModels
            : fallbackBootstrap.kurisuModels,
      };

      dispatch({ type: 'hydrate', payload: normalized });
      dispatch({ type: 'syncActiveTurns', turns: normalized.activeTurns });
      await changeLanguage(normalized.currentLocale);
      preloadRecentSessions(normalized.recentSessions, loadSessionDetail);

      disposers.push(
        window.kurisuDesktop.subscribeStateChanged((event) => {
          dispatch({ type: 'updateLocale', locale: event.currentLocale });
          void changeLanguage(event.currentLocale);
        }),
      );

      disposers.push(
        window.kurisuDesktop.subscribeAuthChanged((snapshot) => {
          dispatch({ type: 'updateProviders', snapshot });
        }),
      );

      disposers.push(
        window.kurisuDesktop.subscribeSessionEvents((event) => {
          if (event.kind === 'sessionTitleUpdated' && event.title) {
            dispatch({ type: 'sessionTitleUpdated', sessionId: event.sessionId, title: event.title });
            return;
          }

          dispatch({ type: 'sessionEvent', event });

          if (
            event.kind === 'assistantCompleted' ||
            event.kind === 'turnCompleted' ||
            event.kind === 'turnCancelled' ||
            event.kind === 'turnReattached' ||
            event.kind === 'toolCompleted' ||
            event.kind === 'toolFailed' ||
            event.kind === 'toolBlocked' ||
            event.kind === 'toolApprovalRequired' ||
            event.kind === 'userInputRequired'
          ) {
            void loadSessionDetail(event.sessionId, { force: true, limit: 200 });
          }
        }),
      );
    };

    void hydrate();
    return () => disposers.forEach((d) => d());
  }, [loadSessionDetail]);

  useEffect(() => {
    if (!window.kurisuDesktop) return;
    let disposed = false;

    const resync = async () => {
      const turns = await window.kurisuDesktop?.getActiveTurns();
      if (!disposed && turns) {
        dispatch({
          type: 'syncActiveTurns',
          turns,
          preferredSessionId: selectedSessionIdRef.current,
        });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void resync();
    };

    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      disposed = true;
      window.removeEventListener('focus', resync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = state.bootstrap?.currentLocale === 'ar' ? 'rtl' : 'ltr';
  }, [state.bootstrap?.currentLocale]);

  const api: BootstrapStateApi = useMemo(
    () => ({
      ...state,
      setBootstrap,
      setSessionCache,
      setProviders,
      setMcpSnapshot,
      setLatestSessionEvent,
      updateProviders,
      loadSessionDetail,
    }),
    // Spread state deliberately so any reducer update invalidates the cache.
    // The setter callbacks are stable React identities.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  return createElement(BootstrapContext.Provider, { value: api }, children);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBootstrap(): BootstrapStateApi {
  const context = useContext(BootstrapContext);
  if (!context) {
    throw new Error('useBootstrap must be used within BootstrapProvider');
  }
  return context;
}
