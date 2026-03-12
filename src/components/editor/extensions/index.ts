"use client";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

import { CalloutExtension } from "./callout-extension";
import { ToggleExtension } from "./toggle-extension";
import { DividerExtension } from "./divider-extension";
import { SlashCommandExtension } from "./slash-command";
import { BlockColorExtension } from "./block-color";
import { KeyboardShortcutsExtension } from "./keyboard-shortcuts";

const lowlight = createLowlight(common);

export function getEditorExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      // StarterKit includes its own codeBlock — disable in favor of CodeBlockLowlight
      codeBlock: false,
      // StarterKit includes its own horizontalRule — disable in favor of DividerExtension
      horizontalRule: false,
    }),

    Placeholder.configure({
      placeholder: "「/」でコマンド入力…",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
    }),

    Underline,

    Highlight.configure({
      multicolor: true,
    }),

    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        class: "editor-link",
      },
    }),

    TaskList.configure({
      HTMLAttributes: {
        class: "editor-task-list",
      },
    }),

    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "editor-task-item",
      },
    }),

    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: "plaintext",
      HTMLAttributes: {
        class: "editor-code-block",
      },
    }),

    CalloutExtension,
    ToggleExtension,
    DividerExtension,
    SlashCommandExtension,
    BlockColorExtension,
    KeyboardShortcutsExtension,
  ];
}

export {
  CalloutExtension,
  ToggleExtension,
  DividerExtension,
  SlashCommandExtension,
  BlockColorExtension,
  KeyboardShortcutsExtension,
};
