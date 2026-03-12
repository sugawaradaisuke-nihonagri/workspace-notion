"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUpRight, Link2, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { RelationConfig } from "@/types/database";

interface RelationCellProps {
  value: string[];
  onChange: (value: string[]) => void;
  config: Record<string, unknown>;
}

export function RelationCell({ value, onChange, config }: RelationCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const relationConfig = config as unknown as RelationConfig;
  const targetDbId = relationConfig?.databaseId;

  // Fetch rows from the target database
  const { data: targetData } = trpc.dbRows.list.useQuery(
    { databaseId: targetDbId! },
    { enabled: !!targetDbId && isOpen, staleTime: 30_000 },
  );

  const targetRows = targetData?.rows ?? [];

  // Build a title map for displaying selected relation names
  const { data: preloadData } = trpc.dbRows.list.useQuery(
    { databaseId: targetDbId! },
    { enabled: !!targetDbId && value.length > 0, staleTime: 30_000 },
  );

  const titleMap = new Map(
    (preloadData?.rows ?? targetRows).map((r) => [r.id, r.title]),
  );

  // Filter by search
  const filtered = targetRows.filter(
    (r) =>
      search.length === 0 ||
      r.title.toLowerCase().includes(search.toLowerCase()),
  );

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleToggle = useCallback(
    (rowId: string) => {
      if (value.includes(rowId)) {
        onChange(value.filter((v) => v !== rowId));
      } else {
        onChange([...value, rowId]);
      }
    },
    [value, onChange],
  );

  const handleRemove = useCallback(
    (rowId: string) => {
      onChange(value.filter((v) => v !== rowId));
    },
    [value, onChange],
  );

  if (!targetDbId) {
    return (
      <div className="px-2 py-1 text-[12px] text-[var(--text-tertiary)]">
        リレーション先を設定してください
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="flex w-full items-center gap-1 px-2 py-1 text-[13px]"
      >
        {value.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {value.map((rowId) => (
              <span
                key={rowId}
                className="group inline-flex items-center gap-0.5 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[12px] text-[var(--accent-blue)]"
              >
                <Link2 size={10} className="shrink-0 opacity-60" />
                <span className="truncate" style={{ maxWidth: 120 }}>
                  {titleMap.get(rowId) ?? "…"}
                </span>
                <X
                  size={10}
                  className="hidden shrink-0 cursor-pointer opacity-60 hover:opacity-100 group-hover:inline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(rowId);
                  }}
                />
              </span>
            ))}
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
            <Link2 size={12} />空
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[260px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="p-1.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="行を検索…"
              className="w-full rounded bg-[var(--bg-secondary)] px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              autoFocus
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto px-1 pb-1">
            {filtered.length > 0 ? (
              filtered.map((row) => {
                const isSelected = value.includes(row.id);
                return (
                  <button
                    key={row.id}
                    onClick={() => handleToggle(row.id)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]"
                  >
                    <span className="shrink-0 text-[14px]">
                      {row.icon ?? "📄"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-[var(--text-primary)]">
                      {row.title || "Untitled"}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 text-[11px] text-[var(--accent-blue)]">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-3 text-center text-[12px] text-[var(--text-tertiary)]">
                {targetRows.length === 0
                  ? "行を読み込み中…"
                  : "一致する行はありません"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
