"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type {
  CellValue,
  FilterCondition,
  SortRule,
  PropertyType,
} from "@/types/database";

interface CalendarViewProps {
  databaseId: string;
  workspaceId: string;
  viewId?: string;
  filters?: FilterCondition[];
  sorts?: SortRule[];
}

type CalendarMode = "month" | "week";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

// --- Helper: get Monday of a week ---
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// --- Helper: get days in month grid (6 weeks) ---
function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const monday = getMonday(firstDay);
  // If monday is after firstDay, go back one week
  if (monday > firstDay) {
    monday.setDate(monday.getDate() - 7);
  }

  const days: Date[] = [];
  const current = new Date(monday);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// --- Helper: get week days ---
function getWeekDays(startDate: Date): Date[] {
  const monday = getMonday(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

// --- Helper: is same day ---
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// --- Helper: format date as YYYY-MM-DD ---
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ========== Event Item ==========
interface CalendarEventProps {
  row: { id: string; title: string; icon: string | null };
  onPeek: (rowId: string) => void;
}

function CalendarEvent({ row, onPeek }: CalendarEventProps) {
  return (
    <button
      onClick={() => onPeek(row.id)}
      className="w-full truncate rounded-[4px] bg-[var(--accent-blue-bg)] px-1.5 py-0.5 text-left text-[11px] text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-blue)]"
      title={row.title || "Untitled"}
    >
      {row.icon && <span className="mr-0.5">{row.icon}</span>}
      {row.title || "Untitled"}
    </button>
  );
}

// ========== Peek Panel ==========
interface PeekPanelProps {
  row: {
    id: string;
    title: string;
    icon: string | null;
    updatedAt: Date | string | null;
  };
  cellMap: Map<string, CellValue>;
  properties: Array<{
    id: string;
    name: string;
    type: string;
    isVisible: boolean;
  }>;
  onClose: () => void;
}

function PeekPanel({ row, cellMap, properties, onClose }: PeekPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]"
      onClick={onClose}
    >
      <div
        className="w-[400px] rounded-[14px] border border-[var(--border-strong)] bg-[var(--bg-primary)] p-5"
        style={{ boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-[18px] font-semibold text-[var(--text-primary)]">
          {row.icon && <span className="mr-1">{row.icon}</span>}
          {row.title || "Untitled"}
        </div>

        <div className="space-y-2">
          {properties
            .filter((p) => p.isVisible && p.type !== "title")
            .slice(0, 6)
            .map((prop) => {
              const val = cellMap.get(`${row.id}:${prop.id}`);
              if (val == null || val === "") return null;
              return (
                <div key={prop.id} className="flex items-center gap-3">
                  <span className="w-[100px] shrink-0 text-[12px] text-[var(--text-tertiary)]">
                    {prop.name}
                  </span>
                  <span className="text-[13px] text-[var(--text-primary)]">
                    {typeof val === "object" &&
                    !Array.isArray(val) &&
                    val !== null
                      ? ((val as { start?: string }).start ??
                        JSON.stringify(val))
                      : String(val)}
                  </span>
                </div>
              );
            })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-[6px] border border-[var(--border-default)] py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

// ========== Main CalendarView ==========
export function CalendarView({
  databaseId,
  workspaceId,
  viewId,
  filters = [],
  sorts = [],
}: CalendarViewProps) {
  const utils = trpc.useUtils();

  // --- Data fetching ---
  const { data, isLoading } = trpc.dbRows.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });

  const createRow = trpc.dbRows.create.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });
  const updateCell = trpc.dbRows.updateCell.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });

  // --- State ---
  const [mode, setMode] = useState<CalendarMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [peekRowId, setPeekRowId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

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
    const visibleProps = (properties ?? []).filter((p) => p.isVisible);

    return rows.filter((row) => {
      return filters.every((filter) => {
        const prop = visibleProps.find((p) => p.id === filter.propertyId);
        const val =
          prop?.type === "title"
            ? row.title
            : cellMap.get(`${row.id}:${filter.propertyId}`);
        switch (filter.operator) {
          case "is_empty":
            return (
              val == null ||
              val === "" ||
              (Array.isArray(val) && val.length === 0)
            );
          case "is_not_empty":
            return (
              val != null &&
              val !== "" &&
              !(Array.isArray(val) && val.length === 0)
            );
          case "equals":
            return String(val) === String(filter.value);
          case "contains":
            return String(val ?? "")
              .toLowerCase()
              .includes(String(filter.value ?? "").toLowerCase());
          default:
            return true;
        }
      });
    });
  }, [data?.rows, filters, cellMap, properties]);

  // --- Map rows to dates ---
  const dateRowMap = useMemo(() => {
    const map = new Map<string, typeof filteredRows>();
    if (!dateProperty) return map;

    for (const row of filteredRows) {
      const val = cellMap.get(`${row.id}:${dateProperty.id}`);
      if (!val) continue;
      const dateVal = val as { start?: string; end?: string | null };
      if (!dateVal?.start) continue;

      const key = dateVal.start.slice(0, 10); // YYYY-MM-DD
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [filteredRows, dateProperty, cellMap]);

  // --- Navigation ---
  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (mode === "month") {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  }, [mode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (mode === "month") {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  }, [mode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // --- Add row on date click ---
  const handleAddOnDate = useCallback(
    (date: Date) => {
      if (!dateProperty) return;
      createRow.mutate(
        { databaseId },
        {
          onSuccess: (newRow) => {
            updateCell.mutate({
              pageId: newRow.id,
              propertyId: dateProperty.id,
              value: { start: toDateKey(date) },
            });
          },
        },
      );
    },
    [databaseId, dateProperty, createRow, updateCell],
  );

  // --- Grid data ---
  const gridDays = useMemo(() => {
    if (mode === "month") {
      return getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
    }
    return getWeekDays(currentDate);
  }, [mode, currentDate]);

  const peekRow = peekRowId
    ? filteredRows.find((r) => r.id === peekRowId)
    : null;

  // --- Title ---
  const title = useMemo(() => {
    if (mode === "month") {
      return `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
    }
    const weekDays = getWeekDays(currentDate);
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.getMonth() + 1}/${first.getDate()} — ${last.getMonth() + 1}/${last.getDate()}`;
  }, [mode, currentDate]);

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-[400px] animate-pulse rounded-[8px] bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  if (!dateProperty) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-[14px] text-[var(--text-tertiary)]">
        カレンダービューには日付プロパティが必要です
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4">
      {/* Header: navigation + mode toggle */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={handlePrev}
          className="rounded-[6px] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={handleToday}
          className="rounded-[6px] px-2.5 py-1 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          今日
        </button>
        <button
          onClick={handleNext}
          className="rounded-[6px] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronRight size={16} />
        </button>

        <span className="ml-1 text-[15px] font-semibold text-[var(--text-primary)]">
          {title}
        </span>

        <div className="flex-1" />

        {/* Mode toggle */}
        <div className="flex overflow-hidden rounded-[6px] border border-[var(--border-default)]">
          <button
            onClick={() => setMode("month")}
            className="px-3 py-1 text-[12px] transition-colors"
            style={{
              backgroundColor:
                mode === "month" ? "var(--bg-hover)" : "transparent",
              color:
                mode === "month"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
          >
            月
          </button>
          <button
            onClick={() => setMode("week")}
            className="px-3 py-1 text-[12px] transition-colors"
            style={{
              backgroundColor:
                mode === "week" ? "var(--bg-hover)" : "transparent",
              color:
                mode === "week"
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
          >
            週
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border-default)]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1.5 text-center text-[12px] font-medium text-[var(--text-tertiary)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className={`grid flex-1 grid-cols-7 ${mode === "month" ? "grid-rows-6" : "grid-rows-1"}`}
      >
        {gridDays.map((day, idx) => {
          const key = toDateKey(day);
          const events = dateRowMap.get(key) ?? [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          return (
            <div
              key={idx}
              className="group/cell relative border-b border-r border-[var(--border-default)] p-1"
              style={{
                minHeight: mode === "week" ? "200px" : undefined,
                opacity: isCurrentMonth || mode === "week" ? 1 : 0.4,
              }}
            >
              {/* Day number */}
              <div className="mb-0.5 flex items-center justify-between">
                <span
                  className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px]"
                  style={{
                    backgroundColor: isToday
                      ? "var(--accent-blue)"
                      : "transparent",
                    color: isToday ? "#fff" : "var(--text-secondary)",
                    fontWeight: isToday ? 600 : 400,
                  }}
                >
                  {day.getDate()}
                </span>

                {/* Add button */}
                <button
                  onClick={() => handleAddOnDate(day)}
                  className="rounded p-0.5 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:bg-[var(--bg-hover)] group-hover/cell:opacity-100"
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {events.slice(0, mode === "week" ? 10 : 3).map((row) => (
                  <CalendarEvent key={row.id} row={row} onPeek={setPeekRowId} />
                ))}
                {events.length > (mode === "week" ? 10 : 3) && (
                  <span className="block text-center text-[10px] text-[var(--text-tertiary)]">
                    +{events.length - (mode === "week" ? 10 : 3)} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Peek panel */}
      {peekRow && (
        <PeekPanel
          row={peekRow}
          cellMap={cellMap}
          properties={
            (properties ?? []) as Array<{
              id: string;
              name: string;
              type: string;
              isVisible: boolean;
            }>
          }
          onClose={() => setPeekRowId(null)}
        />
      )}
    </div>
  );
}
