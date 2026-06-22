import type { SessionPreview } from '@/types/desktop';
import {
  isProjectlessWorkingDirectory as isProjectlessWorkingDirectoryBase,
  type SessionScopeOptions,
} from '@/lib/paths';

export type { SessionScopeOptions } from '@/lib/paths';
export {
  normalizePathKey,
  pathStartsWith,
  joinDesktopPath,
  getProjectlessTempDirectory,
  isTemporaryChatWorkingDirectory,
  basename,
} from '@/lib/paths';

export type SessionNavigationMode = 'projects' | 'chats';

export interface ProjectGroup {
  name: string;
  sessions: SessionPreview[];
}

export function isProjectlessWorkingDirectory(
  workingDirectory: string,
  options: SessionScopeOptions,
): boolean {
  return isProjectlessWorkingDirectoryBase(workingDirectory, options);
}

export function isProjectlessSession(
  session: SessionPreview,
  options: SessionScopeOptions,
): boolean {
  return isProjectlessWorkingDirectory(session.workingDirectory, options);
}

export function filterSessionsByNavigationMode(
  sessions: SessionPreview[],
  mode: SessionNavigationMode,
  options: SessionScopeOptions,
): SessionPreview[] {
  return sessions.filter((session) =>
    session.messageCount > 0 &&
    (mode === 'chats'
      ? isProjectlessSession(session, options)
      : !isProjectlessSession(session, options)),
  );
}

export function getProjectNameFromWorkingDirectory(
  workingDirectory: string,
  fallbackLabel: string,
): string {
  if (!workingDirectory) {
    return fallbackLabel;
  }

  const parts = workingDirectory.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || fallbackLabel;
}

export function groupProjectSessions(
  sessions: SessionPreview[],
  fallbackLabel: string,
): ProjectGroup[] {
  const groups: Record<string, SessionPreview[]> = {};

  for (const session of sessions) {
    const project = getProjectNameFromWorkingDirectory(session.workingDirectory, fallbackLabel);
    if (!groups[project]) {
      groups[project] = [];
    }

    groups[project].push(session);
  }

  return Object.entries(groups)
    .sort((left, right) => {
      const leftLatest = Math.max(...left[1].map((session) => new Date(session.lastActivity).getTime()));
      const rightLatest = Math.max(...right[1].map((session) => new Date(session.lastActivity).getTime()));
      return rightLatest - leftLatest;
    })
    .map(([name, projectSessions]) => ({
      name,
      sessions: projectSessions.sort(
        (left, right) => new Date(right.lastActivity).getTime() - new Date(left.lastActivity).getTime(),
      ),
    }));
}
