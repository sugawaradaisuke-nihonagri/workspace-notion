"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, Plus, X } from "lucide-react";
import type { FilterCondition, PropertyType } from "@/types/database";
import { PROPERTY_TYPE_LABELS } from "@/types/database";

interface FilterBarProps {
  properties: {
    id: string;
    name: string;
    type: string;
  }[];
  filters: FilterCondition[];
  onChange: (filters: FilterCondition[]) => void;
}

const OPERATORS: Record<string, { label: string; needsValue: boolean }> = {
  equals: { label: "が次と一致", needsValue: true },
  contains: { label: "を含む", needsValue: true },
  is_empty: { label: "が空", needsValue: false },
  is_not_empty: { label: "が空でない", needsValue: false },
};

export function FilterBar({ properties, filters, onChange }: FilterBarProps) {
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

  function addFilter(): void {
    if (properties.length === 0) return;
    const newFilter: FilterCondition = {
      propertyId: properties[0].id,
      operator: "is_not_empty",
    };
    onChange([...filters, newFilter]);
  }

  function updateFilter(
    index: number,
    updates: Partial<FilterCondition>,
  ): void {
    const newFilters = filters.map((f, i) =>
      i === index ? { ...f, ...updates } : f,
    );
    onChange(newFilters);
  }

  function removeFilter(index: number): void {
    onChange(filters.filter((_, i) => i !== index));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
        data-active={filters.length > 0 || undefined}
      >
        <Filter size={14} />
        フィルター
        {filters.length > 0 && (
          <span className="rounded-full bg-[var(--accent-blue)] px-1.5 text-[10px] text-white">
            {filters.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[420px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="p-3">
            <div className="mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">
              フィルター条件
            </div>

            {filters.length === 0 ? (
              <div className="py-3 text-center text-[12px] text-[var(--text-tertiary)]">
                フィルターなし
              </div>
            ) : (
              <div className="space-y-2">
                {filters.map((filter, i) => {
                  const operator =
                    OPERATORS[filter.operator] ?? OPERATORS.equals;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      {/* Property selector */}
                      <select
                        value={filter.propertyId}
                        onChange={(e) =>
                          updateFilter(i, { propertyId: e.target.value })
                        }
                        className="min-w-[100px] rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                      >
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      {/* Operator selector */}
                      <select
                        value={filter.operator}
                        onChange={(e) =>
                          updateFilter(i, { operator: e.target.value })
                        }
                        className="min-w-[100px] rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                      >
                        {Object.entries(OPERATORS).map(([key, { label }]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>

                      {/* Value input */}
                      {operator.needsValue && (
                        <input
                          value={
                            filter.value != null ? String(filter.value) : ""
                          }
                          onChange={(e) =>
                            updateFilter(i, { value: e.target.value })
                          }
                          className="min-w-[80px] flex-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                          placeholder="値"
                        />
                      )}

                      <button
                        onClick={() => removeFilter(i)}
                        className="shrink-0 rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={addFilter}
              className="mt-2 flex items-center gap-1 text-[12px] text-[var(--accent-blue)] hover:underline"
            >
              <Plus size={12} />
              フィルターを追加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
