"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { trpc } from "@/lib/trpc/client";
import { PageTreeItem } from "./page-tree-item";

interface PageTreeProps {
  workspaceId: string;
}

export function PageTree({ workspaceId }: PageTreeProps) {
  const { data: pages, isLoading } = trpc.pages.list.useQuery({
    workspaceId,
  });

  const utils = trpc.useUtils();
  const reorderPage = trpc.pages.reorder.useMutation({
    onMutate: async (input) => {
      await utils.pages.list.cancel({ workspaceId });
      const previousList = utils.pages.list.getData({ workspaceId });

      // Optimistically move the page in the list
      utils.pages.list.setData({ workspaceId }, (old) => {
        if (!old) return old;
        const list = [...old];
        const activeIdx = list.findIndex((p) => p.id === input.pageId);
        if (activeIdx === -1) return list;

        const [moved] = list.splice(activeIdx, 1);
        moved.parentId = input.parentId;

        if (input.afterPageId === null) {
          // Move to beginning of siblings
          list.unshift(moved);
        } else {
          const afterIdx = list.findIndex((p) => p.id === input.afterPageId);
          list.splice(afterIdx + 1, 0, moved);
        }
        return list;
      });

      return { previousList };
    },
    onError: (_err, _input, context) => {
      if (context?.previousList) {
        utils.pages.list.setData({ workspaceId }, context.previousList);
      }
    },
    onSettled: () => {
      utils.pages.list.invalidate({ workspaceId });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // parentId → children のマップを構築
  const { rootPages, childrenMap } = useMemo(() => {
    if (!pages) return { rootPages: [], childrenMap: new Map() };

    const map = new Map<string | null, typeof pages>();
    for (const page of pages) {
      const key = page.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(page);
    }

    return {
      rootPages: map.get(null) ?? [],
      childrenMap: map,
    };
  }, [pages]);

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // over の前に active を配置
    const activePage = pages?.find((p) => p.id === activeId);
    const overPage = pages?.find((p) => p.id === overId);
    if (!activePage || !overPage) return;

    reorderPage.mutate({
      pageId: activeId,
      afterPageId: overId,
      parentId: overPage.parentId,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-1 px-[10px] py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[30px] animate-pulse rounded bg-[var(--bg-hover)]"
          />
        ))}
      </div>
    );
  }

  if (rootPages.length === 0) {
    return (
      <div className="px-[10px] py-4 text-center text-[12px] text-[var(--text-tertiary)]">
        ページがありません
      </div>
    );
  }

  const allPageIds = pages?.map((p) => p.id) ?? [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={allPageIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="py-1">
          {rootPages.map((page) => (
            <PageTreeItem
              key={page.id}
              page={page}
              depth={0}
              childrenMap={childrenMap}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
