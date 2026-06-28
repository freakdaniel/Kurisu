/**
 * Constants and pure helpers shared by the markdown renderer.
 *
 * Lives in its own module so `Markdown.tsx` can keep the fast-refresh
 * invariant of "only export React components".
 */
import { isValidElement, type ReactNode } from 'react';
import { themes, type Language } from 'prism-react-renderer';

export const INLINE_CODE_COLOR = '#cfcfe6';
export const INLINE_CODE_BACKGROUND = 'rgba(133,131,246,0.10)';
export const CODE_THEME = themes.vsDark;

export const SUPPORTED_HIGHLIGHT_LANGUAGES: ReadonlySet<string> = new Set<string>([
  'tsx',
  'ts',
  'typescript',
  'jsx',
  'js',
  'javascript',
  'json',
  'html',
  'xml',
  'css',
  'scss',
  'sass',
  'less',
  'markdown',
  'md',
  'bash',
  'sh',
  'shell',
  'zsh',
  'c',
  'cpp',
  'cxx',
  'cc',
  'h',
  'hpp',
  'cs',
  'java',
  'kt',
  'kotlin',
  'swift',
  'go',
  'rust',
  'rs',
  'python',
  'py',
  'rb',
  'ruby',
  'php',
  'sql',
  'yaml',
  'yml',
  'toml',
  'ini',
  'dockerfile',
  'makefile',
  'diff',
  'patch',
  'graphql',
  'lua',
  'r',
  'dart',
  'scala',
  'haskell',
  'hs',
  'perl',
  'pl',
  'powershell',
  'ps1',
]);

export const ASSISTANT_MARKDOWN_SX = {
  '& p': { marginY: 2 },
  '& ul, & ol': { paddingLeft: 6, marginY: 2 },
  '& li': { marginY: 1 },
  '& h1, & h2, & h3, & h4': { marginY: 3, fontWeight: 600, lineHeight: 1.3 },
  '& h1': { fontSize: 'lg' },
  '& h2': { fontSize: 'md' },
  '& h3': { fontSize: 'sm' },
  '& h4': { fontSize: 'sm', color: 'whiteAlpha.700' },
  '& blockquote': {
    borderLeft: '2px solid',
    borderColor: 'whiteAlpha.300',
    paddingLeft: 3,
    marginY: 2,
    color: 'whiteAlpha.800',
  },
  '& hr': { borderColor: 'whiteAlpha.200', marginY: 4 },
  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    marginY: 3,
    fontSize: 'sm',
  },
  '& th, & td': {
    border: '1px solid',
    borderColor: 'whiteAlpha.200',
    padding: '6px 10px',
    textAlign: 'left',
  },
  '& th': { background: 'whiteAlpha.100', fontWeight: 600 },
  '& a': { color: 'blue.300', textDecoration: 'underline' },
} as const;

export function flattenReactText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenReactText).join('');
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return flattenReactText(props.children);
  }
  return '';
}

export function normalizeCodeLanguage(language: string): Language | null {
  const cleaned = language.trim().toLowerCase();
  if (!cleaned) return null;
  if (SUPPORTED_HIGHLIGHT_LANGUAGES.has(cleaned)) {
    return cleaned as Language;
  }
  // Common aliases.
  const aliases: Record<string, string> = {
    jsx: 'jsx',
    tsx: 'tsx',
    typescript: 'ts',
    javascript: 'js',
    py: 'python',
    rb: 'ruby',
    sh: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    rs: 'rust',
    hs: 'haskell',
    pl: 'perl',
    ps1: 'powershell',
    'c++': 'cpp',
    'objective-c': 'c',
    objc: 'c',
  };
  const aliased = aliases[cleaned];
  if (aliased && SUPPORTED_HIGHLIGHT_LANGUAGES.has(aliased)) {
    return aliased as Language;
  }
  return null;
}
