"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MediaBlockView } from "../blocks/media-block-view";

export type MediaType = "video" | "audio" | "file" | "bookmark" | "embed";

export interface MediaBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mediaBlock: {
      setMediaBlock: (attrs: {
        mediaType: MediaType;
        src?: string;
        name?: string;
        size?: number;
        mimeType?: string;
        caption?: string;
        /** Bookmark metadata */
        title?: string;
        description?: string;
        image?: string;
      }) => ReturnType;
    };
  }
}

export const MediaBlockExtension = Node.create<MediaBlockOptions>({
  name: "mediaBlock",

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
      mediaType: { default: "file" },
      src: { default: null },
      name: { default: null },
      size: { default: null },
      mimeType: { default: null },
      caption: { default: "" },
      // Bookmark/embed metadata
      title: { default: null },
      description: { default: null },
      image: { default: null },
      uploading: {
        default: false,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="media-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "media-block",
        "data-media-type": HTMLAttributes.mediaType,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaBlockView);
  },

  addCommands() {
    return {
      setMediaBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
