"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageView } from "../blocks/image-view";

export interface ImageBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attrs?: {
        src?: string;
        alt?: string;
        caption?: string;
        width?: number;
      }) => ReturnType;
    };
  }
}

export const ImageBlockExtension = Node.create<ImageBlockOptions>({
  name: "imageBlock",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          element.querySelector("img")?.getAttribute("src"),
      },
      alt: {
        default: "",
        parseHTML: (element) =>
          element.querySelector("img")?.getAttribute("alt") ?? "",
      },
      caption: {
        default: "",
        parseHTML: (element) =>
          element.querySelector("[data-caption]")?.textContent ?? "",
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const w = element.querySelector("img")?.getAttribute("width");
          return w ? parseInt(w, 10) : null;
        },
      },
      uploading: {
        default: false,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="image-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(this.options.HTMLAttributes, {
        "data-type": "image-block",
      }),
      [
        "img",
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt,
          width: HTMLAttributes.width,
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  addCommands() {
    return {
      setImageBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs?.src ?? null,
              alt: attrs?.alt ?? "",
              caption: attrs?.caption ?? "",
              width: attrs?.width ?? null,
            },
          });
        },
    };
  },
});
