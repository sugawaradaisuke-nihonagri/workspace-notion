"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { SelectOption } from "@/types/database";
import { SELECT_COLORS } from "@/types/database";

interface MultiSelectCellProps {
  value: string[];
  onChange: (value: string[]) => void;
  config: Record<string, unknown>;
}

export function MultiSelectCell({
  value,
  onChange,
  config,
}: MultiSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const options = (config?.options as SelectOption[]) ?? [];

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

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) &&
      !value.includes(o.id),
  );

  function getColorStyle(colorId: string): {
    bg: string;
    text: string;
  } {
    const color = SELECT_COLORS.find((c) => c.id === colorId);
    return color
      ? { bg: color.bg, text: color.text }
      : { bg: "var(--bg-tertiary)", text: "var(--text-secondary)" };
  }

  function handleToggle(optionId: string): void {
    if (value.includes(optionId)) {
      onChange(value.filter((v) => v !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  }

  function handleRemove(optionId: string): void {
    onChange(value.filter((v) => v !== optionId));
  }

  const selectedOptions = value
    .map((id) => options.find((o) => o.id === id))
    .filter(Boolean) as SelectOption[];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full flex-wrap items-center gap-1 px-2 py-1 text-[13px]"
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-0.5 rounded-[3px] px-[6px] py-[1px] text-[12px]"
              style={{
                backgroundColor: getColorStyle(option.color).bg,
                color: getColorStyle(option.color).text,
              }}
            >
              {option.label}
              <X
                size={10}
                className="cursor-pointer opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(option.id);
                }}
              />
            </span>
          ))
        ) : (
          <span className="text-[var(--text-tertiary)]">空</span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="p-1.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="検索・追加..."
              className="w-full rounded bg-[var(--bg-secondary)] px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              autoFocus
            />
          </div>

          <div className="max-h-[200px] overflow-y-auto px-1 pb-1">
            {/* 選択済み */}
            {selectedOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleToggle(option.id)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-[var(--bg-hover)]"
              >
                <span
                  className="inline-flex items-center rounded-[3px] px-[6px] py-[1px] text-[12px]"
                  style={{
                    backgroundColor: getColorStyle(option.color).bg,
                    color: getColorStyle(option.color).text,
                  }}
                >
                  {option.label}
                </span>
                <span className="text-[11px] text-[var(--accent-blue)]">✓</span>
              </button>
            ))}

            {/* 未選択 */}
            {filtered.map((option) => (
              <button
                key={option.id}
                onClick={() => handleToggle(option.id)}
                className="flex w-full items-center rounded px-2 py-1.5 hover:bg-[var(--bg-hover)]"
              >
                <span
                  className="inline-flex items-center rounded-[3px] px-[6px] py-[1px] text-[12px]"
                  style={{
                    backgroundColor: getColorStyle(option.color).bg,
                    color: getColorStyle(option.color).text,
                  }}
                >
                  {option.label}
                </span>
              </button>
            ))}

            {search && !options.some((o) => o.label === search) && (
              <button
                onClick={() => {
                  onChange([...value, search]);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[var(--accent-blue)] hover:bg-[var(--bg-hover)]"
              >
                <Plus size={12} />「{search}」を作成
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
