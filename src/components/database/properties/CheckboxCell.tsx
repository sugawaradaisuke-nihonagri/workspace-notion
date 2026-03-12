"use client";

import { Check } from "lucide-react";

interface CheckboxCellProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
  return (
    <div className="flex items-center justify-center px-2 py-1">
      <button
        onClick={() => onChange(!value)}
        className="flex h-[16px] w-[16px] items-center justify-center rounded-[3px] border transition-colors"
        style={{
          borderColor: value ? "var(--accent-blue)" : "var(--border-default)",
          backgroundColor: value ? "var(--accent-blue)" : "transparent",
        }}
      >
        {value && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>
    </div>
  );
}
