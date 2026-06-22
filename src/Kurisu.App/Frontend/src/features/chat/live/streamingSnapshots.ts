import type {
  DesktopMode,
  DesktopSessionDetail,
  DesktopSessionEntry,
  SessionPreview,
} from '@/types/desktop';
import { LIVE_TOOL_SOURCE } from '@/features/chat/live/liveToolEntries';

export function createStreamingAssistantEntry(
  sessionId: string,
  workingDirectory: string,
  gitBranch: string,
  body: string,
  thinkingBody: string,
  timestamp: string,
): DesktopSessionEntry {
  return {
    id: `streaming-${sessionId}`,
    type: 'assistant',
    timestamp,
    workingDirectory,
    gitBranch,
    title: 'Assistant',
    body,
    thinkingBody,
    status: 'streaming',
    toolName: '',
    approvalState: '',
    exitCode: null,
    arguments: '',
    scope: '',
    sourcePath: LIVE_TOOL_SOURCE,
    resolutionStatus: 'live',
    resolvedAt: '',
    changedFiles: [],
    questions: [],
    answers: [],
    isExplicitAskRule: false,
    matchedApprovalRule: '',
  };
}

export function createUserEntry(
  id: string,
  workingDirectory: string,
  gitBranch: string,
  body: string,
  timestamp: string,
): DesktopSessionEntry {
  return {
    id,
    type: 'user',
    timestamp,
    workingDirectory,
    gitBranch,
    title: 'User',
    body,
    thinkingBody: '',
    status: 'completed',
    toolName: '',
    approvalState: '',
    exitCode: null,
    arguments: '',
    scope: '',
    sourcePath: '',
    resolutionStatus: '',
    resolvedAt: '',
    changedFiles: [],
    questions: [],
    answers: [],
    isExplicitAskRule: false,
    matchedApprovalRule: '',
  };
}

export function createOptimisticSessionPreview(
  sessionId: string,
  workingDirectory: string,
  title: string | null,
  lastActivity: string,
  gitBranch: string,
): SessionPreview {
  return {
    sessionId,
    title,
    lastActivity,
    startedAt: lastActivity,
    lastUpdatedAt: lastActivity,
    category: 'coder',
    mode: 'coder' as DesktopMode,
    status: 'active',
    workingDirectory,
    gitBranch,
    messageCount: 1,
    transcriptPath: '',
    metadataPath: '',
  };
}

export function createOptimisticSessionDetail(
  preview: SessionPreview,
  userEntry: DesktopSessionEntry,
): DesktopSessionDetail {
  return {
    session: preview,
    transcriptPath: '',
    entryCount: 1,
    windowOffset: 0,
    windowSize: 1,
    hasOlderEntries: false,
    hasNewerEntries: false,
    summary: {
      userCount: 1,
      assistantCount: 0,
      commandCount: 0,
      toolCount: 0,
      pendingApprovalCount: 0,
      pendingQuestionCount: 0,
      completedToolCount: 0,
      failedToolCount: 0,
      lastTimestamp: userEntry.timestamp,
    },
    entries: [userEntry],
  };
}

export function upsertOptimisticUserEntry(
  detail: DesktopSessionDetail,
  userEntry: DesktopSessionEntry,
): DesktopSessionDetail {
  const lastEntry = detail.entries[detail.entries.length - 1];
  if (
    lastEntry?.type === 'user' &&
    lastEntry.body === userEntry.body &&
    lastEntry.timestamp === userEntry.timestamp
  ) {
    return detail;
  }

  const entries = [...detail.entries, userEntry];
  return {
    ...detail,
    session: {
      ...detail.session,
      lastActivity: userEntry.timestamp,
      lastUpdatedAt: userEntry.timestamp,
      messageCount: Math.max(detail.session.messageCount + 1, entries.length),
      status: 'active',
    },
    entryCount: detail.entryCount + 1,
    windowSize: detail.windowSize + 1,
    summary: {
      ...detail.summary,
      userCount: detail.summary.userCount + 1,
      lastTimestamp: userEntry.timestamp,
    },
    entries,
  };
}
