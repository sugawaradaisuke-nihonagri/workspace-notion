"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import type { SelectOption } from "@/types/database";
import { SELECT_COLORS } from "@/types/database";

interface SelectCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  config: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

export function SelectCell({
  value,
  onChange,
  config,
  onConfigChange,
}: SelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const options = (config?.options as SelectOption[]) ?? [];

  const selected = options.find((o) => o.id === value);

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

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
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

  const handleCreateOption = useCallback(
    (label: string) => {
      // Pick a random color from the palette
      const colorIdx = options.length % SELECT_COLORS.length;
      const newOption: SelectOption = {
        id: crypto.randomUUID(),
        label,
        color: SELECT_COLORS[colorIdx].id,
      };
      const newOptions = [...options, newOption];

      // Persist the new option to property config
      if (onConfigChange) {
        onConfigChange({ ...config, options: newOptions });
      }

      // Select the new option
      onChange(newOption.id);
      setIsOpen(false);
      setSearch("");
    },
    [options, config, onConfigChange, onChange],
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 px-2 py-1 text-[13px]"
      >
        {selected ? (
          <span
            className="inline-flex items-center rounded-[3px] px-[6px] py-[1px] text-[12px]"
            style={{
              backgroundColor: getColorStyle(selected.color).bg,
              color: getColorStyle(selected.color).text,
            }}
          >
            {selected.label}
          </span>
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
            {/* Clear option */}
            {value && (
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
              >
                <X size={12} />
                クリア
              </button>
            )}

            {filtered.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                  setSearch("");
                }}
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

            {search && !filtered.some((o) => o.label === search) && (
              <button
                onClick={() => handleCreateOption(search)}
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
