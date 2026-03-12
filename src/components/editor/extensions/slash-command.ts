"use client";

import { Extension } from "@tiptap/core";
import { type Editor, ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import type { SlashMenuRef } from "../menus/SlashMenu";

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "basic" | "media" | "advanced";
  aliases: string[];
  command: (editor: Editor, range: { from: number; to: number }) => void;
}

export const SLASH_ITEMS: SlashCommandItem[] = [
  // --- 基本ブロック ---
  {
    id: "paragraph",
    label: "テキスト",
    description: "プレーンテキスト",
    icon: "Aa",
    category: "basic",
    aliases: ["text", "paragraph", "plain"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: "heading1",
    label: "見出し1",
    description: "大見出し",
    icon: "H₁",
    category: "basic",
    aliases: ["heading1", "h1", "title"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: "heading2",
    label: "見出し2",
    description: "中見出し",
    icon: "H₂",
    category: "basic",
    aliases: ["heading2", "h2", "subtitle"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: "heading3",
    label: "見出し3",
    description: "小見出し",
    icon: "H₃",
    category: "basic",
    aliases: ["heading3", "h3"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: "todo",
    label: "To-doリスト",
    description: "チェックリスト",
    icon: "☑",
    category: "basic",
    aliases: ["todo", "task", "checkbox", "checklist"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "bullet",
    label: "箇条書き",
    description: "シンプルなリスト",
    icon: "•",
    category: "basic",
    aliases: ["bullet", "list", "unordered"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "numbered",
    label: "番号付きリスト",
    description: "順番のあるリスト",
    icon: "1.",
    category: "basic",
    aliases: ["numbered", "ordered", "number"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "toggle",
    label: "トグル",
    description: "折りたたみブロック",
    icon: "▸",
    category: "basic",
    aliases: ["toggle", "collapsible", "details"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setToggle().run();
    },
  },
  {
    id: "quote",
    label: "引用",
    description: "引用ブロック",
    icon: "❝",
    category: "basic",
    aliases: ["quote", "blockquote"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    id: "divider",
    label: "区切り線",
    description: "コンテンツの区切り",
    icon: "—",
    category: "basic",
    aliases: ["divider", "hr", "separator", "line"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDivider().run();
    },
  },
  {
    id: "callout",
    label: "コールアウト",
    description: "注意・メモブロック",
    icon: "💡",
    category: "basic",
    aliases: ["callout", "note", "info", "warning"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout().run();
    },
  },
  // --- メディア ---
  {
    id: "code",
    label: "コード",
    description: "コードブロック",
    icon: "⟨⟩",
    category: "media",
    aliases: ["code", "codeblock", "snippet"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    id: "image",
    label: "画像",
    description: "画像を埋め込み",
    icon: "🖼",
    category: "media",
    aliases: ["image", "img", "picture", "photo"],
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setImageBlock().run();
    },
  },
  {
    id: "video",
    label: "動画",
    description: "動画を埋め込み",
    icon: "🎬",
    category: "media",
    aliases: ["video", "movie", "film"],
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMediaBlock({ mediaType: "video" })
        .run();
    },
  },
  {
    id: "audio",
    label: "音声",
    description: "音声ファイルを埋め込み",
    icon: "🎵",
    category: "media",
    aliases: ["audio", "music", "sound"],
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMediaBlock({ mediaType: "audio" })
        .run();
    },
  },
  {
    id: "file",
    label: "ファイル",
    description: "ファイルを添付",
    icon: "📎",
    category: "media",
    aliases: ["file", "attachment", "upload"],
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMediaBlock({ mediaType: "file" })
        .run();
    },
  },
  {
    id: "bookmark",
    label: "Webブックマーク",
    description: "URLプレビューを埋め込み",
    icon: "🔗",
    category: "media",
    aliases: ["bookmark", "link", "url"],
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMediaBlock({ mediaType: "bookmark" })
        .run();
    },
  },
  {
    id: "embed",
    label: "埋め込み",
    description: "YouTube, Figma など",
    icon: "📐",
    category: "media",
    aliases: ["embed", "iframe", "youtube", "figma"],
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMediaBlock({ mediaType: "embed" })
        .run();
    },
  },
  // --- 高度 ---
  {
    id: "table",
    label: "テーブル",
    description: "シンプルなテーブル",
    icon: "▦",
    category: "advanced",
    aliases: ["table", "grid"],
    command: (editor, range) => {
      // TODO: テーブル拡張（Phase 2）
      editor.chain().focus().deleteRange(range).run();
    },
  },
  {
    id: "child_page",
    label: "子ページ",
    description: "ページ内にサブページを作成",
    icon: "📄",
    category: "advanced",
    aliases: ["page", "subpage", "child"],
    command: (editor, range) => {
      // TODO: 子ページ作成（Phase 1 Week 4）
      editor.chain().focus().deleteRange(range).run();
    },
  },
];

function filterItems(query: string): SlashCommandItem[] {
  if (!query) return SLASH_ITEMS;

  const q = query.toLowerCase();
  return SLASH_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.aliases.some((alias) => alias.includes(q)),
  );
}

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }: { query: string }) => filterItems(query),
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          props.command(editor, range);
        },
        render: () => {
          let component: ReactRenderer<SlashMenuRef> | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              const { SlashMenu } = require("../menus/SlashMenu");
              component = new ReactRenderer(SlashMenu, {
                props,
                editor: props.editor,
              });

              const el = component.element;
              if (el) {
                document.body.appendChild(el);
              }

              updatePosition(props, component);
            },

            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              if (!component) return;
              component.updateProps(props);
              updatePosition(props, component);
            },

            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (!component?.ref) return false;
              return component.ref.onKeyDown(props.event);
            },

            onExit: () => {
              if (component?.element) {
                component.element.remove();
              }
              component?.destroy();
              component = null;
            },
          };
        },
      } satisfies Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

function updatePosition(
  props: SuggestionProps<SlashCommandItem>,
  component: ReactRenderer<SlashMenuRef>,
) {
  const rect = props.clientRect?.();
  if (!rect || !component.element) return;

  const el = component.element as HTMLElement;
  el.style.position = "fixed";
  el.style.zIndex = "50";
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
}
