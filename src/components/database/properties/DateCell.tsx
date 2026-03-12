"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, X } from "lucide-react";

interface DateValue {
  start: string;
  end?: string | null;
}

interface DateCellProps {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  config?: Record<string, unknown>;
}

export function DateCell({ value, onChange, config }: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEndDate, setShowEndDate] = useState(!!value?.end);
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

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 px-2 py-1 text-[13px]"
      >
        {value?.start ? (
          <span className="text-[var(--text-primary)]">
            {formatDate(value.start)}
            {value.end && ` → ${formatDate(value.end)}`}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
            <Calendar size={12} />空
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[260px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)] p-3"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {/* Start date */}
          <div className="mb-2">
            <label className="mb-1 block text-[11px] font-semibold text-[var(--text-tertiary)]">
              開始日
            </label>
            <input
              type="date"
              value={value?.start ?? ""}
              onChange={(e) => {
                const start = e.target.value;
                if (start) {
                  onChange({
                    start,
                    end: value?.end ?? null,
                  });
                }
              }}
              className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
            />
          </div>

          {/* End date toggle */}
          <div className="mb-2">
            <button
              onClick={() => {
                setShowEndDate(!showEndDate);
                if (showEndDate && value) {
                  onChange({ start: value.start, end: null });
                }
              }}
              className="text-[12px] text-[var(--accent-blue)] hover:underline"
            >
              {showEndDate ? "終了日を削除" : "+ 終了日を追加"}
            </button>
          </div>

          {showEndDate && (
            <div className="mb-2">
              <label className="mb-1 block text-[11px] font-semibold text-[var(--text-tertiary)]">
                終了日
              </label>
              <input
                type="date"
                value={value?.end ?? ""}
                onChange={(e) => {
                  if (value?.start) {
                    onChange({
                      start: value.start,
                      end: e.target.value || null,
                    });
                  }
                }}
                className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
              />
            </div>
          )}

          {/* Clear */}
          {value && (
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="flex items-center gap-1 text-[12px] text-[#e57373] hover:underline"
            >
              <X size={12} />
              クリア
            </button>
          )}
        </div>
      )}
    </div>
  );
}
