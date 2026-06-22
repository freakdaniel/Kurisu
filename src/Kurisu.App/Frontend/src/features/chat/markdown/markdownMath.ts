const LATEX_PERCENT = '%';

export function isEscapedCharacter(value: string, index: number): boolean {
  if (index <= 0) {
    return false;
  }
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && value[i] === '\\'; i--) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

export function escapeLatexPercentSigns(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === LATEX_PERCENT && !isEscapedCharacter(value, i)) {
      result += '\\' + ch;
    } else {
      result += ch;
    }
  }
  return result;
}

export function sanitizeMathContent(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}


export function normalizeMathSegments(markdown: string): string {
  return markdown
    .split(/(\$\$[^$]*\$\$|\$[^$\n]*\$)/g)
    .map((segment) => {
      const isMathSegment = /^\$[^$]/.test(segment) || /^\$\$/.test(segment);
      if (!isMathSegment) {
        return segment;
      }
      const content = segment.replace(/^\$+|\$+$/g, '');
      return `$${escapeLatexPercentSigns(sanitizeMathContent(content))}$`;
    })
    .join('');
}

export function looksLikeMathExpression(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > 240) {
    return false;
  }

  const hasMathMarker = /(?:\\[a-zA-Z]+|[_^]\{|[A-Za-z]\s*[_^]|[A-Za-z]\([^)]*\)|[\u0370-\u03ff\u2070-\u209f\u2200-\u22ff])/.test(text);
  const hasEquationShape = /=/.test(text) && /[A-Za-z0-9\)]\s*[+\-*/]\s*[A-Za-z0-9{\(]/.test(text);
  const hasProseSentence = /[\u0400-\u04ff]{3,}/.test(text);
  return (hasMathMarker || hasEquationShape) && !hasProseSentence;
}

export const UNICODE_SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁺': '+',
  '⁻': '-',
  'ⁿ': 'n',
};

export const UNICODE_SUBSCRIPTS: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '₊': '+',
  '₋': '-',
  'ₐ': 'a',
  'ₑ': 'e',
  'ₕ': 'h',
  'ᵢ': 'i',
  'ⱼ': 'j',
  'ₖ': 'k',
  'ₗ': 'l',
  'ₘ': 'm',
  'ₙ': 'n',
  'ₒ': 'o',
  'ₚ': 'p',
  'ᵣ': 'r',
  'ₛ': 's',
  'ₜ': 't',
  'ᵤ': 'u',
  'ᵥ': 'v',
  'ₓ': 'x',
};

export function normalizeLooseMathFormula(value: string): string {
  let result = '';
  let superscriptRun = '';
  let subscriptRun = '';

  const flush = () => {
    if (superscriptRun) {
      result += `^{${superscriptRun}}`;
      superscriptRun = '';
    }

    if (subscriptRun) {
      result += `_{${subscriptRun}}`;
      subscriptRun = '';
    }
  };

  for (const character of value.replace(/\u2212/g, '-')) {
    const superscript = UNICODE_SUPERSCRIPTS[character];
    if (superscript) {
      if (subscriptRun) {
        result += `_{${subscriptRun}}`;
        subscriptRun = '';
      }

      superscriptRun += superscript;
      continue;
    }

    const subscript = UNICODE_SUBSCRIPTS[character];
    if (subscript) {
      if (superscriptRun) {
        result += `^{${superscriptRun}}`;
        superscriptRun = '';
      }

      subscriptRun += subscript;
      continue;
    }

    flush();
    result += character;
  }

  flush();
  return result;
}

export function normalizeUndelimitedMath(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      const strongFormula = /^\*\*(?<formula>[^*]+)\*\*$/.exec(trimmed);
      if (strongFormula?.groups?.formula && looksLikeMathExpression(strongFormula.groups.formula)) {
        return `${line.slice(0, line.indexOf('**'))}$$${normalizeLooseMathFormula(strongFormula.groups.formula.trim())}$$`;
      }

      return line;
    })
    .join('\n');
}

export type MarkdownAstNode = {
  type?: string;
  value?: string;
  children?: MarkdownAstNode[];
};

export function extractPlainMarkdownText(node: MarkdownAstNode): string {
  if (typeof node.value === 'string') {
    return node.value;
  }

  return (node.children ?? []).map(extractPlainMarkdownText).join('');
}

export function isPlainTableMathCell(node: MarkdownAstNode): boolean {
  if (node.type === 'text' || node.type === 'paragraph' || node.type === 'tableCell') {
    return (node.children ?? []).every(isPlainTableMathCell);
  }

  return false;
}

export function rewriteTableMathCells(node: MarkdownAstNode): void {
  if (node.type === 'tableCell') {
    const cellText = extractPlainMarkdownText(node).trim();
    if (cellText && isPlainTableMathCell(node) && looksLikeMathExpression(cellText)) {
      node.children = [
        {
          type: 'paragraph',
          children: [
            {
              type: 'inlineMath',
              value: normalizeLooseMathFormula(cellText),
            },
          ],
        },
      ];
      return;
    }
  }

  for (const child of node.children ?? []) {
    rewriteTableMathCells(child);
  }
}

export function remarkUndelimitedTableMath() {
  return (tree: MarkdownAstNode) => {
    rewriteTableMathCells(tree);
  };
}
