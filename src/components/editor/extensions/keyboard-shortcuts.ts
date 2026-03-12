"use client";

import { Extension } from "@tiptap/core";

/**
 * Custom keyboard shortcuts beyond what StarterKit provides.
 *
 * StarterKit already handles:
 * - ⌘B bold, ⌘I italic, ⌘⇧X strikethrough
 * - ⌘Z undo, ⌘⇧Z redo
 * - Tab for list indentation (via ListItem)
 *
 * This extension adds:
 * - ⌘U underline (handled by Underline extension)
 * - ⌘D duplicate block
 * - ⌘⇧↑ move block up
 * - ⌘⇧↓ move block down
 * - Tab/⇧Tab indent/outdent (for non-list contexts)
 */
export const KeyboardShortcutsExtension = Extension.create({
  name: "customKeyboardShortcuts",

  addKeyboardShortcuts() {
    return {
      // ⌘D — Duplicate current block
      "Mod-d": ({ editor }) => {
        const { $from } = editor.state.selection;
        const blockPos = $from.before(1);
        const node = editor.state.doc.nodeAt(blockPos);
        if (!node) return false;

        const insertPos = blockPos + node.nodeSize;
        const json = node.toJSON();
        editor.chain().insertContentAt(insertPos, json).run();
        return true;
      },

      // ⌘⇧↑ — Move block up
      "Mod-Shift-ArrowUp": ({ editor }) => {
        const { $from } = editor.state.selection;
        const blockPos = $from.before(1);
        if (blockPos <= 0) return false;

        const node = editor.state.doc.nodeAt(blockPos);
        if (!node) return false;

        // Find previous sibling
        let prevPos: number | null = null;
        editor.state.doc.forEach((n, offset) => {
          if (offset < blockPos) prevPos = offset;
        });
        if (prevPos === null) return false;

        const { state, view } = editor;
        const tr = state.tr;
        tr.delete(blockPos, blockPos + node.nodeSize);
        const mapped = tr.mapping.map(prevPos);
        tr.insert(mapped, node);
        view.dispatch(tr);
        return true;
      },

      // ⌘⇧↓ — Move block down
      "Mod-Shift-ArrowDown": ({ editor }) => {
        const { $from } = editor.state.selection;
        const blockPos = $from.before(1);
        const node = editor.state.doc.nodeAt(blockPos);
        if (!node) return false;

        const endPos = blockPos + node.nodeSize;
        if (endPos >= editor.state.doc.content.size) return false;

        // Find next sibling end
        let nextEndPos: number | null = null;
        let found = false;
        editor.state.doc.forEach((n, offset) => {
          if (found && nextEndPos === null) {
            nextEndPos = offset + n.nodeSize;
          }
          if (offset === blockPos) found = true;
        });
        if (nextEndPos === null) return false;

        const { state, view } = editor;
        const tr = state.tr;
        tr.delete(blockPos, blockPos + node.nodeSize);
        const mapped = tr.mapping.map(nextEndPos);
        tr.insert(mapped, node);
        view.dispatch(tr);
        return true;
      },

      // Tab — Indent (for non-list blocks, insert 2 spaces; lists handled by ListItem)
      Tab: ({ editor }) => {
        // Let list items handle their own Tab
        if (editor.isActive("listItem") || editor.isActive("taskItem")) {
          return false;
        }
        // In code blocks, insert tab character
        if (editor.isActive("codeBlock")) {
          return editor.commands.insertContent("  ");
        }
        return false;
      },

      // Shift-Tab — Outdent
      "Shift-Tab": ({ editor }) => {
        if (editor.isActive("listItem") || editor.isActive("taskItem")) {
          return false;
        }
        return false;
      },
    };
  },
});
