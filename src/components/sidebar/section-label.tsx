"use client";

interface SectionLabelProps {
  label: string;
}

export function SectionLabel({ label }: SectionLabelProps) {
  return (
    <div className="px-[10px] pb-[4px] pt-[12px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--text-tertiary)]">
        {label}
      </span>
    </div>
  );
}
