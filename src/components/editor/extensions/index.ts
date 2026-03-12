"use client";

import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { common, createLowlight } from "lowlight";
import type * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";

import { CalloutExtension } from "./callout-extension";
import { ToggleExtension } from "./toggle-extension";
import { DividerExtension } from "./divider-extension";
import { ImageBlockExtension } from "./image-extension";
import { MediaBlockExtension } from "./media-block-extension";
import { SlashCommandExtension } from "./slash-command";
import { BlockColorExtension } from "./block-color";
import { KeyboardShortcutsExtension } from "./keyboard-shortcuts";
import {
  MentionExtension,
  createMentionExtension,
  type MentionItem,
} from "./mention-extension";

const lowlight = createLowlight(common);

interface CollabOptions {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: { name: string; color: string; colorLight: string };
}

interface MentionOptions {
  getMentionItems: (query: string) => MentionItem[] | Promise<MentionItem[]>;
}

export function getEditorExtensions(
  collab?: CollabOptions,
  mention?: MentionOptions,
) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      // StarterKit includes its own codeBlock — disable in favor of CodeBlockLowlight
      codeBlock: false,
      // StarterKit includes its own horizontalRule — disable in favor of DividerExtension
      horizontalRule: false,
      // When collaborative, Yjs handles history (undo/redo)
      ...(collab ? { history: false } : {}),
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
    ImageBlockExtension,
    MediaBlockExtension,
    SlashCommandExtension,
    BlockColorExtension,
    KeyboardShortcutsExtension,

    // --- @Mention extension ---
    mention?.getMentionItems
      ? createMentionExtension(mention.getMentionItems)
      : MentionExtension,

    // --- Collaboration extensions (only when provider is available) ---
    ...(collab
      ? [
          Collaboration.configure({
            document: collab.ydoc,
          }),
          CollaborationCursor.configure({
            provider: collab.provider,
            user: collab.user,
          }),
        ]
      : []),
  ];
}

export {
  CalloutExtension,
  ToggleExtension,
  DividerExtension,
  ImageBlockExtension,
  MediaBlockExtension,
  SlashCommandExtension,
  BlockColorExtension,
  KeyboardShortcutsExtension,
  MentionExtension,
  createMentionExtension,
};
