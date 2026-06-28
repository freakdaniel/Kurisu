/**
 * Shared types for the session context menu. Lives in its own module so
 * `SessionContextMenu.tsx` only exports the React component and remains
 * Fast-Refresh friendly.
 */
import type { SessionPreview } from '@/types/desktop';

export interface SessionMenuState {
  session: SessionPreview;
  x: number;
  y: number;
}
