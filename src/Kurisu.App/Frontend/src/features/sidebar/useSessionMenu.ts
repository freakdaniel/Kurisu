/**
 * Hook that owns the open/closed state of the session context menu.
 * Lives in its own module so `SessionContextMenu.tsx` only exports React
 * components and remains Fast-Refresh friendly.
 */
import { useState } from 'react';
import type { SessionPreview } from '@/types/desktop';
import type { SessionMenuState } from './SessionContextMenuTypes';

export function useSessionMenu() {
  const [state, setState] = useState<SessionMenuState | null>(null);
  const toggle = (session: SessionPreview, x: number, y: number) => {
    setState((current) =>
      current?.session.sessionId === session.sessionId ? null : { session, x, y },
    );
  };
  return { state, toggle, setState, clear: () => setState(null) };
}
