"use client";

import { ChevronsLeft } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";

interface WorkspaceHeaderProps {
  name: string;
  icon: string;
}

export function WorkspaceHeader({ name, icon }: WorkspaceHeaderProps) {
  const close = useSidebarStore((s) => s.close);

  return (
    <div className="flex h-[40px] items-center justify-between px-[10px]">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-[18px] leading-none">{icon}</span>
        <span className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
          {name}
        </span>
      </div>
      <button
        onClick={close}
        className="flex h-[20px] w-[20px] items-center justify-center rounded text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover/sidebar:opacity-100 hover:bg-[var(--bg-hover)]"
        aria-label="サイドバーを閉じる"
      >
        <ChevronsLeft size={14} />
      </button>
    </div>
  );
}
