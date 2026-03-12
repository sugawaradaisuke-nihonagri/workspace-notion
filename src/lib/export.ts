/**
 * Export utilities — Convert Tiptap JSONContent to Markdown or HTML
 */
import { sanitizeHtml } from "./sanitize";

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

// ========== Tiptap JSON → Markdown ==========

export function tiptapToMarkdown(doc: TiptapNode): string {
  if (!doc.content) return "";
  return doc.content.map((node) => nodeToMarkdown(node, 0)).join("\n");
}

function nodeToMarkdown(node: TiptapNode, depth: number): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${inlineToMarkdown(node.content)}\n`;
    }
    case "paragraph":
      return `${inlineToMarkdown(node.content)}\n`;

    case "bulletList":
      return (
        (node.content ?? [])
          .map((item) => listItemToMarkdown(item, depth, "- "))
          .join("\n") + "\n"
      );

    case "orderedList":
      return (
        (node.content ?? [])
          .map((item, i) => listItemToMarkdown(item, depth, `${i + 1}. `))
          .join("\n") + "\n"
      );

    case "listItem":
      return (node.content ?? [])
        .map((child) => nodeToMarkdown(child, depth))
        .join("");

    case "taskList":
      return (
        (node.content ?? [])
          .map((item) => {
            const checked = item.attrs?.checked ? "x" : " ";
            const indent = "  ".repeat(depth);
            const text = (item.content ?? [])
              .map((child) => inlineToMarkdown(child.content))
              .join("");
            return `${indent}- [${checked}] ${text}`;
          })
          .join("\n") + "\n"
      );

    case "blockquote":
      return (
        (node.content ?? [])
          .map((child) => `> ${nodeToMarkdown(child, depth).trim()}`)
          .join("\n") + "\n"
      );

    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = inlineToMarkdown(node.content);
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
    }

    case "horizontalRule":
      return "---\n";

    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      const caption = node.attrs?.caption as string;
      let md = `![${alt}](${src})`;
      if (caption) md += `\n*${caption}*`;
      return md + "\n";
    }

    case "callout": {
      const emoji = (node.attrs?.emoji as string) ?? "💡";
      const text = (node.content ?? [])
        .map((child) => nodeToMarkdown(child, depth).trim())
        .join("\n");
      return `> ${emoji} ${text}\n`;
    }

    case "toggle": {
      const summary = (node.attrs?.summary as string) ?? "Details";
      const content = (node.content ?? [])
        .map((child) => nodeToMarkdown(child, depth).trim())
        .join("\n");
      return `<details>\n<summary>${summary}</summary>\n\n${content}\n</details>\n`;
    }

    case "mediaBlock": {
      const src = (node.attrs?.src as string) ?? "";
      const mediaType = (node.attrs?.mediaType as string) ?? "file";
      if (mediaType === "video" || mediaType === "audio") {
        return `[${mediaType}: ${src}](${src})\n`;
      }
      if (mediaType === "embed") {
        return `[Embed](${src})\n`;
      }
      return `[File](${src})\n`;
    }

    case "table": {
      return tableToMarkdown(node);
    }

    default:
      if (node.content) {
        return node.content
          .map((child) => nodeToMarkdown(child, depth))
          .join("");
      }
      return "";
  }
}

function listItemToMarkdown(
  item: TiptapNode,
  depth: number,
  prefix: string,
): string {
  const indent = "  ".repeat(depth);
  const children = item.content ?? [];
  const lines: string[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (i === 0 && child.type === "paragraph") {
      lines.push(`${indent}${prefix}${inlineToMarkdown(child.content)}`);
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      lines.push(nodeToMarkdown(child, depth + 1).trimEnd());
    } else {
      lines.push(`${indent}  ${nodeToMarkdown(child, depth + 1).trim()}`);
    }
  }

  return lines.join("\n");
}

function inlineToMarkdown(content?: TiptapNode[]): string {
  if (!content) return "";
  return content
    .map((node) => {
      if (node.type === "text") {
        let text = node.text ?? "";
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                text = `**${text}**`;
                break;
              case "italic":
                text = `*${text}*`;
                break;
              case "strike":
                text = `~~${text}~~`;
                break;
              case "code":
                text = `\`${text}\``;
                break;
              case "link":
                text = `[${text}](${mark.attrs?.href ?? ""})`;
                break;
              case "underline":
                text = `<u>${text}</u>`;
                break;
              case "highlight":
                text = `==${text}==`;
                break;
            }
          }
        }
        return text;
      }
      if (node.type === "mention") {
        return `@${node.attrs?.label ?? ""}`;
      }
      if (node.type === "hardBreak") {
        return "\n";
      }
      return "";
    })
    .join("");
}

function tableToMarkdown(node: TiptapNode): string {
  const rows = node.content ?? [];
  if (rows.length === 0) return "";

  const mdRows = rows.map((row) =>
    (row.content ?? []).map((cell) =>
      inlineToMarkdown(cell.content?.[0]?.content),
    ),
  );

  const colCount = mdRows[0]?.length ?? 0;
  const header = `| ${mdRows[0]?.join(" | ") ?? ""} |`;
  const separator = `| ${Array(colCount).fill("---").join(" | ")} |`;
  const body = mdRows
    .slice(1)
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return `${header}\n${separator}\n${body}\n`;
}

// ========== Tiptap JSON → HTML ==========

export function tiptapToHtml(doc: TiptapNode, title?: string): string {
  const rawBodyHtml = doc.content
    ? doc.content.map((node) => nodeToHtml(node)).join("\n")
    : "";

  // Sanitize only the user-generated body content (not the trusted template wrapper)
  const bodyHtml = sanitizeHtml(rawBodyHtml);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title ?? "Untitled")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 860px; margin: 0 auto; padding: 40px 20px; color: #37352f; line-height: 1.7; }
    h1 { font-size: 30px; font-weight: 700; margin-top: 24px; }
    h2 { font-size: 23px; font-weight: 600; margin-top: 18px; }
    h3 { font-size: 18px; font-weight: 600; margin-top: 12px; }
    code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; font-size: 13.5px; }
    pre { background: #1a1a1a; color: #e6e6e6; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid #ddd; padding-left: 16px; color: #666; font-style: italic; }
    img { max-width: 100%; border-radius: 4px; }
    hr { border: none; border-top: 1px solid #eee; margin: 16px 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .callout { display: flex; gap: 8px; background: #f5f5f5; padding: 12px 16px; border-radius: 6px; margin: 8px 0; }
    .task-done { text-decoration: line-through; color: #999; }
  </style>
</head>
<body>
${title ? `<h1>${escapeHtml(title)}</h1>\n` : ""}${bodyHtml}
</body>
</html>`;
}

function nodeToHtml(node: TiptapNode): string {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return `<h${level}>${inlineToHtml(node.content)}</h${level}>`;
    }
    case "paragraph":
      return `<p>${inlineToHtml(node.content)}</p>`;

    case "bulletList":
      return `<ul>\n${(node.content ?? []).map((item) => nodeToHtml(item)).join("\n")}\n</ul>`;

    case "orderedList":
      return `<ol>\n${(node.content ?? []).map((item) => nodeToHtml(item)).join("\n")}\n</ol>`;

    case "listItem":
      return `<li>${(node.content ?? []).map((child) => nodeToHtml(child)).join("")}</li>`;

    case "taskList":
      return `<ul style="list-style:none;padding-left:0;">\n${(
        node.content ?? []
      )
        .map((item) => {
          const checked = item.attrs?.checked;
          const text = (item.content ?? [])
            .map((child) => inlineToHtml(child.content))
            .join("");
          return `<li><input type="checkbox" ${checked ? "checked" : ""} disabled /> <span${checked ? ' class="task-done"' : ""}>${text}</span></li>`;
        })
        .join("\n")}\n</ul>`;

    case "blockquote":
      return `<blockquote>\n${(node.content ?? []).map((child) => nodeToHtml(child)).join("\n")}\n</blockquote>`;

    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      return `<pre><code${lang ? ` class="language-${lang}"` : ""}>${escapeHtml(inlineToPlainText(node.content))}</code></pre>`;
    }

    case "horizontalRule":
      return "<hr />";

    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`;
    }

    case "callout": {
      const emoji = (node.attrs?.emoji as string) ?? "💡";
      const text = (node.content ?? [])
        .map((child) => nodeToHtml(child))
        .join("");
      return `<div class="callout"><span>${emoji}</span><div>${text}</div></div>`;
    }

    default:
      if (node.content) {
        return node.content.map((child) => nodeToHtml(child)).join("");
      }
      return "";
  }
}

function inlineToHtml(content?: TiptapNode[]): string {
  if (!content) return "";
  return content
    .map((node) => {
      if (node.type === "text") {
        let html = escapeHtml(node.text ?? "");
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                html = `<strong>${html}</strong>`;
                break;
              case "italic":
                html = `<em>${html}</em>`;
                break;
              case "strike":
                html = `<s>${html}</s>`;
                break;
              case "code":
                html = `<code>${html}</code>`;
                break;
              case "underline":
                html = `<u>${html}</u>`;
                break;
              case "link":
                html = `<a href="${escapeHtml(String(mark.attrs?.href ?? ""))}">${html}</a>`;
                break;
              case "highlight":
                html = `<mark>${html}</mark>`;
                break;
            }
          }
        }
        return html;
      }
      if (node.type === "mention") {
        return `<span style="color:#2383e2;">@${escapeHtml(String(node.attrs?.label ?? ""))}</span>`;
      }
      if (node.type === "hardBreak") {
        return "<br />";
      }
      return "";
    })
    .join("");
}

function inlineToPlainText(content?: TiptapNode[]): string {
  if (!content) return "";
  return content.map((n) => n.text ?? "").join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
