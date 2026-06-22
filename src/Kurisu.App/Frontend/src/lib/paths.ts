export interface SessionScopeOptions {
  runtimeBaseDirectory?: string;
  workspaceRoot?: string;
}

function getPathSeparator(basePath: string): string {
  return basePath.includes('\\') ? '\\' : '/';
}

export function normalizePathKey(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function pathStartsWith(path: string, root: string): boolean {
  if (!path || !root) {
    return false;
  }

  const normalizedPath = normalizePathKey(path);
  const normalizedRoot = normalizePathKey(root);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function joinDesktopPath(basePath: string, ...segments: string[]): string {
  const separator = getPathSeparator(basePath);
  const trimmedBase = basePath.replace(/[\\/]+$/, '');
  const trimmedSegments = segments
    .map((segment) => segment.replace(/^[\\/]+|[\\/]+$/g, ''))
    .filter(Boolean);

  return [trimmedBase, ...trimmedSegments].join(separator);
}

export function getProjectlessTempDirectory(
  runtimeBaseDirectory: string,
  workspaceRoot: string,
): string {
  const baseDirectory = runtimeBaseDirectory.trim() || workspaceRoot.trim();
  return joinDesktopPath(baseDirectory, 'tmp', 'no-project');
}

export function isProjectlessWorkingDirectory(
  workingDirectory: string,
  options: SessionScopeOptions,
): boolean {
  if (!workingDirectory.trim()) {
    return false;
  }

  const projectlessRoot = getProjectlessTempDirectory(
    options.runtimeBaseDirectory ?? '',
    options.workspaceRoot ?? '',
  );

  if (projectlessRoot && pathStartsWith(workingDirectory, projectlessRoot)) {
    return true;
  }

  return /(?:^|[\\/])tmp[\\/]no-project(?:[\\/]|$)/i.test(workingDirectory) ||
    /(?:^|[\\/])(?:aionui-)?kurisu-temp-[^\\/]+(?:[\\/]|$)/i.test(workingDirectory);
}

export function isTemporaryChatWorkingDirectory(workingDirectory: string): boolean {
  return /(?:^|[\\/])(?:aionui-)?kurisu-temp-[^\\/]+(?:[\\/]|$)/i.test(workingDirectory);
}

export function basename(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() ?? p;
}
