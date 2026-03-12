"use client";

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

export function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const isOpen = (node.attrs.isOpen as boolean) ?? true;

  return (
    <NodeViewWrapper className="toggle-block my-1" data-type="toggle">
      <div className="flex items-start gap-1">
        <button
          className="mt-[3px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-colors hover:bg-[var(--bg-hover)]"
          contentEditable={false}
          onClick={() => updateAttributes({ isOpen: !isOpen })}
        >
          <ChevronRight
            size={14}
            className="text-[var(--text-tertiary)] transition-transform duration-150"
            style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </button>
        <div className="min-w-0 flex-1">
          <NodeViewContent
            className="toggle-content"
            style={{ display: isOpen ? "block" : "none" }}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
