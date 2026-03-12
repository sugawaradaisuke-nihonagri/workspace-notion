"use client";

import { useCallback } from "react";
import { useCurrentEditor } from "@tiptap/react";
import { trpc } from "@/lib/trpc/client";
import { useInlineComments } from "@/hooks/use-inline-comments";
import { InlineCommentPopover } from "./InlineCommentPopover";

interface InlineCommentBridgeProps {
  pageId: string;
  enabled: boolean;
}

/**
 * Bridge component that lives inside <EditorProvider> and connects
 * inline comment features to the editor instance via useCurrentEditor().
 *
 * Responsibilities:
 * 1. Syncs comment decorations into the editor (via useInlineComments)
 * 2. Renders the selection popover for adding inline comments
 */
export function InlineCommentBridge({
  pageId,
  enabled,
}: InlineCommentBridgeProps) {
  const { editor } = useCurrentEditor();
  const utils = trpc.useUtils();

  // Sync inline comment decorations into the editor
  useInlineComments(pageId, editor, enabled);

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ pageId });
    },
  });

  const handleAddComment = useCallback(
    (from: number, to: number, text: string) => {
      // Prompt for comment content via a simple approach:
      // We create the comment with the inline ref and a placeholder,
      // then the sidebar will show it for editing.
      const content = window.prompt("コメントを入力:");
      if (!content?.trim()) return;

      createComment.mutate({
        pageId,
        content: content.trim(),
        inlineRef: { from, to, text },
      });
    },
    [pageId, createComment],
  );

  if (!enabled || !editor) return null;

  return (
    <InlineCommentPopover editor={editor} onAddComment={handleAddComment} />
  );
}
