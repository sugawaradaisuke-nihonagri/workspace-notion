"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import type { SortRule } from "@/types/database";

interface SortBarProps {
  properties: {
    id: string;
    name: string;
    type: string;
  }[];
  sorts: SortRule[];
  onChange: (sorts: SortRule[]) => void;
}

export function SortBar({ properties, sorts, onChange }: SortBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  function addSort(): void {
    if (properties.length === 0) return;
    // 未使用のプロパティを優先
    const usedIds = new Set(sorts.map((s) => s.propertyId));
    const available = properties.find((p) => !usedIds.has(p.id));
    const target = available ?? properties[0];
    onChange([...sorts, { propertyId: target.id, direction: "asc" }]);
  }

  function updateSort(index: number, updates: Partial<SortRule>): void {
    const newSorts = sorts.map((s, i) =>
      i === index ? { ...s, ...updates } : s,
    );
    onChange(newSorts);
  }

  function removeSort(index: number): void {
    onChange(sorts.filter((_, i) => i !== index));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
        data-active={sorts.length > 0 || undefined}
      >
        <ArrowUpDown size={14} />
        ソート
        {sorts.length > 0 && (
          <span className="rounded-full bg-[var(--accent-blue)] px-1.5 text-[10px] text-white">
            {sorts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[340px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="p-3">
            <div className="mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              ソート順
            </div>

            {sorts.length === 0 ? (
              <div className="py-3 text-center text-[12px] text-[var(--text-tertiary)]">
                ソートなし
              </div>
            ) : (
              <div className="space-y-2">
                {sorts.map((sort, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {/* Property selector */}
                    <select
                      value={sort.propertyId}
                      onChange={(e) =>
                        updateSort(i, { propertyId: e.target.value })
                      }
                      className="min-w-[120px] flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {/* Direction toggle */}
                    <button
                      onClick={() =>
                        updateSort(i, {
                          direction: sort.direction === "asc" ? "desc" : "asc",
                        })
                      }
                      className="flex items-center gap-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[12px] text-[var(--text-primary)]"
                    >
                      {sort.direction === "asc" ? (
                        <>
                          <ArrowUp size={12} />
                          昇順
                        </>
                      ) : (
                        <>
                          <ArrowDown size={12} />
                          降順
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => removeSort(i)}
                      className="shrink-0 rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={addSort}
              className="mt-2 flex items-center gap-1 text-[12px] text-[var(--accent-blue)] hover:underline"
            >
              <Plus size={12} />
              ソートを追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
