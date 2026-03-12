"use client";

import { useMemo, useCallback } from "react";
import { Plus, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type {
  CellValue,
  FilterCondition,
  SortRule,
  SelectOption,
  StatusConfig,
  PropertyType,
} from "@/types/database";
import { SELECT_COLORS, DEFAULT_STATUS_CONFIG } from "@/types/database";

interface GalleryViewProps {
  databaseId: string;
  workspaceId: string;
  viewId?: string;
  filters?: FilterCondition[];
  sorts?: SortRule[];
}

function getColorStyle(colorId: string): { bg: string; text: string } {
  const color = SELECT_COLORS.find((c) => c.id === colorId);
  return color
    ? { bg: color.bg, text: color.text }
    : { bg: "var(--bg-tertiary)", text: "var(--text-secondary)" };
}

// ========== Gallery Card ==========
interface GalleryCardProps {
  row: {
    id: string;
    title: string;
    icon: string | null;
    coverUrl: string | null;
  };
  cellMap: Map<string, CellValue>;
  properties: Array<{
    id: string;
    name: string;
    type: string;
    config: unknown;
    isVisible: boolean;
  }>;
}

function GalleryCard({ row, cellMap, properties }: GalleryCardProps) {
  // Show up to 3 visible non-title properties
  const displayProps = useMemo(() => {
    return properties
      .filter(
        (p) =>
          p.isVisible && p.type !== "title" && cellMap.has(`${row.id}:${p.id}`),
      )
      .slice(0, 3);
  }, [properties, row.id, cellMap]);

  return (
    <div className="group/card overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] transition-shadow hover:shadow-md">
      {/* Cover area */}
      <div
        className="flex h-[140px] items-center justify-center"
        style={{
          backgroundColor: row.coverUrl ? "transparent" : "var(--bg-secondary)",
        }}
      >
        {row.coverUrl ? (
          <img
            src={row.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[40px]">
            {row.icon || (
              <FileText
                size={40}
                className="text-[var(--text-tertiary)]"
                strokeWidth={1}
              />
            )}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Title */}
        <div className="mb-1.5 text-[14px] font-medium leading-snug text-[var(--text-primary)]">
          {row.icon && !row.coverUrl && (
            <span className="mr-1">{row.icon}</span>
          )}
          {row.title || "Untitled"}
        </div>

        {/* Property values */}
        {displayProps.length > 0 && (
          <div className="space-y-1">
            {displayProps.map((prop) => {
              const val = cellMap.get(`${row.id}:${prop.id}`);
              return (
                <GalleryPropertyValue
                  key={prop.id}
                  name={prop.name}
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
  );
}

// ========== Gallery Property Value ==========
interface GalleryPropertyValueProps {
  name: string;
  type: PropertyType;
  value: CellValue;
  config: Record<string, unknown>;
}

function GalleryPropertyValue({
  name,
  type,
  value,
  config,
}: GalleryPropertyValueProps) {
  if (value == null || value === "") return null;

  let display: React.ReactNode = null;

  switch (type) {
    case "select": {
      const options = (config?.options as SelectOption[]) ?? [];
      const opt = options.find((o) => o.id === value);
      if (!opt) break;
      const cs = getColorStyle(opt.color);
      display = (
        <span
          className="inline-flex items-center rounded-[3px] px-[6px] py-[1px] text-[11px]"
          style={{ backgroundColor: cs.bg, color: cs.text }}
        >
          {opt.label}
        </span>
      );
      break;
    }
    case "multi_select": {
      const options = (config?.options as SelectOption[]) ?? [];
      const ids = Array.isArray(value) ? value : [];
      display = (
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const opt = options.find((o) => o.id === id);
            if (!opt) return null;
            const cs = getColorStyle(opt.color);
            return (
              <span
                key={id}
                className="inline-flex items-center rounded-[3px] px-[5px] py-[0.5px] text-[10px]"
                style={{ backgroundColor: cs.bg, color: cs.text }}
              >
                {opt.label}
              </span>
            );
          })}
        </div>
      );
      break;
    }
    case "status": {
      const statusConfig = (config as unknown as StatusConfig)?.options
        ? (config as unknown as StatusConfig)
        : DEFAULT_STATUS_CONFIG;
      const opt = statusConfig.options.find((o) => o.id === value);
      if (!opt) break;
      const cs = getColorStyle(opt.color);
      display = (
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
      break;
    }
    case "date": {
      const dateVal = value as { start: string; end?: string | null };
      if (!dateVal?.start) break;
      const d = new Date(dateVal.start);
      display = (
        <span className="text-[11px] text-[var(--text-secondary)]">
          {d.toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </span>
      );
      break;
    }
    case "checkbox":
      display = (
        <span className="text-[11px] text-[var(--text-secondary)]">
          {value ? "✓" : "—"}
        </span>
      );
      break;
    default:
      display = (
        <span className="max-w-full truncate text-[11px] text-[var(--text-secondary)]">
          {String(value)}
        </span>
      );
  }

  if (!display) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[11px] text-[var(--text-tertiary)]">
        {name}
      </span>
      {display}
    </div>
  );
}

// ========== Main GalleryView ==========
export function GalleryView({
  databaseId,
  workspaceId,
  viewId,
  filters = [],
  sorts = [],
}: GalleryViewProps) {
  const utils = trpc.useUtils();

  // --- Data fetching ---
  const { data, isLoading } = trpc.dbRows.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });

  const createRow = trpc.dbRows.create.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });

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

  const handleAddRow = useCallback(() => {
    createRow.mutate({ databaseId });
  }, [databaseId, createRow]);

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[8px] border border-[var(--border-default)]"
          >
            <div className="h-[140px] animate-pulse bg-[var(--bg-tertiary)]" />
            <div className="space-y-2 p-3">
              <div className="h-[16px] w-[120px] animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="h-[12px] w-[80px] animate-pulse rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {filteredRows.map((row) => (
          <GalleryCard
            key={row.id}
            row={row}
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
          />
        ))}

        {/* Add card */}
        <button
          onClick={handleAddRow}
          className="flex h-[200px] items-center justify-center rounded-[8px] border border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] transition-colors hover:border-[var(--accent-blue)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
        >
          <div className="flex flex-col items-center gap-2">
            <Plus size={20} />
            <span className="text-[13px]">新規追加</span>
          </div>
        </button>
      </div>
    </div>
  );
}
