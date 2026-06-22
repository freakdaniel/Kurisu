export function getMarkdownNodeTextContent(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const candidate = node as { value?: unknown; children?: unknown[] };
  if (typeof candidate.value === 'string') {
    return candidate.value;
  }

  if (Array.isArray(candidate.children)) {
    return candidate.children.map((child) => getMarkdownNodeTextContent(child)).join('');
  }

  return '';
}

export function extractMarkdownTableRows(node: unknown): string[][] {
  const rows: string[][] = [];

  const visit = (candidate: unknown) => {
    if (!candidate || typeof candidate !== 'object') {
      return;
    }

    const element = candidate as { tagName?: string; children?: unknown[] };
    if (element.tagName === 'tr') {
      const cells = (element.children ?? [])
        .filter((child): child is { tagName?: string } => !!child && typeof child === 'object')
        .filter((child) => child.tagName === 'th' || child.tagName === 'td')
        .map((child) => getMarkdownNodeTextContent(child).trim());

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    for (const child of element.children ?? []) {
      visit(child);
    }
  };

  visit(node);
  return rows;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;');
}

export function buildCsvContent(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
}

export function buildExcelContent(rows: string[][]): string {
  const [headerRow = [], ...bodyRows] = rows;
  const thead = headerRow.length > 0
    ? `<thead><tr>${headerRow.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
    : '';
  const tbody = `<tbody>${bodyRows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body>
  <table>${thead}${tbody}</table>
</body>
</html>`;
}

export function downloadTextContent(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
