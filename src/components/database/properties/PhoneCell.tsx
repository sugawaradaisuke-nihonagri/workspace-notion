"use client";

import { useRef, useCallback } from "react";
import { Phone } from "lucide-react";

interface PhoneCellProps {
  value: string;
  onChange: (value: string) => void;
}

export function PhoneCell({ value, onChange }: PhoneCellProps) {
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
        type="tel"
        defaultValue={value}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        placeholder="090-0000-0000"
      />
      {value && (
        <a
          href={`tel:${value}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <Phone size={12} />
        </a>
      )}
    </div>
  );
}
