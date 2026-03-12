"use client";

import { useRef, useCallback } from "react";

interface TitleCellProps {
  value: string;
  onChange: (value: string) => void;
  pageId?: string;
}

export function TitleCell({ value, onChange }: TitleCellProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleBlur = useCallback(() => {
    const text = ref.current?.value ?? "";
    if (text !== value) {
      onChange(text || "Untitled");
    }
  }, [value, onChange]);

  return (
    <input
      ref={ref}
      defaultValue={value}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className="w-full bg-transparent px-2 py-1 text-[13px] font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
      placeholder="Untitled"
    />
  );
}
