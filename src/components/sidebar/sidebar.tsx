"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useSearchStore } from "@/stores/search-store";
import { trpc } from "@/lib/trpc/client";
import { WorkspaceHeader } from "./workspace-header";
import { SearchBar } from "./search-bar";
import { SectionLabel } from "./section-label";
import { PageTree } from "./page-tree";
import { TrashSection } from "./trash-section";
import { CollapsedSidebar } from "./collapsed-sidebar";

interface SidebarProps {
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string;
}

export function Sidebar({
  workspaceId,
  workspaceName,
  workspaceIcon,
}: SidebarProps) {
  const isOpen = useSidebarStore((s) => s.isOpen);
  const router = useRouter();

  const utils = trpc.useUtils();
  const createPage = trpc.pages.create.useMutation({
    onSuccess: (newPage) => {
      utils.pages.list.invalidate({ workspaceId });
      router.push(`/${workspaceId}/${newPage.id}`);
    },
  });

  function handleNewPage(): void {
    createPage.mutate({ workspaceId, title: "Untitled" });
  }

  function handleSearchOpen(): void {
    useSearchStore.getState().open();
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.aside
          key="expanded"
          initial={{ width: 44 }}
          animate={{ width: 260 }}
          exit={{ width: 44 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="group/sidebar flex h-screen shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)]"
        >
          {/* ヘッダー */}
          <WorkspaceHeader name={workspaceName} icon={workspaceIcon} />

          {/* 検索バー */}
          <div className="py-1">
            <SearchBar onOpen={handleSearchOpen} />
          </div>

          {/* ページツリー */}
          <div className="flex-1 overflow-y-auto">
            <SectionLabel label="ページ" />
            <PageTree workspaceId={workspaceId} />
          </div>

          {/* 新規ページ作成ボタン */}
          <div className="border-t border-[var(--border-default)] px-[10px] py-[6px]">
            <button
              onClick={handleNewPage}
              disabled={createPage.isPending}
              className="flex h-[30px] w-full items-center gap-2 rounded px-[10px] text-[13.5px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              <Plus size={16} />
              <span>新規ページ</span>
            </button>
          </div>

          {/* ゴミ箱 */}
          <TrashSection />
        </motion.aside>
      ) : (
        <motion.div
          key="collapsed"
          initial={{ width: 260 }}
          animate={{ width: 44 }}
          exit={{ width: 260 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0"
        >
          <CollapsedSidebar
            workspaceId={workspaceId}
            workspaceIcon={workspaceIcon}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
