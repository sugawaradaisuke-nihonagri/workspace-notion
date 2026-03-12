"use client";

import { useRouter } from "next/navigation";
import { ChevronsRight } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { trpc } from "@/lib/trpc/client";

interface CollapsedSidebarProps {
  workspaceId: string;
  workspaceIcon: string;
}

export function CollapsedSidebar({
  workspaceId,
  workspaceIcon,
}: CollapsedSidebarProps) {
  const open = useSidebarStore((s) => s.open);
  const router = useRouter();

  const { data: pages } = trpc.pages.list.useQuery({ workspaceId });
  const rootPages = pages?.filter((p) => !p.parentId) ?? [];

  return (
    <div className="flex h-full w-[44px] flex-col items-center border-r border-[var(--border-default)] bg-[var(--bg-secondary)] py-2">
      {/* 展開ボタン */}
      <button
        onClick={open}
        className="mb-2 flex h-[28px] w-[28px] items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
        aria-label="サイドバーを開く"
      >
        <ChevronsRight size={16} />
      </button>

      {/* ワークスペースアイコン */}
      <button
        onClick={() => router.push(`/${workspaceId}`)}
        className="mb-2 flex h-[28px] w-[28px] items-center justify-center rounded text-[18px] hover:bg-[var(--bg-hover)]"
      >
        {workspaceIcon}
      </button>

      {/* 区切り線 */}
      <div className="mx-auto mb-2 h-px w-[24px] bg-[var(--border-default)]" />

      {/* ルートページアイコン */}
      <div className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto">
        {rootPages.slice(0, 15).map((page) => (
          <button
            key={page.id}
            onClick={() => router.push(`/${workspaceId}/${page.id}`)}
            className="flex h-[28px] w-[28px] items-center justify-center rounded text-[16px] hover:bg-[var(--bg-hover)]"
            title={page.title}
          >
            {page.icon ?? "📄"}
          </button>
        ))}
      </div>
    </div>
  );
}
