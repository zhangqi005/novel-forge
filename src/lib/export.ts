// Convert TipTap JSON to plain text
export function tiptapToText(content: Record<string, unknown>): string {
  try {
    const doc = content as { content?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; marks?: Array<{ type: string }>; content?: Array<{ type?: string; text?: string }> }> }> };
    if (!doc.content) return '';

    return doc.content
      .map((node) => {
        if (node.type === 'heading') {
          const text = extractInlineText(node);
          return text + '\n';
        }
        if (node.type === 'bulletList') {
          return extractListItems(node, 'bullet');
        }
        if (node.type === 'orderedList') {
          return extractListItems(node, 'ordered');
        }
        if (node.type === 'blockquote') {
          const text = extractInlineText(node);
          return text.split('\n').map((l) => '> ' + l).join('\n') + '\n';
        }
        if (node.type === 'codeBlock') {
          const text = extractInlineText(node);
          return '```\n' + text + '\n```\n';
        }
        if (node.type === 'horizontalRule') {
          return '---\n';
        }
        return extractInlineText(node) + '\n';
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

// Convert TipTap JSON to Markdown
export function tiptapToMarkdown(content: Record<string, unknown>): string {
  try {
    const doc = content as { content?: Array<{ type?: string; attrs?: { level?: number }; content?: Array<{ type?: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }>; content?: Array<{ type?: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }> }> }> }> };
    if (!doc.content) return '';

    return doc.content
      .map((node) => {
        if (node.type === 'heading') {
          const level = node.attrs?.level || 1;
          const prefix = '#'.repeat(level);
          return prefix + ' ' + extractInlineMarkdown(node) + '\n';
        }
        if (node.type === 'bulletList') {
          return extractListItemsMarkdown(node, '-');
        }
        if (node.type === 'orderedList') {
          return extractListItemsMarkdown(node, '1.');
        }
        if (node.type === 'blockquote') {
          const text = extractInlineMarkdown(node);
          return text.split('\n').map((l) => '> ' + l).join('\n') + '\n';
        }
        if (node.type === 'codeBlock') {
          const text = extractInlineText(node);
          return '```\n' + text + '\n```\n';
        }
        if (node.type === 'horizontalRule') {
          return '---\n';
        }
        if (node.type === 'paragraph') {
          const text = extractInlineMarkdown(node);
          return (text ? text + '\n' : '\n');
        }
        return extractInlineMarkdown(node) + '\n';
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

function extractInlineText(node: {
  content?: Array<{ type?: string; text?: string; content?: Array<{ type?: string; text?: string }> }>;
}): string {
  if (!node.content) return '';
  return node.content
    .map((child) => {
      if (child.type === 'text') return child.text || '';
      if (child.type === 'hardBreak') return '\n';
      if (child.content) return extractInlineText(child);
      return '';
    })
    .join('');
}

function extractInlineMarkdown(node: {
  content?: Array<{ type?: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }>; content?: Array<{ type?: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }> }> }>;
}): string {
  if (!node.content) return '';
  return node.content
    .map((child) => {
      if (child.type === 'text') {
        let text = child.text || '';
        if (child.marks) {
          for (const mark of child.marks) {
            if (mark.type === 'bold') text = `**${text}**`;
            if (mark.type === 'italic') text = `*${text}*`;
            if (mark.type === 'code') text = `\`${text}\``;
            if (mark.type === 'strike') text = `~~${text}~~`;
            if (mark.type === 'link') text = `[${text}](${mark.attrs?.href || '#'})`;
          }
        }
        return text;
      }
      if (child.type === 'hardBreak') return '\n';
      if (child.content) return extractInlineMarkdown(child);
      return '';
    })
    .join('');
}

function extractListItems(
  node: { content?: Array<{ type?: string; content?: Array<unknown> }> },
  _type: 'bullet' | 'ordered'
): string {
  if (!node.content) return '';
  const items: string[] = [];
  for (const item of node.content) {
    if (item.type === 'listItem' && item.content) {
      const content = item.content as Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string; content?: Array<{ type?: string; text?: string }> }>;
      }>;
      for (const block of content) {
        if (block.type === 'paragraph') {
          items.push(extractInlineText(block));
        }
      }
    }
  }
  return items.map((t) => '• ' + t).join('\n');
}

function extractListItemsMarkdown(
  node: { content?: Array<{ type?: string; content?: Array<unknown> }> },
  prefix: string
): string {
  if (!node.content) return '';
  const items: string[] = [];
  let index = 1;
  for (const item of node.content) {
    if (item.type === 'listItem' && item.content) {
      const content = item.content as Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }> }>;
      }>;
      for (const block of content) {
        if (block.type === 'paragraph') {
          const pfx = prefix === '-' ? '- ' : `${index}. `;
          items.push(pfx + extractInlineMarkdown(block));
          if (prefix !== '-') index++;
        }
      }
    }
  }
  return items.join('\n');
}

// Trigger a file download in the browser
export function downloadFile(filename: string, content: string, mimeType: string = 'text/plain') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
