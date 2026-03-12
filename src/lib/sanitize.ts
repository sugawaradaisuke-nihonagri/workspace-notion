/**
 * HTML sanitizer — wraps DOMPurify for consistent XSS protection.
 *
 * Usage:
 *   import { sanitizeHtml } from "@/lib/sanitize";
 *   const safe = sanitizeHtml(untrustedHtml);
 */
import DOMPurify from "isomorphic-dompurify";

/** Default allowed tags — covers Tiptap's output + Notion-style blocks */
const ALLOWED_TAGS = [
  // Text structure
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  // Inline formatting
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "code",
  "mark",
  "a",
  "span",
  "sub",
  "sup",
  // Lists
  "ul",
  "ol",
  "li",
  // Block elements
  "blockquote",
  "pre",
  "div",
  "details",
  "summary",
  // Media
  "img",
  "figure",
  "figcaption",
  "video",
  "audio",
  "source",
  "iframe",
  // Table
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  // Form (read-only checkboxes in task lists)
  "input",
  "label",
];

const ALLOWED_ATTR = [
  "href",
  "src",
  "alt",
  "title",
  "class",
  "style",
  "target",
  "rel",
  "type",
  "checked",
  "disabled",
  "width",
  "height",
  "controls",
  "autoplay",
  "loop",
  "muted",
  "colspan",
  "rowspan",
  "data-*",
  // iframe embed
  "sandbox",
  "allow",
  "allowfullscreen",
  "frameborder",
];

/**
 * Sanitize untrusted HTML to prevent XSS attacks.
 * Safe for rendering via dangerouslySetInnerHTML or export output.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: true,
    // Prevent script execution via attributes
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
    // Remove javascript: protocol from href/src
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Strip all HTML tags, returning plain text only.
 * Useful for search indexing, notifications, etc.
 */
export function stripHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
