"use client";

import { useMemo } from "react";
import { FunctionSquare } from "lucide-react";
import type { CellValue, FormulaConfig } from "@/types/database";
import { evaluateFormula } from "@/lib/formula";

interface FormulaCellProps {
  value: CellValue;
  config: Record<string, unknown>;
  /** All cell values for the current row — Map<propertyId, CellValue> */
  rowValues?: Map<string, CellValue>;
  /** Property name → id mapping for prop("Name") lookups */
  propertyNameMap?: Map<string, string>;
}

/**
 * Formula cell — evaluates a simple expression using values from the same row.
 *
 * Supported syntax:
 * - prop("Property Name")  — reference another property's value
 * - +, -, *, /             — arithmetic
 * - Numeric literals       — 42, 3.14
 * - String literals        — "hello"
 * - concat(a, b)           — string concatenation
 * - if(cond, then, else)   — conditional
 * - length(val)            — string/array length
 * - round(num)             — round to integer
 * - now()                  — current ISO datetime string
 * - empty(val)             — true if null/empty
 * - toNumber(val)          — parse as number
 */
export function FormulaCell({
  config,
  rowValues,
  propertyNameMap,
}: FormulaCellProps) {
  const formulaConfig = config as unknown as FormulaConfig;
  const expression = formulaConfig?.expression ?? "";

  const result = useMemo(() => {
    if (!expression) return null;
    try {
      return evaluateFormula(expression, { rowValues, propertyNameMap });
    } catch {
      return "#ERROR";
    }
  }, [expression, rowValues, propertyNameMap]);

  if (!expression) {
    return (
      <div className="px-2 py-1 text-[12px] text-[var(--text-tertiary)]">
        数式を設定してください
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-[13px] text-[var(--text-secondary)]">
      <FunctionSquare size={12} className="shrink-0 opacity-50" />
      <span>{result != null ? String(result) : "—"}</span>
    </div>
  );
}
