"use client";

import { useRef, useCallback } from "react";
import { Mail } from "lucide-react";

interface EmailCellProps {
  value: string;
  onChange: (value: string) => void;
}

export function EmailCell({ value, onChange }: EmailCellProps) {
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
        type="email"
        defaultValue={value}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        placeholder="email@example.com"
      />
      {value && (
        <a
          href={`mailto:${value}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <Mail size={12} />
        </a>
      )}
    </div>
  );
}
