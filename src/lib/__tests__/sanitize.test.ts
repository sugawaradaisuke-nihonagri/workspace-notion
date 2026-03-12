import { describe, it, expect } from "vitest";
import { sanitizeHtml, stripHtml } from "../sanitize";

describe("sanitizeHtml", () => {
  it("keeps safe HTML intact", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("allows links with href", () => {
    const input = '<a href="https://example.com">Click</a>';
    expect(sanitizeHtml(input)).toContain('href="https://example.com"');
  });

  it("allows images", () => {
    const input = '<img src="https://example.com/img.png" alt="test" />';
    const result = sanitizeHtml(input);
    expect(result).toContain("img");
    expect(result).toContain("src=");
  });

  it("removes <script> tags", () => {
    const input = '<script>alert("xss")</script><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Safe</p>");
  });

  it("removes onerror attributes", () => {
    const input = '<img src="x" onerror="alert(1)" />';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("alert");
  });

  it("removes onclick attributes", () => {
    const input = '<button onclick="alert(1)">Click</button>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
  });

  it("removes javascript: URIs from href", () => {
    const input = '<a href="javascript:alert(1)">XSS</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("allows code blocks", () => {
    const input = '<pre><code class="language-js">const x = 1;</code></pre>';
    expect(sanitizeHtml(input)).toContain("const x = 1;");
    expect(sanitizeHtml(input)).toContain("language-js");
  });

  it("allows tables", () => {
    const input =
      "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>Header</th>");
    expect(result).toContain("<td>Cell</td>");
  });

  it("allows checkboxes (task lists)", () => {
    const input = '<input type="checkbox" checked disabled />';
    const result = sanitizeHtml(input);
    expect(result).toContain("checkbox");
  });

  it("removes <style> tags", () => {
    const input = "<style>body{background:red}</style><p>Hi</p>";
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<style>");
    expect(result).toContain("<p>Hi</p>");
  });

  it("handles empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});

describe("stripHtml", () => {
  it("strips all tags", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world",
    );
  });

  it("strips nested tags", () => {
    expect(stripHtml('<div><a href="x">link</a> text</div>')).toBe("link text");
  });

  it("handles plain text", () => {
    expect(stripHtml("Just text")).toBe("Just text");
  });

  it("handles empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});
