"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc/client";
import { motion, AnimatePresence } from "framer-motion";

interface PageNode {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  type: "page" | "database" | "database_row";
  position: string;
}

interface PageTreeItemProps {
  page: PageNode;
  depth: number;
  childrenMap: Map<string | null, PageNode[]>;
  workspaceId: string;
}

export function PageTreeItem({
  page,
  depth,
  childrenMap,
  workspaceId,
}: PageTreeItemProps) {
  const router = useRouter();
  const params = useParams();
  const activePageId = params.pageId as string | undefined;
  const isActive = activePageId === page.id;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const children = childrenMap.get(page.id) ?? [];
  const hasChildren = children.length > 0;

  const utils = trpc.useUtils();
  const createPage = trpc.pages.create.useMutation({
    onMutate: async (input) => {
      await utils.pages.list.cancel({ workspaceId });
      const previousList = utils.pages.list.getData({ workspaceId });

      const optimisticPage = {
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId,
        parentId: input.parentId ?? null,
        title: input.title ?? "Untitled",
        icon: input.icon ?? "📄",
        type: input.type ?? ("page" as const),
        position: "z",
        coverUrl: null,
        databaseId: null,
        isDeleted: false,
        deletedAt: null,
        createdBy: "",
        lastEditedBy: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      utils.pages.list.setData({ workspaceId }, (old) =>
        old ? [...old, optimisticPage] : [optimisticPage],
      );

      return { previousList };
    },
    onSuccess: (newPage) => {
      router.push(`/${workspaceId}/${newPage.id}`);
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  function handleClick(): void {
    router.push(`/${workspaceId}/${page.id}`);
  }

  function handleToggle(e: React.MouseEvent): void {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }

  function handleCreateSubpage(e: React.MouseEvent): void {
    e.stopPropagation();
    setIsExpanded(true);
    createPage.mutate({
      workspaceId,
      parentId: page.id,
      title: "Untitled",
    });
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="group/item flex h-[30px] cursor-pointer items-center pr-[4px]"
        style={{ paddingLeft: `${10 + depth * 18}px` }}
        data-active={isActive || undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        {...attributes}
        {...listeners}
      >
        {/* 展開矢印 */}
        <button
          onClick={handleToggle}
          className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          <ChevronRight
            size={10}
            className="transition-transform duration-150"
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {/* アイコン */}
        <span className="mr-[6px] text-[16px] leading-none">
          {page.icon ?? "📄"}
        </span>

        {/* タイトル */}
        <span
          className="flex-1 truncate text-[13.5px] text-[var(--text-primary)]"
          style={{
            fontWeight: isActive ? 600 : 400,
          }}
        >
          {page.title}
        </span>

        {/* DB バッジ */}
        {page.type === "database" && (
          <span className="mr-1 shrink-0 rounded bg-[var(--accent-blue-bg)] px-1 text-[10px] font-medium text-[var(--accent-blue)]">
            DB
          </span>
        )}

        {/* ホバーアクション */}
        {isHovered && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: コンテキストメニュー
              }}
              className="flex h-[20px] w-[20px] items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            >
              <MoreHorizontal size={14} />
            </button>
            <button
              onClick={handleCreateSubpage}
              className="flex h-[20px] w-[20px] items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 子ページ */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <PageTreeItem
                key={child.id}
                page={child}
                depth={depth + 1}
                childrenMap={childrenMap}
                workspaceId={workspaceId}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
