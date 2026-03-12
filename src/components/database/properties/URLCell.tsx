"use client";

import { useRef, useCallback } from "react";
import { ExternalLink } from "lucide-react";

interface URLCellProps {
  value: string;
  onChange: (value: string) => void;
}

export function URLCell({ value, onChange }: URLCellProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleBlur = useCallback(() => {
    const text = ref.current?.value ?? "";
    if (text !== value) {
      onChange(text);
    }
  }, [value, onChange]);

  return (
    <div className="flex items-center gap-1 px-2">
      <input
        ref={ref}
        defaultValue={value}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[var(--accent-blue)] underline outline-none placeholder:text-[var(--text-tertiary)] placeholder:no-underline"
        placeholder="URL を入力..."
      />
      {value && (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}
