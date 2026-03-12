"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Plus, GripVertical, User, Calendar } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc/client";
import type {
  CellValue,
  FilterCondition,
  SortRule,
  SelectOption,
  SelectConfig,
  StatusConfig,
  PropertyType,
} from "@/types/database";
import { SELECT_COLORS, DEFAULT_STATUS_CONFIG } from "@/types/database";

interface BoardViewProps {
  databaseId: string;
  workspaceId: string;
  viewId?: string;
  filters?: FilterCondition[];
  sorts?: SortRule[];
  groupByPropertyId?: string | null;
}

// --- Helper: get color style from color id ---
function getColorStyle(colorId: string): { bg: string; text: string } {
  const color = SELECT_COLORS.find((c) => c.id === colorId);
  return color
    ? { bg: color.bg, text: color.text }
    : { bg: "var(--bg-tertiary)", text: "var(--text-secondary)" };
}

// --- Helper: format date for display ---
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

// ========== Sortable Card Component ==========
interface BoardCardProps {
  row: {
    id: string;
    title: string;
    icon: string | null;
  };
  cellMap: Map<string, CellValue>;
  properties: Array<{
    id: string;
    name: string;
    type: string;
    config: unknown;
    isVisible: boolean;
  }>;
  groupPropertyId: string;
}

function SortableBoardCard({
  row,
  cellMap,
  properties,
  groupPropertyId,
}: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Find interesting properties to show on card (up to 3, excluding title and group property)
  const cardProps = useMemo(() => {
    return properties
      .filter(
        (p) =>
          p.isVisible &&
          p.type !== "title" &&
          p.id !== groupPropertyId &&
          cellMap.has(`${row.id}:${p.id}`),
      )
      .slice(0, 3);
  }, [properties, groupPropertyId, row.id, cellMap]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/card rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] p-2.5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-1.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover/card:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </button>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <div className="text-[13px] font-medium leading-snug text-[var(--text-primary)]">
            {row.icon && <span className="mr-1">{row.icon}</span>}
            {row.title || "Untitled"}
          </div>

          {/* Property badges */}
          {cardProps.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {cardProps.map((prop) => {
                const val = cellMap.get(`${row.id}:${prop.id}`);
                return (
                  <CardPropertyBadge
                    key={prop.id}
                    type={prop.type as PropertyType}
                    value={val ?? null}
                    config={prop.config as Record<string, unknown>}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Card Property Badge ==========
interface CardPropertyBadgeProps {
  type: PropertyType;
  value: CellValue;
  config: Record<string, unknown>;
}

function CardPropertyBadge({ type, value, config }: CardPropertyBadgeProps) {
  if (value == null || value === "") return null;

  switch (type) {
    case "select": {
      const options = (config?.options as SelectOption[]) ?? [];
      const opt = options.find((o) => o.id === value);
      if (!opt) return null;
      const cs = getColorStyle(opt.color);
      return (
        <span
          className="inline-flex items-center rounded-[3px] px-[6px] py-[1px] text-[11px]"
          style={{ backgroundColor: cs.bg, color: cs.text }}
        >
          {opt.label}
        </span>
      );
    }
    case "status": {
      const statusConfig = (config as unknown as StatusConfig)?.options
        ? (config as unknown as StatusConfig)
        : DEFAULT_STATUS_CONFIG;
      const opt = statusConfig.options.find((o) => o.id === value);
      if (!opt) return null;
      const cs = getColorStyle(opt.color);
      return (
        <span
          className="inline-flex items-center gap-1 rounded-[3px] px-[6px] py-[1px] text-[11px]"
          style={{ backgroundColor: cs.bg, color: cs.text }}
        >
          <span
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: cs.text }}
          />
          {opt.label}
        </span>
      );
    }
    case "person":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
          <User size={10} />
          {Array.isArray(value) ? value.length : 1}
        </span>
      );
    case "date": {
      const dateVal = value as { start: string; end?: string | null };
      if (!dateVal?.start) return null;
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
          <Calendar size={10} />
          {formatDateShort(dateVal.start)}
        </span>
      );
    }
    case "checkbox":
      return (
        <span className="text-[11px] text-[var(--text-secondary)]">
          {value ? "✓" : "—"}
        </span>
      );
    default:
      return (
        <span className="max-w-[120px] truncate text-[11px] text-[var(--text-secondary)]">
          {String(value)}
        </span>
      );
  }
}

// ========== Board Column ==========
interface BoardColumnProps {
  columnId: string;
  label: string;
  color: string;
  rows: Array<{ id: string; title: string; icon: string | null }>;
  cellMap: Map<string, CellValue>;
  properties: Array<{
    id: string;
    name: string;
    type: string;
    config: unknown;
    isVisible: boolean;
  }>;
  groupPropertyId: string;
  onAddRow: (columnValue: string) => void;
}

function BoardColumn({
  columnId,
  label,
  color,
  rows,
  cellMap,
  properties,
  groupPropertyId,
  onAddRow,
}: BoardColumnProps) {
  const cs = getColorStyle(color);

  return (
    <div className="flex w-[264px] shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span
          className="inline-block h-[8px] w-[8px] rounded-full"
          style={{ backgroundColor: cs.text }}
        />
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          {label}
        </span>
        <span className="text-[12px] text-[var(--text-tertiary)]">
          {rows.length}
        </span>
      </div>

      {/* Cards list */}
      <SortableContext
        items={rows.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-1.5 rounded-[8px] bg-[var(--bg-secondary)] p-1.5">
          {rows.map((row) => (
            <SortableBoardCard
              key={row.id}
              row={row}
              cellMap={cellMap}
              properties={properties}
              groupPropertyId={groupPropertyId}
            />
          ))}

          {/* Add row button */}
          <button
            onClick={() => onAddRow(columnId)}
            className="flex items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[13px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <Plus size={14} />
            追加
          </button>
        </div>
      </SortableContext>
    </div>
  );
}

// ========== Main BoardView ==========
export function BoardView({
  databaseId,
  workspaceId,
  viewId,
  filters = [],
  sorts = [],
  groupByPropertyId,
}: BoardViewProps) {
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

  // --- DnD sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  // --- Find group property ---
  const groupProperty = useMemo(() => {
    if (!properties) return null;

    // Use explicit groupBy or find first select/status property
    if (groupByPropertyId) {
      return properties.find((p) => p.id === groupByPropertyId) ?? null;
    }
    return (
      properties.find((p) => p.type === "status" || p.type === "select") ?? null
    );
  }, [properties, groupByPropertyId]);

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

  // --- Apply sorts ---
  const sortedRows = useMemo(() => {
    const rows = [...(data?.rows ?? [])];
    if (sorts.length === 0) return rows;
    const visibleProps = (properties ?? []).filter((p) => p.isVisible);

    rows.sort((a, b) => {
      for (const sort of sorts) {
        const prop = visibleProps.find((p) => p.id === sort.propertyId);
        const aStr =
          prop?.type === "title"
            ? a.title
            : String(cellMap.get(`${a.id}:${sort.propertyId}`) ?? "");
        const bStr =
          prop?.type === "title"
            ? b.title
            : String(cellMap.get(`${b.id}:${sort.propertyId}`) ?? "");
        const cmp = aStr.localeCompare(bStr, "ja");
        if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return rows;
  }, [data?.rows, sorts, cellMap, properties]);

  // --- Apply filters ---
  const filteredRows = useMemo(() => {
    if (filters.length === 0) return sortedRows;
    const visibleProps = (properties ?? []).filter((p) => p.isVisible);

    return sortedRows.filter((row) => {
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
  }, [sortedRows, filters, cellMap, properties]);

  // --- Build columns from group property options ---
  const columns = useMemo(() => {
    if (!groupProperty) return [];

    let options: SelectOption[] = [];

    if (groupProperty.type === "status") {
      const cfg = (groupProperty.config as unknown as StatusConfig)?.options
        ? (groupProperty.config as unknown as StatusConfig)
        : DEFAULT_STATUS_CONFIG;
      options = cfg.options;
    } else if (
      groupProperty.type === "select" ||
      groupProperty.type === "multi_select"
    ) {
      options =
        ((groupProperty.config as SelectConfig)?.options as SelectOption[]) ??
        [];
    }

    // Add "No value" column
    return [{ id: "__none__", label: "値なし", color: "gray" }, ...options];
  }, [groupProperty]);

  // --- Group rows by column ---
  const groupedRows = useMemo(() => {
    const groups: Record<string, typeof filteredRows> = {};
    for (const col of columns) {
      groups[col.id] = [];
    }

    for (const row of filteredRows) {
      if (!groupProperty) continue;
      const val = cellMap.get(`${row.id}:${groupProperty.id}`);
      const colId = val ? String(val) : "__none__";
      if (groups[colId]) {
        groups[colId].push(row);
      } else {
        // Value not matching any column → put in __none__
        groups["__none__"]?.push(row);
      }
    }
    return groups;
  }, [filteredRows, columns, groupProperty, cellMap]);

  // --- DnD handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || !groupProperty) return;

      const activeRow = filteredRows.find((r) => r.id === active.id);
      if (!activeRow) return;

      // Determine target column from over id
      // over.id could be a row id or column id
      let targetColumnId: string | null = null;

      // Check if dropped on a column area by looking at which column contains the over row
      for (const col of columns) {
        if (col.id === over.id) {
          targetColumnId = col.id;
          break;
        }
        if (groupedRows[col.id]?.some((r) => r.id === over.id)) {
          targetColumnId = col.id;
          break;
        }
      }

      if (!targetColumnId) return;

      // Get current column of the active row
      const currentVal = cellMap.get(`${activeRow.id}:${groupProperty.id}`);
      const currentCol = currentVal ? String(currentVal) : "__none__";

      if (currentCol === targetColumnId) return;

      // Update cell value to move to new column
      const newValue = targetColumnId === "__none__" ? null : targetColumnId;
      updateCell.mutate({
        pageId: activeRow.id,
        propertyId: groupProperty.id,
        value: newValue,
      });
    },
    [filteredRows, groupProperty, columns, groupedRows, cellMap, updateCell],
  );

  // --- Add row to specific column ---
  const handleAddRow = useCallback(
    (columnValue: string) => {
      createRow.mutate(
        { databaseId },
        {
          onSuccess: (newRow) => {
            if (groupProperty && columnValue !== "__none__") {
              updateCell.mutate({
                pageId: newRow.id,
                propertyId: groupProperty.id,
                value: columnValue,
              });
            }
          },
        },
      );
    },
    [databaseId, createRow, updateCell, groupProperty],
  );

  // --- Active card for DragOverlay ---
  const activeRow = activeId
    ? filteredRows.find((r) => r.id === activeId)
    : null;

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="flex gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-[264px] shrink-0">
            <div className="mb-2 h-[20px] w-[100px] animate-pulse rounded bg-[var(--bg-tertiary)]" />
            <div className="space-y-2 rounded-[8px] bg-[var(--bg-secondary)] p-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="h-[60px] animate-pulse rounded-[8px] bg-[var(--bg-tertiary)]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!groupProperty) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-[14px] text-[var(--text-tertiary)]">
        ボードビューにはセレクトまたはステータスプロパティが必要です
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto p-4">
        {columns.map((col) => (
          <BoardColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            color={col.color}
            rows={groupedRows[col.id] ?? []}
            cellMap={cellMap}
            properties={
              (properties ?? []) as Array<{
                id: string;
                name: string;
                type: string;
                config: unknown;
                isVisible: boolean;
              }>
            }
            groupPropertyId={groupProperty.id}
            onAddRow={handleAddRow}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeRow ? (
          <div className="w-[240px] rounded-[8px] border border-[var(--accent-blue)] bg-[var(--bg-primary)] p-2.5 shadow-lg">
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              {activeRow.icon && <span className="mr-1">{activeRow.icon}</span>}
              {activeRow.title || "Untitled"}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
