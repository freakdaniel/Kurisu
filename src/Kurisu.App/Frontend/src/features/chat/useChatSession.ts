import { useEffect, useMemo, useState } from 'react';
import type { DesktopSessionDetail } from '@/types/desktop';
import { estimateSessionTokens } from '@/lib/parsers';
import { useBootstrap } from '@/hooks/useBootstrap';

export interface UseChatSessionResult {
  sessionDetail: DesktopSessionDetail | null;
  isLoadingSession: boolean;
  usedTokens: number;
}

export function useChatSession(selectedSessionId: string | undefined): UseChatSessionResult {
  const { sessionCache, loadSessionDetail } = useBootstrap();
  const [sessionDetail, setSessionDetail] = useState<DesktopSessionDetail | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [usedTokens, setUsedTokens] = useState(0);

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const cachedDetail = sessionCache[selectedSessionId];
    if (!cachedDetail) {
      return;
    }

    setSessionDetail(cachedDetail);
    setUsedTokens(estimateSessionTokens(cachedDetail));
    setIsLoadingSession(false);
  }, [selectedSessionId, sessionCache]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      setUsedTokens(0);
      setIsLoadingSession(false);
      return;
    }

    const cachedDetail = sessionCache[selectedSessionId];

    if (cachedDetail) {
      setSessionDetail(cachedDetail);
      setUsedTokens(estimateSessionTokens(cachedDetail));
      setIsLoadingSession(false);
      return;
    }

    let cancelled = false;
    setSessionDetail(null);
    setUsedTokens(0);
    setIsLoadingSession(true);

    const loadSession = async () => {
      try {
        const detail = await loadSessionDetail(selectedSessionId, { limit: 200 });
        if (!cancelled && detail) {
          setSessionDetail(detail);
          setUsedTokens(estimateSessionTokens(detail));
        }
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        if (!cancelled) setIsLoadingSession(false);
      }
    };

    loadSession();
    return () => { cancelled = true; };
    // sessionCache is intentionally included so the effect re-runs when a
    // concurrent loadSessionDetail call populates the cache and we should
    // skip the network fetch.
  }, [loadSessionDetail, selectedSessionId, sessionCache]);

  return useMemo(() => ({ sessionDetail, isLoadingSession, usedTokens }), [sessionDetail, isLoadingSession, usedTokens]);
}
