import { normalizePathKey, joinDesktopPath } from './paths';
import { parseObjectArguments, formatShellArgumentLines, trunc } from './parsers';
import type { DesktopSessionEntry } from '@/types/desktop';

export interface PendingApprovalPresentation {
  pendingEntry: DesktopSessionEntry;
  suggestedRule: string;
  signature: string;
}

export function splitFirstCommandSegment(command: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < command.length; index++) {
    const character = command[index];

    if (character === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) {
      continue;
    }

    for (const token of ['&&', '||', ';;', '|&', '|', ';']) {
      if (command.slice(index, index + token.length) === token) {
        return command.slice(0, index).trim();
      }
    }
  }

  return command.trim();
}

export function extractExecutableFromCommandSegment(segment: string): string {
  const trimmed = segment.trim();
  if (!trimmed) {
    return '';
  }

  let token = trimmed;
  if (trimmed[0] === '"' || trimmed[0] === '\'') {
    const quote = trimmed[0];
    const endQuote = trimmed.indexOf(quote, 1);
    token = endQuote > 0 ? trimmed.slice(1, endQuote) : trimmed.slice(1);
  } else {
    const whitespaceIndex = trimmed.search(/\s/);
    token = whitespaceIndex < 0 ? trimmed : trimmed.slice(0, whitespaceIndex);
  }

  if (!token) {
    return '';
  }

  if (token.includes('/') || token.includes('\\')) {
    const lastSlash = Math.max(token.lastIndexOf('/'), token.lastIndexOf('\\'));
    token = token.slice(lastSlash + 1);
    token = token.replace(/\.(cmd|exe|bat|ps1)$/i, '');
  }

  return token.trim();
}

export function stripMatchingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === '\'' && last === '\'')) {
      return trimmed.slice(1, -1);
    }
  }

  return trimmed;
}

export function tokenizeShellSegment(segment: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (const character of segment) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === '\\' && !inSingleQuote) {
      escaped = true;
      continue;
    }

    if (character === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (character === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && /\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = '';
      }

      continue;
    }

    current += character;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

export function extractFirstHttpUrl(tokens: string[]): string {
  for (const token of tokens) {
    const candidate = stripMatchingQuotes(token);
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  return '';
}

export function extractPrimaryShellPath(tokens: string[]): string {
  for (const token of tokens.slice(1)) {
    const candidate = stripMatchingQuotes(token);
    if (!candidate || candidate === '--') {
      continue;
    }

    if (candidate.startsWith('-')) {
      continue;
    }

    if (/^https?:\/\//i.test(candidate)) {
      continue;
    }

    return candidate;
  }

  return '';
}

export function suggestVirtualShellRule(command: string, projectRoot: string): string {
  const firstSegment = splitFirstCommandSegment(command);
  const executable = extractExecutableFromCommandSegment(firstSegment).toLowerCase();
  if (!executable) {
    return '';
  }

  const tokens = tokenizeShellSegment(firstSegment);
  if (tokens.length === 0) {
    return '';
  }

  if (['curl', 'wget', 'fetch'].includes(executable)) {
    const url = extractFirstHttpUrl(tokens);
    if (!url) {
      return '';
    }

    try {
      const host = new URL(url).hostname.trim();
      return host ? `WebFetch(domain:${host})` : '';
    } catch {
      return '';
    }
  }

  if (['cat', 'tac', 'nl', 'head', 'tail', 'less', 'more', 'type'].includes(executable)) {
    const filePath = extractPrimaryShellPath(tokens);
    return filePath ? `Read(${resolveApprovalRulePath(filePath, projectRoot)})` : '';
  }

  if (['ls', 'dir', 'tree', 'find'].includes(executable)) {
    const directoryPath = extractPrimaryShellPath(tokens) || '.';
    return `Read(${resolveApprovalRulePath(directoryPath, projectRoot).replace(/\/?$/, '/**')})`;
  }

  return '';
}

export function resolveApprovalRulePath(candidatePath: string, projectRoot: string): string {
  if (!candidatePath) {
    return '';
  }

  const normalizedProjectRoot = normalizePathKey(projectRoot);
  const normalizedCandidate = normalizePathKey(candidatePath);
  const resolvedPath = normalizedCandidate.startsWith(normalizedProjectRoot)
    ? normalizedCandidate
    : normalizePathKey(joinDesktopPath(projectRoot || '', candidatePath));

  if (normalizedProjectRoot && (resolvedPath === normalizedProjectRoot || resolvedPath.startsWith(`${normalizedProjectRoot}/`))) {
    const relative = resolvedPath.slice(normalizedProjectRoot.length).replace(/^\/+/, '');
    return relative ? `/${relative}` : '/';
  }

  return `//${resolvedPath}`;
}

export function suggestProjectAllowRule(entry: DesktopSessionEntry, projectRoot: string): string {
  const parsed = parseObjectArguments(entry.arguments) ?? {};
  const toolName = (entry.toolName || '').trim().toLowerCase();

  if (toolName.includes('shell') || toolName.includes('bash') || toolName.includes('run_command') || toolName.includes('terminal') || toolName.includes('execute')) {
    const command = typeof parsed.command === 'string' ? parsed.command.trim() : '';
    if (!command) {
      return 'Bash';
    }

    const virtualRule = suggestVirtualShellRule(command, projectRoot);
    if (virtualRule) {
      return virtualRule;
    }

    const firstSegment = splitFirstCommandSegment(command);
    const executable = extractExecutableFromCommandSegment(firstSegment);
    if (!executable) {
      return `Bash(${firstSegment || command})`;
    }

    return firstSegment === executable ? `Bash(${executable})` : `Bash(${executable} *)`;
  }

  const rawPath =
    (typeof parsed.file_path === 'string' && parsed.file_path.trim()) ||
    (typeof parsed.path === 'string' && parsed.path.trim()) ||
    (typeof parsed.directory === 'string' && parsed.directory.trim()) ||
    '';

  if (toolName.includes('edit')) {
    return rawPath ? `Edit(${resolveApprovalRulePath(rawPath, projectRoot)})` : 'Edit';
  }

  if (toolName.includes('write') || toolName.includes('create_file')) {
    return rawPath ? `Write(${resolveApprovalRulePath(rawPath, projectRoot)})` : 'Write';
  }

  if (
    toolName.includes('read') ||
    toolName.includes('grep') ||
    toolName.includes('search_files') ||
    toolName.includes('glob') ||
    toolName.includes('find_files')
  ) {
    return rawPath ? `Read(${resolveApprovalRulePath(rawPath, projectRoot)})` : 'Read';
  }

  if (toolName.includes('list') || toolName.includes('directory')) {
    const pathRule = rawPath ? resolveApprovalRulePath(rawPath, projectRoot).replace(/\/?$/, '/**') : '';
    return pathRule ? `Read(${pathRule})` : 'Read';
  }

  if (toolName.includes('mcp')) {
    const serverName = typeof parsed.server_name === 'string' ? parsed.server_name.trim() : '';
    const tool = typeof parsed.tool_name === 'string' ? parsed.tool_name.trim() : '';
    return serverName && tool ? `mcp__${serverName}__${tool}` : 'mcp-tool';
  }

  if (toolName.includes('agent')) {
    const agentType = typeof parsed.agent_type === 'string' ? parsed.agent_type.trim() : '';
    return agentType ? `Agent(${agentType})` : 'Agent';
  }

  if (toolName.includes('skill')) {
    const skillName = typeof parsed.skill_name === 'string' ? parsed.skill_name.trim() : '';
    return skillName ? `Skill(${skillName})` : 'Skill';
  }

  return entry.toolName || 'Tool';
}

export function getPendingApprovalSignature(entry: DesktopSessionEntry, projectRoot: string): string {
  const rule = suggestProjectAllowRule(entry, projectRoot).trim();
  return rule || (entry.toolName || '').trim().toLowerCase() || entry.id;
}

export function buildPendingApprovalPresentations(
  entries: DesktopSessionEntry[],
  projectRoot: string,
): PendingApprovalPresentation[] {
  const presentations: PendingApprovalPresentation[] = [];

  for (const entry of entries) {
    const isPendingApproval =
      entry.type === 'tool' &&
      entry.status.trim().toLowerCase() === 'approval-required' &&
      !entry.resolutionStatus?.trim();

    if (!isPendingApproval) {
      continue;
    }

    presentations.push({
      pendingEntry: entry,
      suggestedRule: suggestProjectAllowRule(entry, projectRoot),
      signature: getPendingApprovalSignature(entry, projectRoot),
    });
  }

  return presentations;
}

export function isApprovalPlaceholderText(text: string): boolean {
  return /tool '([^']+)' is waiting for approval(?:[^.]*)\.?$/i.test(text.trim());
}

export function getPendingApprovalReason(entry: DesktopSessionEntry): string {
  const body = (entry.body || '').trim();
  if (!body || body.toLowerCase() === 'ask') {
    return '';
  }

  if (/requires confirmation/i.test(body) || /waiting for approval/i.test(body)) {
    return '';
  }

  return body;
}

export function getPendingApprovalDetailLines(entry: DesktopSessionEntry): string[] {
  const toolKey = (entry.toolName || entry.title || '').toLowerCase();
  if (toolKey.includes('shell') || toolKey.includes('bash') || toolKey.includes('run_command') || toolKey.includes('terminal') || toolKey.includes('execute')) {
    return formatShellArgumentLines(entry.arguments).slice(0, 4);
  }

  const parsed = parseObjectArguments(entry.arguments);
  if (!parsed) {
    return entry.arguments ? [trunc(entry.arguments, 160)] : [];
  }

  const preferredKeys = ['file_path', 'path', 'directory', 'pattern', 'query', 'url', 'server_name', 'tool_name'];
  const lines = preferredKeys
    .filter((key) => typeof parsed[key] === 'string' && `${parsed[key]}`.trim().length > 0)
    .slice(0, 4)
    .map((key) => `${key}: ${String(parsed[key]).trim()}`);

  if (lines.length > 0) {
    return lines;
  }

  return Object.entries(parsed)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}
