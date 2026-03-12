/**
 * Import utilities — Convert Markdown to Tiptap JSONContent
 */

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export function markdownToTiptap(markdown: string): TiptapNode {
  const lines = markdown.split("\n");
  const doc: TiptapNode = { type: "doc", content: [] };
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      doc.content!.push({
        type: "heading",
        attrs: { level },
        content: parseInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      doc.content!.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      doc.content!.push({
        type: "codeBlock",
        attrs: { language: lang || null },
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      doc.content!.push({
        type: "blockquote",
        content: quoteLines.map((ql) => ({
          type: "paragraph",
          content: parseInline(ql),
        })),
      });
      continue;
    }

    // Task list
    if (/^\s*- \[[ x]\] /.test(line)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && /^\s*- \[[ x]\] /.test(lines[i])) {
        const taskMatch = lines[i].match(/^\s*- \[([ x])\] (.+)/);
        if (taskMatch) {
          items.push({
            type: "taskItem",
            attrs: { checked: taskMatch[1] === "x" },
            content: [
              {
                type: "paragraph",
                content: parseInline(taskMatch[2]),
              },
            ],
          });
        }
        i++;
      }
      doc.content!.push({ type: "taskList", content: items });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s/.test(line)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && /^\s*[-*+]\s/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*+]\s/, "");
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(text) }],
        });
        i++;
      }
      doc.content!.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\s*\d+\.\s/, "");
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(text) }],
        });
        i++;
      }
      doc.content!.push({ type: "orderedList", content: items });
      continue;
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      doc.content!.push({
        type: "image",
        attrs: { src: imgMatch[2], alt: imgMatch[1] },
      });
      i++;
      continue;
    }

    // Regular paragraph
    doc.content!.push({
      type: "paragraph",
      content: parseInline(line),
    });
    i++;
  }

  return doc;
}

/** Parse inline Markdown (bold, italic, code, links, strikethrough) */
function parseInline(text: string): TiptapNode[] {
  if (!text) return [];

  const nodes: TiptapNode[] = [];
  // Regex for inline patterns
  const pattern =
    /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(~~(.+?)~~)|(\[([^\]]+)\]\(([^)]+)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add plain text before match
    if (match.index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Bold **text**
      nodes.push({
        type: "text",
        text: match[2],
        marks: [{ type: "bold" }],
      });
    } else if (match[3]) {
      // Italic *text*
      nodes.push({
        type: "text",
        text: match[4],
        marks: [{ type: "italic" }],
      });
    } else if (match[5]) {
      // Code `text`
      nodes.push({
        type: "text",
        text: match[6],
        marks: [{ type: "code" }],
      });
    } else if (match[7]) {
      // Strikethrough ~~text~~
      nodes.push({
        type: "text",
        text: match[8],
        marks: [{ type: "strike" }],
      });
    } else if (match[9]) {
      // Link [text](url)
      nodes.push({
        type: "text",
        text: match[10],
        marks: [{ type: "link", attrs: { href: match[11] } }],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

/** Extract a page title from Markdown (first heading or first line) */
export function extractTitleFromMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) return match[1].trim();
    if (line.trim()) return line.trim().slice(0, 100);
  }
  return "Imported Page";
}
