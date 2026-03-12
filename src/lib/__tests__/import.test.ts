import { describe, it, expect } from "vitest";
import { markdownToTiptap, extractTitleFromMarkdown } from "../import";

// =============================================
// markdownToTiptap
// =============================================

describe("markdownToTiptap", () => {
  it("converts empty markdown to empty doc", () => {
    const doc = markdownToTiptap("");
    expect(doc.type).toBe("doc");
    expect(doc.content).toEqual([]);
  });

  it("converts plain text to paragraph", () => {
    const doc = markdownToTiptap("Hello world");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("paragraph");
    expect(doc.content![0].content![0].text).toBe("Hello world");
  });

  it("converts headings", () => {
    const doc = markdownToTiptap("# H1\n## H2\n### H3");
    expect(doc.content).toHaveLength(3);
    expect(doc.content![0].type).toBe("heading");
    expect(doc.content![0].attrs?.level).toBe(1);
    expect(doc.content![1].attrs?.level).toBe(2);
    expect(doc.content![2].attrs?.level).toBe(3);
  });

  it("converts bullet list", () => {
    const doc = markdownToTiptap("- Item 1\n- Item 2\n- Item 3");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("bulletList");
    expect(doc.content![0].content).toHaveLength(3);
    expect(doc.content![0].content![0].type).toBe("listItem");
  });

  it("converts ordered list", () => {
    const doc = markdownToTiptap("1. First\n2. Second");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("orderedList");
    expect(doc.content![0].content).toHaveLength(2);
  });

  it("converts task list", () => {
    const doc = markdownToTiptap("- [x] Done\n- [ ] Todo");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("taskList");
    expect(doc.content![0].content![0].attrs?.checked).toBe(true);
    expect(doc.content![0].content![1].attrs?.checked).toBe(false);
  });

  it("converts code block", () => {
    const doc = markdownToTiptap("```typescript\nconst x = 1;\n```");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("codeBlock");
    expect(doc.content![0].attrs?.language).toBe("typescript");
    expect(doc.content![0].content![0].text).toBe("const x = 1;");
  });

  it("converts code block without language", () => {
    const doc = markdownToTiptap("```\nhello\n```");
    expect(doc.content![0].type).toBe("codeBlock");
    expect(doc.content![0].attrs?.language).toBe(null);
  });

  it("converts blockquote", () => {
    const doc = markdownToTiptap("> Quote text\n> Line 2");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("blockquote");
    expect(doc.content![0].content).toHaveLength(2);
  });

  it("converts horizontal rule", () => {
    const doc = markdownToTiptap("---");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("horizontalRule");
  });

  it("converts image", () => {
    const doc = markdownToTiptap("![Alt text](https://img.example.com/a.png)");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("image");
    expect(doc.content![0].attrs?.src).toBe("https://img.example.com/a.png");
    expect(doc.content![0].attrs?.alt).toBe("Alt text");
  });

  it("skips empty lines", () => {
    const doc = markdownToTiptap("Hello\n\nWorld");
    expect(doc.content).toHaveLength(2);
    expect(doc.content![0].content![0].text).toBe("Hello");
    expect(doc.content![1].content![0].text).toBe("World");
  });

  // Inline marks
  it("parses bold inline", () => {
    const doc = markdownToTiptap("This is **bold** text");
    const inline = doc.content![0].content!;
    const boldNode = inline.find((n) =>
      n.marks?.some((m) => m.type === "bold"),
    );
    expect(boldNode).toBeDefined();
    expect(boldNode!.text).toBe("bold");
  });

  it("parses italic inline", () => {
    const doc = markdownToTiptap("This is *italic* text");
    const inline = doc.content![0].content!;
    const italicNode = inline.find((n) =>
      n.marks?.some((m) => m.type === "italic"),
    );
    expect(italicNode).toBeDefined();
    expect(italicNode!.text).toBe("italic");
  });

  it("parses inline code", () => {
    const doc = markdownToTiptap("Use `npm install`");
    const inline = doc.content![0].content!;
    const codeNode = inline.find((n) =>
      n.marks?.some((m) => m.type === "code"),
    );
    expect(codeNode).toBeDefined();
    expect(codeNode!.text).toBe("npm install");
  });

  it("parses links", () => {
    const doc = markdownToTiptap("[Click](https://example.com)");
    const inline = doc.content![0].content!;
    const linkNode = inline.find((n) =>
      n.marks?.some((m) => m.type === "link"),
    );
    expect(linkNode).toBeDefined();
    expect(linkNode!.text).toBe("Click");
    expect(linkNode!.marks![0].attrs?.href).toBe("https://example.com");
  });

  it("parses strikethrough", () => {
    const doc = markdownToTiptap("~~deleted~~");
    const inline = doc.content![0].content!;
    const strikeNode = inline.find((n) =>
      n.marks?.some((m) => m.type === "strike"),
    );
    expect(strikeNode).toBeDefined();
    expect(strikeNode!.text).toBe("deleted");
  });

  // Complex document
  it("handles a complex markdown document", () => {
    const md = `# Title

Some paragraph with **bold** and *italic*.

## Section

- Item 1
- Item 2

\`\`\`js
console.log("hello");
\`\`\`

> A quote`;

    const doc = markdownToTiptap(md);
    const types = doc.content!.map((n) => n.type);
    expect(types).toEqual([
      "heading",
      "paragraph",
      "heading",
      "bulletList",
      "codeBlock",
      "blockquote",
    ]);
  });
});

// =============================================
// extractTitleFromMarkdown
// =============================================

describe("extractTitleFromMarkdown", () => {
  it("extracts H1 title", () => {
    expect(extractTitleFromMarkdown("# My Page\n\nContent")).toBe("My Page");
  });

  it("extracts H2 title", () => {
    expect(extractTitleFromMarkdown("## Section Title")).toBe("Section Title");
  });

  it("uses first non-empty line if no heading", () => {
    expect(extractTitleFromMarkdown("Just some text")).toBe("Just some text");
  });

  it("trims the title", () => {
    expect(extractTitleFromMarkdown("#   Spaced Title  ")).toBe("Spaced Title");
  });

  it('returns "Imported Page" for empty input', () => {
    expect(extractTitleFromMarkdown("")).toBe("Imported Page");
    expect(extractTitleFromMarkdown("\n\n\n")).toBe("Imported Page");
  });

  it("truncates very long first lines", () => {
    const longLine = "a".repeat(200);
    const result = extractTitleFromMarkdown(longLine);
    expect(result.length).toBeLessThanOrEqual(100);
  });
});
