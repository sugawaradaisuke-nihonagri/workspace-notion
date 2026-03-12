"use client";

import { useState, useRef, useEffect } from "react";
import type { AggregationType, CellValue } from "@/types/database";
import { AGGREGATION_LABELS } from "@/types/database";

interface TableFooterProps {
  properties: {
    id: string;
    name: string;
    type: string;
    width: number | null;
  }[];
  rows: { id: string; title: string }[];
  cellMap: Map<string, CellValue>;
  aggregations: Record<string, AggregationType>;
  onAggregationChange: (propertyId: string, type: AggregationType) => void;
  columnWidths: Record<string, number>;
}

function computeAggregation(
  type: AggregationType,
  values: CellValue[],
  totalRows: number,
): string {
  if (type === "none") return "";
  if (type === "count") return String(totalRows);

  const nonEmpty = values.filter(
    (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );

  if (type === "count_values") return String(nonEmpty.length);

  if (type === "percent_empty") {
    const empty = totalRows - nonEmpty.length;
    return `${Math.round((empty / totalRows) * 100)}%`;
  }
  if (type === "percent_not_empty") {
    return `${Math.round((nonEmpty.length / totalRows) * 100)}%`;
  }

  // Numeric aggregations
  const nums = nonEmpty
    .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return "—";

  switch (type) {
    case "sum":
      return String(nums.reduce((a, b) => a + b, 0));
    case "average":
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
    case "min":
      return String(Math.min(...nums));
    case "max":
      return String(Math.max(...nums));
    default:
      return "";
  }
}

export function TableFooter({
  properties,
  rows,
  cellMap,
  aggregations,
  onAggregationChange,
  columnWidths,
}: TableFooterProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <tr className="border-t border-[var(--border-default)]">
      {properties.map((prop) => {
        const width = columnWidths[prop.id] ?? prop.width ?? 200;
        const aggType = aggregations[prop.id] ?? "none";
        const isTitle = prop.type === "title";

        // Collect values for this property
        const values = rows.map((row) =>
          isTitle ? row.title : (cellMap.get(`${row.id}:${prop.id}`) ?? null),
        );

        const result = computeAggregation(aggType, values, rows.length);

        return (
          <td
            key={prop.id}
            className="relative h-[28px] border-r border-[var(--border-default)]"
            style={{
              width: `${width}px`,
              minWidth: `${width}px`,
              position: isTitle ? "sticky" : undefined,
              left: isTitle ? 0 : undefined,
              backgroundColor: "var(--bg-primary)",
            }}
          >
            <button
              onClick={() =>
                setActiveMenu(activeMenu === prop.id ? null : prop.id)
              }
              className="flex h-full w-full items-center px-2 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            >
              {aggType === "none"
                ? "計算"
                : `${AGGREGATION_LABELS[aggType]}: ${result}`}
            </button>

            {activeMenu === prop.id && (
              <AggregationMenu
                current={aggType}
                propertyType={prop.type}
                onChange={(type) => {
                  onAggregationChange(prop.id, type);
                  setActiveMenu(null);
                }}
                onClose={() => setActiveMenu(null)}
              />
            )}
          </td>
        );
      })}
      <td className="h-[28px] w-[44px]" />
    </tr>
  );
}

function AggregationMenu({
  current,
  propertyType,
  onChange,
  onClose,
}: {
  current: AggregationType;
  propertyType: string;
  onChange: (type: AggregationType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 50);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      clearTimeout(timer);
    };
  }, [onClose]);

  const isNumeric = propertyType === "number";
  const allTypes: AggregationType[] = [
    "none",
    "count",
    "count_values",
    "percent_empty",
    "percent_not_empty",
    ...(isNumeric
      ? (["sum", "average", "min", "max"] as AggregationType[])
      : []),
  ];

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-1 w-[160px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="p-1">
        {allTypes.map((type) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-[12px] hover:bg-[var(--bg-hover)]"
          >
            <span
              className={
                type === current
                  ? "text-[var(--accent-blue)]"
                  : "text-[var(--text-primary)]"
              }
            >
              {AGGREGATION_LABELS[type]}
            </span>
            {type === current && (
              <span className="text-[11px] text-[var(--accent-blue)]">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
