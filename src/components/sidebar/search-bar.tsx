"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  onOpen: () => void;
}

export function SearchBar({ onOpen }: SearchBarProps) {
  return (
    <button
      onClick={onOpen}
      className="mx-[10px] flex h-[30px] items-center gap-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-hover)] px-[10px] text-[13px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-active)]"
    >
      <Search size={14} />
      <span className="flex-1 text-left">検索</span>
      <kbd className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)]">
        ⌘K
      </kbd>
    </button>
  );
}
