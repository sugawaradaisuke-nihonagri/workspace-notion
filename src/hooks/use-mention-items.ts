"use client";

import { useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import type { MentionItem } from "@/components/editor/extensions/mention-extension";

/**
 * Provides a search function for @mention candidates.
 * Combines workspace members (users) and workspace pages into a single list.
 */
export function useMentionItems(workspaceId: string | undefined) {
  const { data: members } = trpc.workspace.members.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId, staleTime: 30_000 },
  );

  const { data: pageList } = trpc.pages.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId, staleTime: 30_000 },
  );

  // Pre-build the full list of mention candidates
  const allItems = useMemo<MentionItem[]>(() => {
    const userItems: MentionItem[] = (members ?? []).map((m) => ({
      id: m.userId,
      label: m.userName,
      type: "user" as const,
      image: m.userImage,
    }));

    const pageItems: MentionItem[] = (pageList ?? [])
      .filter((p) => p.type !== "database_row")
      .map((p) => ({
        id: p.id,
        label: p.title,
        type: "page" as const,
        icon: p.icon,
      }));

    return [...userItems, ...pageItems];
  }, [members, pageList]);

  // Search function used by the Suggestion plugin
  const getMentionItems = useCallback(
    (query: string): MentionItem[] => {
      if (!query) return allItems.slice(0, 10);

      const q = query.toLowerCase();
      return allItems
        .filter((item) => item.label.toLowerCase().includes(q))
        .slice(0, 10);
    },
    [allItems],
  );

  return getMentionItems;
}
