"use client";

import { useRef, useCallback } from "react";

interface TextCellProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextCell({ value, onChange }: TextCellProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleBlur = useCallback(() => {
    const text = ref.current?.value ?? "";
    if (text !== value) {
      onChange(text);
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
      className="w-full bg-transparent px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
      placeholder="空"
    />
  );
}
