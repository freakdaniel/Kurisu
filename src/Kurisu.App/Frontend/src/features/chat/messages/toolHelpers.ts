import type { DesktopSessionEntry } from '@/types/desktop';
import { basename } from '@/lib/paths';
import { getShellSummary, parseTodoSummary, trunc } from '@/lib/parsers';

export function getEntryTextLocal(entry: DesktopSessionEntry): string {
  return entry.body || entry.arguments || '';
}

export function getToolArgSummaryLocal(entry: DesktopSessionEntry): string {
  if (!entry.arguments) return '';
  const toolKey = (entry.toolName || entry.title || '').toLowerCase();
  try {
    const a = JSON.parse(entry.arguments) as Record<string, unknown>;
    const str = (k: string) => typeof a[k] === 'string' ? (a[k] as string) : '';

    if (toolKey.includes('web_fetch') || toolKey.includes('fetch')) {
      const url = str('url') || str('uri') || str('href');
      return url ? trunc(url, 88) : '';
    }

    if (toolKey.includes('read') || toolKey.includes('write') || toolKey.includes('edit') || toolKey.includes('str_replace')) {
      const p = str('path') || str('file_path') || str('filename');
      return p ? basename(p) : '';
    }
    if (toolKey.includes('glob') || toolKey.includes('find')) {
      const pat = str('pattern');
      if (pat) return trunc(pat);
      const p = str('path');
      return p ? trunc(p.split(/[/\\]/).slice(-2).join('/')) : '';
    }
    if (toolKey.includes('grep') || toolKey.includes('search')) {
      const pat = str('pattern') || str('query') || str('search');
      return pat ? trunc(pat) : '';
    }
    if (toolKey.includes('list') || toolKey.includes('directory')) {
      const p = str('path');
      return p ? trunc(p.split(/[/\\]/).slice(-2).join('/')) : '';
    }
    if (toolKey === 'agent' || toolKey.includes('agent')) {
      const d = str('description') || str('prompt');
      return d ? trunc(d) : '';
    }
    if (toolKey.includes('todo')) {
      const todoSummary = parseTodoSummary(entry.arguments);
      return todoSummary ? `${todoSummary.completedCount}/${todoSummary.totalCount}` : '';
    }
    if (toolKey.includes('task_')) {
      const subject = str('subject');
      if (subject) {
        return trunc(subject);
      }

      const taskId = str('task_id') || str('taskId');
      if (taskId) {
        return `#${taskId}`;
      }

      const status = str('status');
      return status ? trunc(status) : '';
    }
    if (toolKey.includes('bash') || toolKey.includes('execute') || toolKey.includes('shell') || toolKey.includes('run')) {
      return getShellSummary(entry.arguments, trunc);
    }
    const v = str('description') || str('command') || str('pattern') || str('file_path') || str('path') || str('query') || str('prompt');
    return v ? trunc(v) : '';
  } catch {
    return trunc(entry.arguments);
  }
}

export function isThinkingEntryLocal(entry: DesktopSessionEntry): boolean {
  const type = entry.type?.toLowerCase() ?? '';
  const title = entry.title?.toLowerCase() ?? '';
  return type === 'thought' || type === 'thinking' ||
    title === 'thinking' || title === 'thought';
}
