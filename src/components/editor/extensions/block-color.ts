"use client";

import { Extension } from "@tiptap/core";

export const BLOCK_COLORS = [
  { id: "default", label: "デフォルト", var: null },
  { id: "red", label: "赤", var: "--block-red" },
  { id: "orange", label: "オレンジ", var: "--block-orange" },
  { id: "yellow", label: "黄", var: "--block-yellow" },
  { id: "green", label: "緑", var: "--block-green" },
  { id: "blue", label: "青", var: "--block-blue" },
  { id: "purple", label: "紫", var: "--block-purple" },
  { id: "pink", label: "ピンク", var: "--block-pink" },
  { id: "brown", label: "茶", var: "--block-brown" },
  { id: "gray", label: "グレー", var: "--block-gray" },
] as const;

export type BlockColorId = (typeof BLOCK_COLORS)[number]["id"];

/**
 * Adds a `blockColor` attribute to all major block node types.
 * Renders as data-block-color + inline background style.
 */
export const BlockColorExtension = Extension.create({
  name: "blockColor",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "taskList",
          "blockquote",
          "codeBlock",
          "callout",
          "toggleBlock",
        ],
        attributes: {
          blockColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-color"),
            renderHTML: (attributes) => {
              if (!attributes.blockColor || attributes.blockColor === "default")
                return {};
              return {
                "data-block-color": attributes.blockColor,
                style: `background-color: var(--block-${attributes.blockColor}); border-radius: var(--radius-sm); padding: 2px 4px;`,
              };
            },
          },
        },
      },
    ];
  },
});
