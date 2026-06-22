import type { DesktopSessionEntry } from '@/types/desktop';

export type DisplayBlock =
  | { type: 'user'; entries: DesktopSessionEntry[] }
  | { type: 'assistant'; entries: DesktopSessionEntry[] }
  | { type: 'tool-group'; entries: DesktopSessionEntry[] }
  | { type: 'thought'; entries: DesktopSessionEntry[] };

export interface ProjectOption {
  name: string;
  path: string;
  lastActivity: string;
}
