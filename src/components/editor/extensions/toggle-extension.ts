"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ToggleView } from "../blocks/toggle-view";

export interface ToggleOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggle: () => ReturnType;
    };
  }
}

export const ToggleExtension = Node.create<ToggleOptions>({
  name: "toggleBlock",

  group: "block",

  content: "block+",

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      isOpen: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") === "true",
        renderHTML: (attributes) => ({
          "data-open": attributes.isOpen ? "true" : "false",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "toggle",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { isOpen: true },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
