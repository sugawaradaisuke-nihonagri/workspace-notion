"use client";

import { useState, useRef, useEffect } from "react";
import type { SelectOption, StatusConfig } from "@/types/database";
import { DEFAULT_STATUS_CONFIG, SELECT_COLORS } from "@/types/database";

interface StatusCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
  config: Record<string, unknown>;
}

export function StatusCell({ value, onChange, config }: StatusCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const statusConfig = (config as unknown as StatusConfig)?.options
    ? (config as unknown as StatusConfig)
    : DEFAULT_STATUS_CONFIG;

  const selected = statusConfig.options.find((o) => o.id === value);

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

  function getColorStyle(colorId: string): { bg: string; text: string } {
    const color = SELECT_COLORS.find((c) => c.id === colorId);
    return color
      ? { bg: color.bg, text: color.text }
      : { bg: "var(--bg-tertiary)", text: "var(--text-secondary)" };
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center px-2 py-1 text-[13px]"
      >
        {selected ? (
          <span
            className="inline-flex items-center gap-1 rounded-[3px] px-[6px] py-[1px] text-[12px]"
            style={{
              backgroundColor: getColorStyle(selected.color).bg,
              color: getColorStyle(selected.color).text,
            }}
          >
            <span
              className="inline-block h-[8px] w-[8px] rounded-full"
              style={{
                backgroundColor: getColorStyle(selected.color).text,
              }}
            />
            {selected.label}
          </span>
        ) : (
          <span className="text-[var(--text-tertiary)]">空</span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[200px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {statusConfig.groups.map((group) => {
            const groupOptions = statusConfig.options.filter((o) =>
              group.optionIds.includes(o.id),
            );
            if (groupOptions.length === 0) return null;

            return (
              <div key={group.id}>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-[var(--text-tertiary)]">
                  {group.label}
                </div>
                {groupOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]"
                  >
                    <span
                      className="inline-block h-[8px] w-[8px] rounded-full"
                      style={{
                        backgroundColor: getColorStyle(option.color).text,
                      }}
                    />
                    {option.label}
                    {option.id === value && (
                      <span className="ml-auto text-[11px] text-[var(--accent-blue)]">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
