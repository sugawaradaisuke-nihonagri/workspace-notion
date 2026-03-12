"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type {
  RollupConfig,
  RollupAggregation,
  CellValue,
} from "@/types/database";

interface RollupCellProps {
  value: CellValue;
  config: Record<string, unknown>;
  /** Cell values map for the current database — Map<"pageId:propertyId", CellValue> */
  cellMap?: Map<string, CellValue>;
  /** Current row's pageId — needed to find relation values */
  pageId?: string;
}

/**
 * Rollup cell — computes an aggregate from related rows' property values.
 *
 * Flow:
 * 1. Read the relation property's value (array of related row IDs)
 * 2. Fetch target database rows + cells
 * 3. Extract the target property's values for each related row
 * 4. Aggregate using the configured function
 */
export function RollupCell({ config, cellMap, pageId }: RollupCellProps) {
  const rollupConfig = config as unknown as RollupConfig;
  const {
    relationPropertyId,
    targetPropertyId,
    aggregation = "count",
  } = rollupConfig ?? {};

  // Step 1: Get related row IDs from the relation property
  const relatedRowIds = useMemo<string[]>(() => {
    if (!cellMap || !pageId || !relationPropertyId) return [];
    const relVal = cellMap.get(`${pageId}:${relationPropertyId}`);
    if (Array.isArray(relVal)) return relVal as string[];
    return [];
  }, [cellMap, pageId, relationPropertyId]);

  // Step 2: Find target database from the relation property config
  // We need the target database ID from the relation property's config
  // For now, we pass it through the rollup config
  const targetDatabaseId = (config as Record<string, unknown>)
    .targetDatabaseId as string | undefined;

  const { data: targetData } = trpc.dbRows.list.useQuery(
    { databaseId: targetDatabaseId! },
    {
      enabled: !!targetDatabaseId && relatedRowIds.length > 0,
      staleTime: 30_000,
    },
  );

  // Step 3: Extract values from related rows
  const aggregatedValue = useMemo(() => {
    if (!targetData || !targetPropertyId || relatedRowIds.length === 0) {
      return computeAggregate([], aggregation);
    }

    const targetCellMap = new Map(
      targetData.cells.map((c) => [`${c.pageId}:${c.propertyId}`, c.value]),
    );

    const values: CellValue[] = relatedRowIds
      .filter((id) => targetData.rows.some((r) => r.id === id))
      .map((rowId) => {
        const val = targetCellMap.get(`${rowId}:${targetPropertyId}`);
        return (val ?? null) as CellValue;
      });

    return computeAggregate(values, aggregation);
  }, [targetData, targetPropertyId, relatedRowIds, aggregation]);

  if (!relationPropertyId || !targetPropertyId) {
    return (
      <div className="px-2 py-1 text-[12px] text-[var(--text-tertiary)]">
        ロールアップを設定してください
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-[13px] text-[var(--text-secondary)]">
      <BarChart3 size={12} className="shrink-0 opacity-50" />
      <span>{formatAggregated(aggregatedValue, aggregation)}</span>
    </div>
  );
}

// --- Aggregation logic ---

function computeAggregate(
  values: CellValue[],
  aggregation: RollupAggregation,
): number | string | CellValue[] {
  switch (aggregation) {
    case "count":
      return values.length;

    case "count_values":
      return values.filter(
        (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
      ).length;

    case "count_unique":
      return new Set(values.map((v) => JSON.stringify(v))).size;

    case "sum": {
      return values.reduce((acc: number, v) => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
    }

    case "average": {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((n) => !isNaN(n));
      return nums.length > 0
        ? nums.reduce((a, b) => a + b, 0) / nums.length
        : 0;
    }

    case "min": {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((n) => !isNaN(n));
      return nums.length > 0 ? Math.min(...nums) : 0;
    }

    case "max": {
      const nums = values
        .map((v) => (typeof v === "number" ? v : parseFloat(String(v))))
        .filter((n) => !isNaN(n));
      return nums.length > 0 ? Math.max(...nums) : 0;
    }

    case "percent_empty": {
      if (values.length === 0) return 0;
      const empty = values.filter(
        (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0),
      ).length;
      return Math.round((empty / values.length) * 100);
    }

    case "percent_not_empty": {
      if (values.length === 0) return 0;
      const filled = values.filter(
        (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
      ).length;
      return Math.round((filled / values.length) * 100);
    }

    case "show_original":
      return values;

    default:
      return values.length;
  }
}

function formatAggregated(
  result: number | string | CellValue[],
  aggregation: RollupAggregation,
): string {
  if (aggregation === "show_original") {
    const arr = result as CellValue[];
    if (arr.length === 0) return "—";
    return arr.map((v) => (v != null ? String(v) : "")).join(", ");
  }

  if (aggregation === "percent_empty" || aggregation === "percent_not_empty") {
    return `${result}%`;
  }

  if (typeof result === "number") {
    return Number.isInteger(result) ? String(result) : result.toFixed(2);
  }

  return String(result);
}
