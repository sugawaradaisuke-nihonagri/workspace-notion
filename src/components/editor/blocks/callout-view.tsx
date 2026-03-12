"use client";

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const emoji = (node.attrs.emoji as string) ?? "💡";

  return (
    <NodeViewWrapper
      className="callout-block flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--block-default)] px-4 py-3 my-1"
      data-type="callout"
    >
      <span
        className="mt-0.5 shrink-0 cursor-pointer text-[20px]"
        contentEditable={false}
        role="button"
        tabIndex={0}
        onClick={() => {
          const emojis = ["💡", "⚠️", "📌", "✅", "❗", "💬", "🔥", "📝"];
          const current = emojis.indexOf(emoji);
          const next = emojis[(current + 1) % emojis.length];
          updateAttributes({ emoji: next });
        }}
      >
        {emoji}
      </span>
      <NodeViewContent className="callout-content min-w-0 flex-1 text-[15px] leading-[1.7] text-[var(--text-primary)]" />
    </NodeViewWrapper>
  );
}
