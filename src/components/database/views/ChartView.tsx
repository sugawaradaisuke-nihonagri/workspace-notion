"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import type {
  CellValue,
  FilterCondition,
  SortRule,
  SelectOption,
} from "@/types/database";

interface ChartViewProps {
  databaseId: string;
  workspaceId: string;
  viewId?: string;
  filters?: FilterCondition[];
  sorts?: SortRule[];
}

type ChartType = "bar" | "pie" | "line";

const CHART_LABELS: Record<ChartType, string> = {
  bar: "棒グラフ",
  pie: "円グラフ",
  line: "折れ線",
};

const CHART_COLORS = [
  "#5090f0",
  "#50c878",
  "#f0a050",
  "#a070e0",
  "#e070b0",
  "#e05050",
  "#e8c840",
  "#4a90d9",
  "#7c5cfc",
  "#ff6b6b",
];

export function ChartView({ databaseId, filters = [] }: ChartViewProps) {
  const { data, isLoading } = trpc.dbRows.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [groupPropertyId, setGroupPropertyId] = useState<string | null>(null);
  const [valuePropertyId, setValuePropertyId] = useState<string | null>(null);

  // Groupable properties (select, status, multi_select, checkbox, person)
  const groupableProperties = useMemo(() => {
    return (properties ?? []).filter((p) =>
      ["select", "status", "multi_select", "checkbox"].includes(p.type),
    );
  }, [properties]);

  // Numeric properties for aggregation
  const numericProperties = useMemo(() => {
    return (properties ?? []).filter((p) => p.type === "number");
  }, [properties]);

  // Auto-select first groupable property
  const effectiveGroupId =
    groupPropertyId ?? groupableProperties[0]?.id ?? null;
  const effectiveValueId = valuePropertyId ?? numericProperties[0]?.id ?? null;

  // Cell map
  const cellMap = useMemo(() => {
    const map = new Map<string, CellValue>();
    if (data?.cells) {
      for (const cell of data.cells) {
        map.set(`${cell.pageId}:${cell.propertyId}`, cell.value as CellValue);
      }
    }
    return map;
  }, [data?.cells]);

  // Apply filters
  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    if (filters.length === 0) return rows;
    return rows.filter((row) =>
      filters.every((filter) => {
        const val = cellMap.get(`${row.id}:${filter.propertyId}`);
        switch (filter.operator) {
          case "is_empty":
            return val == null || val === "";
          case "is_not_empty":
            return val != null && val !== "";
          default:
            return true;
        }
      }),
    );
  }, [data?.rows, filters, cellMap]);

  // Compute chart data: group by property, aggregate values
  const chartData = useMemo(() => {
    if (!effectiveGroupId) return [];

    const groupProp = properties?.find((p) => p.id === effectiveGroupId);
    if (!groupProp) return [];

    const groups = new Map<
      string,
      { label: string; count: number; sum: number }
    >();

    for (const row of filteredRows) {
      const groupVal = cellMap.get(`${row.id}:${effectiveGroupId}`);
      let groupKey: string;
      let groupLabel: string;

      if (groupProp.type === "checkbox") {
        groupKey = groupVal ? "true" : "false";
        groupLabel = groupVal ? "チェック済み" : "未チェック";
      } else if (groupProp.type === "select" || groupProp.type === "status") {
        const options =
          ((groupProp.config as Record<string, unknown>)
            ?.options as SelectOption[]) ?? [];
        const optId = String(groupVal ?? "");
        const opt = options.find((o) => o.id === optId);
        groupKey = optId || "__empty__";
        groupLabel = opt?.label ?? (optId || "空");
      } else if (groupProp.type === "multi_select") {
        // Multi-select: count each selected option
        const options =
          ((groupProp.config as Record<string, unknown>)
            ?.options as SelectOption[]) ?? [];
        const ids = Array.isArray(groupVal) ? (groupVal as string[]) : [];
        if (ids.length === 0) {
          const entry = groups.get("__empty__") ?? {
            label: "空",
            count: 0,
            sum: 0,
          };
          entry.count++;
          if (effectiveValueId) {
            const numVal = cellMap.get(`${row.id}:${effectiveValueId}`);
            entry.sum += typeof numVal === "number" ? numVal : 0;
          }
          groups.set("__empty__", entry);
        }
        for (const id of ids) {
          const opt = options.find((o) => o.id === id);
          const entry = groups.get(id) ?? {
            label: opt?.label ?? id,
            count: 0,
            sum: 0,
          };
          entry.count++;
          if (effectiveValueId) {
            const numVal = cellMap.get(`${row.id}:${effectiveValueId}`);
            entry.sum += typeof numVal === "number" ? numVal : 0;
          }
          groups.set(id, entry);
        }
        continue;
      } else {
        groupKey = String(groupVal ?? "__empty__");
        groupLabel = groupKey === "__empty__" ? "空" : groupKey;
      }

      const entry = groups.get(groupKey) ?? {
        label: groupLabel,
        count: 0,
        sum: 0,
      };
      entry.count++;
      if (effectiveValueId) {
        const numVal = cellMap.get(`${row.id}:${effectiveValueId}`);
        entry.sum += typeof numVal === "number" ? numVal : 0;
      }
      groups.set(groupKey, entry);
    }

    return Array.from(groups.entries()).map(([key, { label, count, sum }]) => ({
      key,
      label,
      value: effectiveValueId ? sum : count,
    }));
  }, [filteredRows, cellMap, effectiveGroupId, effectiveValueId, properties]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const totalValue = chartData.reduce((acc, d) => acc + d.value, 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-tertiary)]">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-2">
        {/* Chart type */}
        <div className="flex items-center gap-0.5 rounded-[6px] border border-[var(--border-default)] p-0.5">
          {(["bar", "pie", "line"] as ChartType[]).map((ct) => (
            <button
              key={ct}
              onClick={() => setChartType(ct)}
              className="rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor:
                  ct === chartType ? "var(--bg-hover)" : "transparent",
                color:
                  ct === chartType
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              {CHART_LABELS[ct]}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            グループ:
          </span>
          <select
            value={effectiveGroupId ?? ""}
            onChange={(e) => setGroupPropertyId(e.target.value || null)}
            className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-0.5 text-[12px] text-[var(--text-primary)] outline-none"
          >
            {groupableProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Value */}
        {numericProperties.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-tertiary)]">値:</span>
            <select
              value={effectiveValueId ?? "__count__"}
              onChange={(e) =>
                setValuePropertyId(
                  e.target.value === "__count__" ? null : e.target.value,
                )
              }
              className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-0.5 text-[12px] text-[var(--text-primary)] outline-none"
            >
              <option value="__count__">カウント</option>
              {numericProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (合計)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="flex flex-1 items-center justify-center p-6">
        {chartData.length === 0 ? (
          <div className="text-[13px] text-[var(--text-tertiary)]">
            {!effectiveGroupId
              ? "グループ化できるプロパティがありません (セレクト/ステータス/チェックボックス)"
              : "データがありません"}
          </div>
        ) : chartType === "bar" ? (
          <BarChart data={chartData} maxValue={maxValue} />
        ) : chartType === "pie" ? (
          <PieChart data={chartData} total={totalValue} />
        ) : (
          <LineChart data={chartData} maxValue={maxValue} />
        )}
      </div>
    </div>
  );
}

// ========== Bar Chart (CSS-based) ==========

function BarChart({
  data,
  maxValue,
}: {
  data: { key: string; label: string; value: number }[];
  maxValue: number;
}) {
  return (
    <div className="flex h-[300px] w-full max-w-[600px] items-end gap-2">
      {data.map((item, i) => {
        const height = Math.max(4, (item.value / maxValue) * 260);
        return (
          <div
            key={item.key}
            className="flex flex-1 flex-col items-center gap-1"
          >
            {/* Value label */}
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              {Number.isInteger(item.value)
                ? item.value
                : item.value.toFixed(1)}
            </span>
            {/* Bar */}
            <div
              className="w-full rounded-t-[4px] transition-all"
              style={{
                height,
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                minWidth: 20,
              }}
            />
            {/* Label */}
            <span className="max-w-[80px] truncate text-[10px] text-[var(--text-tertiary)]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ========== Pie Chart (SVG) ==========

function PieChart({
  data,
  total,
}: {
  data: { key: string; label: string; value: number }[];
  total: number;
}) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;

  let currentAngle = -Math.PI / 2; // Start from top

  const slices = data.map((item, i) => {
    const angle = total > 0 ? (item.value / total) * 2 * Math.PI : 0;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      d,
      color: CHART_COLORS[i % CHART_COLORS.length],
      label: item.label,
      value: item.value,
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
    };
  });

  return (
    <div className="flex items-center gap-8">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice) => (
          <path
            key={slice.label}
            d={slice.d}
            fill={slice.color}
            stroke="var(--bg-primary)"
            strokeWidth={2}
          >
            <title>
              {slice.label}: {slice.value} ({slice.percent}%)
            </title>
          </path>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <div
              className="h-[10px] w-[10px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-[12px] text-[var(--text-primary)]">
              {slice.label}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {slice.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== Line Chart (SVG) ==========

function LineChart({
  data,
  maxValue,
}: {
  data: { key: string; label: string; value: number }[];
  maxValue: number;
}) {
  const width = 500;
  const height = 260;
  const padX = 40;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = data.map((item, i) => ({
    x: padX + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: padY + chartH - (item.value / maxValue) * chartH,
    label: item.label,
    value: item.value,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padY + chartH - ratio * chartH;
          return (
            <g key={ratio}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="var(--border-default)"
                strokeWidth={0.5}
              />
              <text
                x={padX - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="var(--text-tertiary)"
              >
                {Math.round(maxValue * ratio)}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path d={linePath} fill="none" stroke="#5090f0" strokeWidth={2} />

        {/* Dots */}
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={4} fill="#5090f0">
            <title>
              {p.label}: {p.value}
            </title>
          </circle>
        ))}
      </svg>

      {/* X labels */}
      <div
        className="flex justify-between"
        style={{ width: chartW, marginLeft: padX }}
      >
        {data.map((item) => (
          <span
            key={item.key}
            className="max-w-[60px] truncate text-center text-[10px] text-[var(--text-tertiary)]"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
