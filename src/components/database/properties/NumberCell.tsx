"use client";

import { useRef, useCallback } from "react";

interface NumberCellProps {
  value: number | null;
  onChange: (value: number | null) => void;
  config?: Record<string, unknown>;
}

export function NumberCell({ value, onChange, config }: NumberCellProps) {
  const ref = useRef<HTMLInputElement>(null);
  const format = (config?.format as string) ?? "number";

  const handleBlur = useCallback(() => {
    const text = ref.current?.value ?? "";
    if (text === "") {
      if (value !== null) onChange(null);
      return;
    }
    const num = parseFloat(text);
    if (!isNaN(num) && num !== value) {
      onChange(num);
    }
  }, [value, onChange]);

  const displayValue =
    value !== null && value !== undefined ? String(value) : "";

  return (
    <input
      ref={ref}
      type="number"
      defaultValue={displayValue}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className="w-full bg-transparent px-2 py-1 text-right text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      placeholder="—"
    />
  );
}
