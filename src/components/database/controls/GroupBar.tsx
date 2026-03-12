"use client";

import { useState, useRef, useEffect } from "react";
import { Layers, X } from "lucide-react";

interface GroupBarProps {
  properties: {
    id: string;
    name: string;
    type: string;
  }[];
  groupBy: string | null;
  onChange: (propertyId: string | null) => void;
}

// グループ化に対応するプロパティタイプ
const GROUPABLE_TYPES = [
  "select",
  "multi_select",
  "status",
  "person",
  "checkbox",
  "date",
];

export function GroupBar({ properties, groupBy, onChange }: GroupBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const groupableProperties = properties.filter((p) =>
    GROUPABLE_TYPES.includes(p.type),
  );

  const currentGroupProperty = properties.find((p) => p.id === groupBy);

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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
        data-active={!!groupBy || undefined}
      >
        <Layers size={14} />
        グループ
        {groupBy && currentGroupProperty && (
          <span className="rounded bg-[var(--bg-tertiary)] px-1.5 text-[11px]">
            {currentGroupProperty.name}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="p-1">
            {groupBy && (
              <button
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
              >
                <X size={12} />
                グループ解除
              </button>
            )}

            {groupableProperties.length === 0 ? (
              <div className="px-2 py-3 text-center text-[12px] text-[var(--text-tertiary)]">
                グループ化可能な列がありません
              </div>
            ) : (
              groupableProperties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => {
                    onChange(prop.id);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]"
                >
                  <span className="text-[var(--text-primary)]">
                    {prop.name}
                  </span>
                  {prop.id === groupBy && (
                    <span className="text-[11px] text-[var(--accent-blue)]">
                      ✓
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
