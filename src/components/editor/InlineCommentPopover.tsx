"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Editor } from "@tiptap/core";

interface InlineCommentPopoverProps {
  editor: Editor | null;
  onAddComment: (from: number, to: number, text: string) => void;
}

/**
 * Floating popover that appears above text selections, offering
 * an "Add Comment" button. When clicked, it captures the selection
 * range and passes it to the parent for comment creation.
 */
export function InlineCommentPopover({
  editor,
  onAddComment,
}: InlineCommentPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) {
      setVisible(false);
      return;
    }

    // Get the DOM range for positioning
    const view = editor.view;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Position above the selection
    const left = (start.left + end.left) / 2;
    const top = start.top - 40;

    setPosition({ top, left });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // Small delay to ensure selection is finalized
      requestAnimationFrame(updatePosition);
    };

    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, updatePosition]);

  // Hide on click outside
  useEffect(() => {
    if (!visible) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        // Don't hide immediately — let selection events handle it
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [visible]);

  const handleClick = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const text = editor.state.doc.textBetween(from, to, " ");
    onAddComment(from, to, text);
    setVisible(false);
  }, [editor, onAddComment]);

  if (!visible) return null;

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 flex items-center gap-1 rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] px-1 py-0.5"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        title="コメントを追加"
      >
        <MessageCircle size={13} />
        <span>コメント</span>
      </button>
    </div>
  );
}
