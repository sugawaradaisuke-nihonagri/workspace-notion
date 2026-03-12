import { describe, it, expect } from "vitest";
import { tiptapToMarkdown, tiptapToHtml } from "../export";

// Helper to create a doc node
function doc(...content: Record<string, unknown>[]) {
  return { type: "doc", content };
}

function paragraph(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function heading(level: number, text: string) {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

// =============================================
// Markdown export
// =============================================

describe("tiptapToMarkdown", () => {
  it("converts empty doc", () => {
    expect(tiptapToMarkdown(doc())).toBe("");
  });

  it("converts paragraph", () => {
    const md = tiptapToMarkdown(doc(paragraph("Hello world")));
    expect(md).toContain("Hello world");
  });

  it("converts headings", () => {
    const md = tiptapToMarkdown(
      doc(heading(1, "Title"), heading(2, "Subtitle"), heading(3, "Section")),
    );
    expect(md).toContain("# Title");
    expect(md).toContain("## Subtitle");
    expect(md).toContain("### Section");
  });

  it("converts bold text", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "paragraph",
        content: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }],
      }),
    );
    expect(md).toContain("**bold**");
  });

  it("converts italic text", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "paragraph",
        content: [
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
        ],
      }),
    );
    expect(md).toContain("*italic*");
  });

  it("converts strikethrough", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "paragraph",
        content: [
          { type: "text", text: "strike", marks: [{ type: "strike" }] },
        ],
      }),
    );
    expect(md).toContain("~~strike~~");
  });

  it("converts inline code", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "paragraph",
        content: [{ type: "text", text: "code", marks: [{ type: "code" }] }],
      }),
    );
    expect(md).toContain("`code`");
  });

  it("converts links", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "click",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
        ],
      }),
    );
    expect(md).toContain("[click](https://example.com)");
  });

  it("converts bullet list", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [paragraph("Item 1")],
          },
          {
            type: "listItem",
            content: [paragraph("Item 2")],
          },
        ],
      }),
    );
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
  });

  it("converts ordered list", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "orderedList",
        content: [
          { type: "listItem", content: [paragraph("First")] },
          { type: "listItem", content: [paragraph("Second")] },
        ],
      }),
    );
    expect(md).toContain("1. First");
    expect(md).toContain("2. Second");
  });

  it("converts task list", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [paragraph("Done")],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [paragraph("Todo")],
          },
        ],
      }),
    );
    expect(md).toContain("- [x] Done");
    expect(md).toContain("- [ ] Todo");
  });

  it("converts code block", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const x = 1;" }],
      }),
    );
    expect(md).toContain("```ts");
    expect(md).toContain("const x = 1;");
    expect(md).toContain("```");
  });

  it("converts blockquote", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "blockquote",
        content: [paragraph("Quote text")],
      }),
    );
    expect(md).toContain("> Quote text");
  });

  it("converts horizontal rule", () => {
    const md = tiptapToMarkdown(doc({ type: "horizontalRule" }));
    expect(md).toContain("---");
  });

  it("converts image", () => {
    const md = tiptapToMarkdown(
      doc({
        type: "image",
        attrs: { src: "https://img.example.com/a.png", alt: "My image" },
      }),
    );
    expect(md).toContain("![My image](https://img.example.com/a.png)");
  });

  it("handles doc without content property", () => {
    expect(tiptapToMarkdown({ type: "doc" })).toBe("");
  });
});

// =============================================
// HTML export
// =============================================

describe("tiptapToHtml", () => {
  it("generates valid HTML document", () => {
    const html = tiptapToHtml(doc(paragraph("Hello")), "Test");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Test</title>");
    expect(html).toContain("<p>Hello</p>");
  });

  it("escapes HTML in title", () => {
    const html = tiptapToHtml(doc(), '<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in text content", () => {
    const html = tiptapToHtml(doc(paragraph('<img src=x onerror="alert(1)">')));
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("converts headings to h tags", () => {
    const html = tiptapToHtml(doc(heading(2, "Section")));
    expect(html).toContain("<h2>Section</h2>");
  });

  it("converts code blocks with language class", () => {
    const html = tiptapToHtml(
      doc({
        type: "codeBlock",
        attrs: { language: "python" },
        content: [{ type: "text", text: "print('hi')" }],
      }),
    );
    expect(html).toContain('class="language-python"');
    expect(html).toContain("print(");
  });

  it("converts task list with checkboxes", () => {
    const html = tiptapToHtml(
      doc({
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: true },
            content: [paragraph("Done")],
          },
        ],
      }),
    );
    expect(html).toContain("checked");
    expect(html).toContain('class="task-done"');
  });

  it("handles Untitled when no title provided", () => {
    const html = tiptapToHtml(doc());
    expect(html).toContain("<title>Untitled</title>");
    expect(html).not.toContain("<h1>");
  });
});
