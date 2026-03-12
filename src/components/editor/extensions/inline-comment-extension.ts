"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface InlineComment {
  commentId: string;
  from: number;
  to: number;
  text: string;
  isResolved: boolean;
}

export const inlineCommentPluginKey = new PluginKey("inlineComment");

/**
 * Extension that renders highlighted decorations over text ranges
 * that have inline comments attached. Comments data is supplied
 * externally via `setInlineComments` transaction metadata.
 */
export const InlineCommentExtension = Extension.create({
  name: "inlineComment",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: inlineCommentPluginKey,
        state: {
          init() {
            return {
              comments: [] as InlineComment[],
              decorations: DecorationSet.empty,
            };
          },
          apply(tr, value, _oldState, newState) {
            const meta = tr.getMeta(inlineCommentPluginKey) as
              | InlineComment[]
              | undefined;

            const comments = meta ?? value.comments;

            // Rebuild decorations from comments
            const decorations: Decoration[] = [];
            for (const c of comments) {
              if (c.isResolved) continue;
              if (c.from < 0 || c.to > newState.doc.content.size) continue;
              if (c.from >= c.to) continue;

              decorations.push(
                Decoration.inline(c.from, c.to, {
                  class: "inline-comment-highlight",
                  "data-comment-id": c.commentId,
                }),
              );
            }

            return {
              comments,
              decorations: DecorationSet.create(newState.doc, decorations),
            };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
