"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { CellValue, FilterCondition, SortRule } from "@/types/database";

interface TimelineViewProps {
  databaseId: string;
  workspaceId: string;
  viewId?: string;
  filters?: FilterCondition[];
  sorts?: SortRule[];
}

type TimelineScale = "day" | "week" | "month";

const SCALE_LABELS: Record<TimelineScale, string> = {
  day: "日",
  week: "週",
  month: "月",
};

const COL_WIDTHS: Record<TimelineScale, number> = {
  day: 36,
  week: 50,
  month: 80,
};

/** Parsed date range from a row's date property */
interface DateRange {
  rowId: string;
  title: string;
  icon: string | null;
  start: Date;
  end: Date;
}

// --- Helpers ---

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getMonday(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  result.setDate(result.getDate() - day + (day === 0 ? -6 : 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// --- Color by row index ---
const BAR_COLORS = [
  "var(--accent-blue)",
  "#50c878",
  "#f0a050",
  "#a070e0",
  "#e070b0",
  "#e05050",
  "#5090f0",
  "#e8c840",
];

// ========== Component ==========

export function TimelineView({ databaseId, filters = [] }: TimelineViewProps) {
  const { data, isLoading } = trpc.dbRows.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });

  const [scale, setScale] = useState<TimelineScale>("day");
  const [originDate, setOriginDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Find date property ---
  const dateProperty = useMemo(() => {
    if (!properties) return null;
    return properties.find((p) => p.type === "date") ?? null;
  }, [properties]);

  // --- Cell map ---
  const cellMap = useMemo(() => {
    const map = new Map<string, CellValue>();
    if (data?.cells) {
      for (const cell of data.cells) {
        map.set(`${cell.pageId}:${cell.propertyId}`, cell.value as CellValue);
      }
    }
    return map;
  }, [data?.cells]);

  // --- Apply filters ---
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
          case "equals":
            return String(val) === String(filter.value);
          default:
            return true;
        }
      }),
    );
  }, [data?.rows, filters, cellMap]);

  // --- Extract date ranges ---
  const dateRanges = useMemo<DateRange[]>(() => {
    if (!dateProperty) return [];

    return filteredRows
      .map((row) => {
        const val = cellMap.get(`${row.id}:${dateProperty.id}`);
        if (!val || typeof val !== "object" || Array.isArray(val)) return null;

        const dateVal = val as { start?: string; end?: string | null };
        if (!dateVal.start) return null;

        const start = new Date(dateVal.start);
        const end = dateVal.end ? new Date(dateVal.end) : start;

        return {
          rowId: row.id,
          title: row.title || "Untitled",
          icon: row.icon,
          start,
          end,
        };
      })
      .filter(Boolean) as DateRange[];
  }, [filteredRows, cellMap, dateProperty]);

  // --- Timeline columns ---
  const columnCount = scale === "day" ? 60 : scale === "week" ? 26 : 12;
  const colWidth = COL_WIDTHS[scale];

  const columns = useMemo(() => {
    const cols: { date: Date; label: string; key: string }[] = [];
    const halfCols = Math.floor(columnCount / 2);

    if (scale === "day") {
      for (let i = -halfCols; i < halfCols; i++) {
        const d = addDays(originDate, i);
        cols.push({
          date: d,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          key: toDateKey(d),
        });
      }
    } else if (scale === "week") {
      const startMonday = getMonday(addDays(originDate, -halfCols * 7));
      for (let i = 0; i < columnCount; i++) {
        const d = addDays(startMonday, i * 7);
        cols.push({
          date: d,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          key: `w-${toDateKey(d)}`,
        });
      }
    } else {
      const startMonth = new Date(
        originDate.getFullYear(),
        originDate.getMonth() - halfCols,
        1,
      );
      for (let i = 0; i < columnCount; i++) {
        const d = new Date(
          startMonth.getFullYear(),
          startMonth.getMonth() + i,
          1,
        );
        cols.push({
          date: d,
          label: `${d.getFullYear()}/${d.getMonth() + 1}`,
          key: `m-${d.getFullYear()}-${d.getMonth()}`,
        });
      }
    }

    return cols;
  }, [scale, originDate, columnCount]);

  const timelineStart = columns[0]?.date ?? new Date();
  const timelineEnd = columns[columns.length - 1]?.date ?? new Date();

  // --- Compute bar position for each row ---
  const getBarStyle = useCallback(
    (range: DateRange): { left: number; width: number } | null => {
      if (range.end < timelineStart || range.start > timelineEnd) return null;

      if (scale === "day") {
        const startOffset = diffDays(timelineStart, range.start);
        const duration = diffDays(range.start, range.end) + 1;
        return {
          left: Math.max(0, startOffset) * colWidth,
          width:
            Math.max(
              1,
              Math.min(duration, columnCount - Math.max(0, startOffset)),
            ) * colWidth,
        };
      } else if (scale === "week") {
        const startOffset = diffDays(timelineStart, range.start) / 7;
        const duration = (diffDays(range.start, range.end) + 1) / 7;
        return {
          left: Math.max(0, startOffset) * colWidth,
          width: Math.max(colWidth * 0.5, duration * colWidth),
        };
      } else {
        // month
        const startMonths =
          (range.start.getFullYear() - timelineStart.getFullYear()) * 12 +
          (range.start.getMonth() - timelineStart.getMonth());
        const durationMonths =
          (range.end.getFullYear() - range.start.getFullYear()) * 12 +
          (range.end.getMonth() - range.start.getMonth()) +
          1;
        return {
          left: Math.max(0, startMonths) * colWidth,
          width: Math.max(colWidth * 0.5, durationMonths * colWidth),
        };
      }
    },
    [timelineStart, timelineEnd, scale, colWidth, columnCount],
  );

  // --- Navigation ---
  const navigate = useCallback(
    (direction: 1 | -1) => {
      const step = scale === "day" ? 14 : scale === "week" ? 28 : 90;
      setOriginDate((d) => addDays(d, direction * step));
    },
    [scale],
  );

  const goToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setOriginDate(d);
  }, []);

  // --- Today marker position ---
  const todayOffset = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scale === "day") return diffDays(timelineStart, today) * colWidth;
    if (scale === "week")
      return (diffDays(timelineStart, today) / 7) * colWidth;
    return (
      ((today.getFullYear() - timelineStart.getFullYear()) * 12 +
        (today.getMonth() - timelineStart.getMonth())) *
      colWidth
    );
  }, [timelineStart, scale, colWidth]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-tertiary)]">
        読み込み中…
      </div>
    );
  }

  if (!dateProperty) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-tertiary)]">
        日付プロパティがありません。タイムラインビューには日付プロパティが必要です。
      </div>
    );
  }

  const totalWidth = columnCount * colWidth;

  return (
    <div className="flex h-full flex-col">
      {/* Header controls */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-2">
        <button
          onClick={() => navigate(-1)}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={goToday}
          className="rounded-[6px] px-2.5 py-1 text-[12px] font-medium text-[var(--accent-blue)] hover:bg-[var(--bg-hover)]"
        >
          今日
        </button>
        <button
          onClick={() => navigate(1)}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronRight size={14} />
        </button>

        <div className="flex-1" />

        {/* Scale toggle */}
        <div className="flex items-center gap-0.5 rounded-[6px] border border-[var(--border-default)] p-0.5">
          {(["day", "week", "month"] as TimelineScale[]).map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              className="rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor:
                  s === scale ? "var(--bg-hover)" : "transparent",
                color:
                  s === scale ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {SCALE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Row names */}
        <div className="w-[200px] shrink-0 overflow-y-auto border-r border-[var(--border-default)]">
          {/* Header placeholder */}
          <div className="h-[32px] border-b border-[var(--border-default)]" />

          {dateRanges.map((range) => (
            <div
              key={range.rowId}
              className="flex h-[36px] items-center gap-1.5 border-b border-[var(--border-default)] px-3 text-[13px] text-[var(--text-primary)]"
            >
              {range.icon && (
                <span className="shrink-0 text-[14px]">{range.icon}</span>
              )}
              <span className="truncate">{range.title}</span>
            </div>
          ))}

          {dateRanges.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-[var(--text-tertiary)]">
              日付が設定された行がありません
            </div>
          )}
        </div>

        {/* Right: Gantt chart area */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div style={{ width: totalWidth, minHeight: "100%" }}>
            {/* Column headers */}
            <div className="sticky top-0 z-10 flex h-[32px] border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex shrink-0 items-center justify-center border-r border-[var(--border-default)] text-[10px] text-[var(--text-tertiary)]"
                  style={{ width: colWidth }}
                >
                  {col.label}
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="relative">
              {/* Column grid lines */}
              <div className="pointer-events-none absolute inset-0 flex">
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="shrink-0 border-r border-[var(--border-default)] opacity-30"
                    style={{ width: colWidth }}
                  />
                ))}
              </div>

              {/* Today marker */}
              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <div
                  className="pointer-events-none absolute top-0 z-10 h-full w-[2px] bg-red-400 opacity-60"
                  style={{ left: todayOffset }}
                />
              )}

              {/* Row bars */}
              {dateRanges.map((range, index) => {
                const style = getBarStyle(range);
                if (!style) {
                  return <div key={range.rowId} className="h-[36px]" />;
                }
                return (
                  <div
                    key={range.rowId}
                    className="relative h-[36px] border-b border-[var(--border-default)]"
                  >
                    <div
                      className="absolute top-[6px] flex h-[24px] items-center rounded-[4px] px-2 text-[11px] font-medium text-white"
                      style={{
                        left: style.left,
                        width: style.width,
                        backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                      }}
                      title={`${range.title}: ${toDateKey(range.start)} → ${toDateKey(range.end)}`}
                    >
                      <span className="truncate">{range.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
