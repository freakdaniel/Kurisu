import type { DesktopQuestionAnswer, DesktopQuestionPrompt, DesktopSessionEntry, DesktopSessionEvent } from '@/types/desktop';

export const LIVE_TOOL_SOURCE = '__live_tool__';

export interface LiveToolCallSnapshot {
  id: string;
  groupId: string;
  toolName: string;
  argumentsJson: string;
  status: string;
  body: string;
  approvalState: string;
  timestamp: string;
  updatedAt: string;
  workingDirectory: string;
  gitBranch: string;
  changedFiles: string[];
  questions: DesktopQuestionPrompt[];
  answers: DesktopQuestionAnswer[];
}

export interface LiveReasoningSegment {
  type: 'thought' | 'tool';
  id: string;
  entry: DesktopSessionEntry;
}

export function normalizeToolLifecycleStatus(kind: string, status: string): string {
  const normalizedStatus = (status || '').trim().toLowerCase();
  if (normalizedStatus) {
    return normalizedStatus;
  }

  switch (kind) {
    case 'toolCompleted':
      return 'completed';
    case 'toolFailed':
      return 'error';
    case 'toolBlocked':
      return 'blocked';
    case 'toolApprovalRequired':
      return 'approval-required';
    case 'userInputRequired':
      return 'input-required';
    default:
      return 'requested';
  }
}

export function isToolLifecycleEvent(event: DesktopSessionEvent): boolean {
  if (!event.toolName?.trim()) {
    return false;
  }

  return (
    event.kind === 'toolApprovalRequired' ||
    event.kind === 'userInputRequired' ||
    event.kind === 'toolCompleted' ||
    event.kind === 'toolBlocked' ||
    event.kind === 'toolFailed' ||
    (event.kind === 'assistantGenerating' && normalizeToolLifecycleStatus(event.kind, event.status) === 'requested')
  );
}

export function isToolPendingStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'requested' ||
    normalized === 'running' ||
    normalized === 'streaming' ||
    normalized === 'approval-required' ||
    normalized === 'input-required'
  );
}

export function createLiveThoughtEntry(
  id: string,
  body: string,
  timestamp: string,
  workingDirectory: string,
  gitBranch: string,
): DesktopSessionEntry {
  return {
    id,
    type: 'thought',
    timestamp,
    workingDirectory,
    gitBranch,
    title: 'thinking',
    body,
    thinkingBody: '',
    status: 'thinking',
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

export function buildLiveToolEntries(
  events: DesktopSessionEvent[],
  workingDirectory: string,
  gitBranch: string,
): DesktopSessionEntry[] {
  const calls: LiveToolCallSnapshot[] = [];

  for (const event of events) {
    if (!isToolLifecycleEvent(event)) {
      continue;
    }

    const normalizedStatus = normalizeToolLifecycleStatus(event.kind, event.status);
    let call =
      (event.toolCallId
        ? calls.find((item) => item.id === event.toolCallId)
        : undefined) ??
      [...calls].reverse().find((item) =>
        item.toolName === event.toolName && isToolPendingStatus(item.status),
      );

    if (!call) {
      const nextCall: LiveToolCallSnapshot = {
        id: event.toolCallId || `live-tool-${calls.length}-${event.toolName}-${event.timestampUtc}`,
        groupId: event.toolCallGroupId || `live-tool-group-${calls.length}`,
        toolName: event.toolName,
        argumentsJson: event.toolArgumentsJson || '{}',
        status: normalizedStatus,
        body: event.toolOutput || event.message || '',
        approvalState: event.approvalState || '',
        timestamp: event.timestampUtc,
        updatedAt: event.timestampUtc,
        workingDirectory: event.workingDirectory || workingDirectory,
        gitBranch: event.gitBranch || gitBranch,
        changedFiles: event.changedFiles ?? [],
        questions: event.questions ?? [],
        answers: event.answers ?? [],
      };
      call = nextCall;
      calls.push(nextCall);
    }

    if (!call) {
      continue;
    }

    call.toolName = event.toolName || call.toolName;
    call.groupId = event.toolCallGroupId || call.groupId;
    call.argumentsJson = event.toolArgumentsJson || call.argumentsJson || '{}';
    call.status = normalizedStatus;
    call.body = event.toolOutput || event.message || call.body || '';
    call.approvalState = event.approvalState || call.approvalState || '';
    call.updatedAt = event.timestampUtc;
    call.workingDirectory = event.workingDirectory || call.workingDirectory || workingDirectory;
    call.gitBranch = event.gitBranch || call.gitBranch || gitBranch;
    call.changedFiles = event.changedFiles ?? call.changedFiles ?? [];
    call.questions = event.questions ?? call.questions ?? [];
    call.answers = event.answers ?? call.answers ?? [];
  }

  return calls.map((call) => ({
    id: call.id,
    type: 'tool',
    timestamp: call.updatedAt,
    workingDirectory: call.workingDirectory || workingDirectory,
    gitBranch: call.gitBranch || gitBranch,
    title: call.toolName,
    body: call.body || '',
    thinkingBody: '',
    status: call.status,
    toolName: call.toolName,
    approvalState: call.approvalState || '',
    exitCode: null,
    arguments: call.argumentsJson || '{}',
    scope: call.groupId,
    sourcePath: LIVE_TOOL_SOURCE,
    resolutionStatus: 'live',
    resolvedAt: '',
    changedFiles: call.changedFiles ?? [],
    questions: call.questions ?? [],
    answers: call.answers ?? [],
    isExplicitAskRule: false,
    matchedApprovalRule: '',
  }));
}
