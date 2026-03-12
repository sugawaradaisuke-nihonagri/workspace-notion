"use client";

import { type Editor, ReactRenderer } from "@tiptap/react";
import Mention, { type MentionNodeAttrs } from "@tiptap/extension-mention";
import type {
  SuggestionProps,
  SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import type { MentionMenuRef } from "../menus/MentionMenu";

export interface MentionItem {
  id: string;
  label: string;
  type: "user" | "page";
  icon?: string | null;
  image?: string | null;
}

function mentionSuggestionRender() {
  let component: ReactRenderer<MentionMenuRef> | null = null;

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStart: (props: SuggestionProps<any>) => {
      const { MentionMenu } = require("../menus/MentionMenu");
      component = new ReactRenderer(MentionMenu, {
        props,
        editor: props.editor,
      });

      const el = component.element;
      if (el) {
        document.body.appendChild(el);
      }

      updatePosition(props, component);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate: (props: SuggestionProps<any>) => {
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updatePosition(
  props: SuggestionProps<any>,
  component: ReactRenderer<MentionMenuRef>,
) {
  const rect = props.clientRect?.();
  if (!rect || !component.element) return;

  const el = component.element as HTMLElement;
  el.style.position = "fixed";
  el.style.zIndex = "50";
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
}

/**
 * Base Mention extension — triggered by `@`.
 * Use `createMentionExtension()` to inject a custom items fetcher.
 */
export const MentionExtension = Mention.configure({
  HTMLAttributes: {
    class: "mention",
  },
  renderHTML({ options, node }) {
    return [
      "span",
      options.HTMLAttributes,
      `@${node.attrs.label ?? node.attrs.id}`,
    ];
  },
  suggestion: {
    char: "@",
    allowSpaces: true,
    items: () => [],
    command: ({
      editor,
      range,
      props,
    }: {
      editor: Editor;
      range: { from: number; to: number };
      props: MentionNodeAttrs;
    }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: {
              id: props.id,
              label: props.label,
            },
          },
          { type: "text", text: " " },
        ])
        .run();
    },
    render: mentionSuggestionRender,
  },
});

/**
 * Create a configured Mention extension with a custom items fetcher.
 * This allows the extension to query workspace-specific data.
 */
export function createMentionExtension(
  getItems: (query: string) => MentionItem[] | Promise<MentionItem[]>,
) {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention",
    },
    renderHTML({ options, node }) {
      return [
        "span",
        options.HTMLAttributes,
        `@${node.attrs.label ?? node.attrs.id}`,
      ];
    },
    suggestion: {
      char: "@",
      allowSpaces: true,
      items: ({ query }: { query: string }) => getItems(query),
      command: ({
        editor,
        range,
        props,
      }: {
        editor: Editor;
        range: { from: number; to: number };
        props: MentionNodeAttrs;
      }) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: {
                id: props.id,
                label: props.label,
              },
            },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: mentionSuggestionRender,
    },
  });
}
