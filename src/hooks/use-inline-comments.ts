"use client";

import { useEffect, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { trpc } from "@/lib/trpc/client";
import {
  inlineCommentPluginKey,
  type InlineComment,
} from "@/components/editor/extensions/inline-comment-extension";

interface InlineRef {
  from?: number;
  to?: number;
  text?: string;
}

/**
 * Syncs inline comment data from the server into the editor's
 * InlineCommentExtension decorations. Also returns the list of
 * inline comments for the sidebar to render.
 */
export function useInlineComments(
  pageId: string,
  editor: Editor | null,
  enabled: boolean,
) {
  const { data: threads = [] } = trpc.comments.list.useQuery(
    { pageId },
    { enabled },
  );

  // Extract inline comments (those with inlineRef containing from/to)
  const inlineComments = useMemo<InlineComment[]>(() => {
    return threads
      .filter((t) => {
        const ref = t.inlineRef as InlineRef | null;
        return (
          ref && typeof ref.from === "number" && typeof ref.to === "number"
        );
      })
      .map((t) => {
        const ref = t.inlineRef as InlineRef;
        return {
          commentId: t.id,
          from: ref.from!,
          to: ref.to!,
          text: ref.text ?? "",
          isResolved: t.isResolved,
        };
      });
  }, [threads]);

  // Push decoration data into the ProseMirror plugin whenever comments change
  useEffect(() => {
    if (!editor || !editor.view || inlineComments.length === 0) return;

    const { tr } = editor.state;
    tr.setMeta(inlineCommentPluginKey, inlineComments);
    editor.view.dispatch(tr);
  }, [editor, inlineComments]);

  return { inlineComments, threads };
}
