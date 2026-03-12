"use client";

import { Trash2 } from "lucide-react";

export function TrashSection() {
  return (
    <div className="border-t border-[var(--border-default)] px-[10px] py-[6px]">
      <button className="flex h-[30px] w-full items-center gap-2 rounded px-[10px] text-[13.5px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]">
        <Trash2 size={16} />
        <span>ゴミ箱</span>
      </button>
    </div>
  );
}
