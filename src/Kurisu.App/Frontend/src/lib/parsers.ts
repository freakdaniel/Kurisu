import type { DesktopSessionEntry } from '@/types/desktop';

export interface TodoItemSummary {
  id: string;
  content: string;
  status: string;
}

export interface TodoSummary {
  items: TodoItemSummary[];
  completedCount: number;
  totalCount: number;
}

export interface TaskItemSummary {
  id: string;
  subject: string;
  status: string;
  description: string;
  owner: string;
  blockedBy: string[];
}

export interface TaskSummary {
  items: TaskItemSummary[];
  completedCount: number;
  totalCount: number;
}

export function parseObjectArguments(argumentsJson: string): Record<string, unknown> | null {
  if (!argumentsJson) return null;

  try {
    const parsed = JSON.parse(argumentsJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseTodoSummary(argumentsJson: string): TodoSummary | null {
  const parsed = parseObjectArguments(argumentsJson);
  if (!parsed || !Array.isArray(parsed.todos)) {
    return null;
  }

  const items = parsed.todos
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : `${item.content ?? 'todo'}`,
      content: typeof item.content === 'string' ? item.content : '',
      status: typeof item.status === 'string' ? item.status : 'pending',
    }))
    .filter((item) => item.content);

  if (items.length === 0) {
    return null;
  }

  return {
    items,
    completedCount: items.filter((item) => item.status === 'completed').length,
    totalCount: items.length,
  };
}

export function normalizeTaskStatus(status: string): string {
  return status.trim().toLowerCase().replace(/-/g, '_');
}

function finalizeTaskSummary(items: TaskItemSummary[]): TaskSummary | null {
  const normalizedItems = items.filter((item) => item.subject.trim().length > 0);
  if (normalizedItems.length === 0) {
    return null;
  }

  return {
    items: normalizedItems,
    completedCount: normalizedItems.filter((item) => normalizeTaskStatus(item.status) === 'completed').length,
    totalCount: normalizedItems.length,
  };
}

export function parseTaskListBody(body: string): TaskSummary | null {
  if (!body || /no tasks found\./i.test(body)) {
    return null;
  }

  const items = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- #'))
    .map((line) => {
      const match = /^- #(?<id>[^\s]+)\s+\[(?<status>[^\]]+)\]\s+(?<subject>.*?)(?:\s+\((?<owner>[^)]+)\))?(?:\s+blocked by \[(?<blocked>[^\]]+)\])?$/i.exec(line);
      if (!match?.groups) {
        return null;
      }

      return {
        id: match.groups.id,
        subject: match.groups.subject.trim(),
        status: match.groups.status.trim(),
        description: '',
        owner: match.groups.owner?.trim() ?? '',
        blockedBy: (match.groups.blocked ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      } satisfies TaskItemSummary;
    })
    .filter((item): item is TaskItemSummary => item !== null);

  return finalizeTaskSummary(items);
}

export function parseTaskDetailBody(body: string): TaskSummary | null {
  if (!body || /task not found\./i.test(body)) {
    return null;
  }

  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const titleLine = lines.find((line) => /^task #/i.test(line));
  if (!titleLine) {
    return null;
  }

  const titleMatch = /^Task #(?<id>[^:]+):\s*(?<subject>.+)$/i.exec(titleLine);
  if (!titleMatch?.groups) {
    return null;
  }

  const fields = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (value) {
      fields.set(key, value);
    }
  }

  return finalizeTaskSummary([
    {
      id: titleMatch.groups.id.trim(),
      subject: titleMatch.groups.subject.trim(),
      status: fields.get('status') ?? 'pending',
      description: fields.get('description') ?? '',
      owner: fields.get('owner') ?? '',
      blockedBy: (fields.get('blocked by') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    },
  ]);
}

export function parseTaskMutationBody(body: string): TaskSummary | null {
  if (!body || /task not found\./i.test(body)) {
    return null;
  }

  const match = /^(?:Created|Updated|Stopped) task #(?<id>[^:]+):\s*(?<subject>.+?)\s+\[(?<status>[^\]]+)\]\./i.exec(body.trim());
  if (!match?.groups) {
    return null;
  }

  return finalizeTaskSummary([
    {
      id: match.groups.id.trim(),
      subject: match.groups.subject.trim(),
      status: match.groups.status.trim(),
      description: '',
      owner: '',
      blockedBy: [],
    },
  ]);
}

export function parseTaskSummary(entry: DesktopSessionEntry): TaskSummary | null {
  const toolKey = (entry.toolName || entry.title || '').toLowerCase();
  if (!toolKey.includes('task_')) {
    return null;
  }

  if (toolKey.includes('task_list')) {
    return parseTaskListBody(entry.body || '');
  }

  if (toolKey.includes('task_get')) {
    return parseTaskDetailBody(entry.body || '');
  }

  if (
    toolKey.includes('task_create') ||
    toolKey.includes('task_update') ||
    toolKey.includes('task_stop')
  ) {
    const fromBody = parseTaskMutationBody(entry.body || '');
    if (fromBody) {
      return fromBody;
    }
  }

  const parsed = parseObjectArguments(entry.arguments);
  if (!parsed) {
    return null;
  }

  const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
  const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
  const taskId = typeof parsed.task_id === 'string'
    ? parsed.task_id.trim()
    : typeof parsed.taskId === 'string'
      ? parsed.taskId.trim()
      : '';
  const status = typeof parsed.status === 'string' ? parsed.status.trim() : 'pending';
  const owner = typeof parsed.owner === 'string' ? parsed.owner.trim() : '';

  if (!subject && !taskId) {
    return null;
  }

  return finalizeTaskSummary([
    {
      id: taskId || 'task',
      subject: subject || `#${taskId}`,
      status,
      description,
      owner,
      blockedBy: [],
    },
  ]);
}

export function formatShellArgumentLines(argumentsJson: string): string[] {
  const parsed = parseObjectArguments(argumentsJson);
  if (!parsed) {
    return argumentsJson
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const lines: string[] = [];
  const command = typeof parsed.command === 'string' ? parsed.command.trim() : '';
  const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';

  if (description || command) {
    lines.push(description && command ? `${description}: ${command}` : description || command);
  }

  if (typeof parsed.timeout === 'number') {
    lines.push(`timeout: ${parsed.timeout} ms`);
  }

  if (typeof parsed.is_background === 'boolean') {
    lines.push(parsed.is_background ? 'background: true' : 'background: false');
  }

  if (typeof parsed.workdir === 'string' && parsed.workdir.trim()) {
    lines.push(`workdir: ${parsed.workdir.trim()}`);
  }

  if (lines.length > 0) {
    return lines;
  }

  return Object.entries(parsed).map(([key, value]) =>
    `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`,
  );
}

export function getShellSummary(argumentsJson: string, trunc: (s: string, n?: number) => string): string {
  const parsed = parseObjectArguments(argumentsJson);
  const command = typeof parsed?.command === 'string' ? parsed.command.trim() : '';
  if (command) {
    return trunc(command);
  }

  const [firstLine] = formatShellArgumentLines(argumentsJson);
  return firstLine ? trunc(firstLine) : '';
}

export function trunc(s: string, n = 72): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function estimateSessionTokens(detail: { entries: { body?: string | null; thinkingBody?: string | null; arguments?: string | null }[] } | null): number {
  if (!detail) return 0;

  const totalCharacters = detail.entries.reduce(
    (sum, entry) =>
      sum +
      (entry.body?.length ?? 0) +
      (entry.thinkingBody?.length ?? 0) +
      (entry.arguments?.length ?? 0),
    0,
  );

  return Math.ceil(totalCharacters / 4);
}
