"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PropertyEditor } from "../properties";
import { ColumnHeaderMenu } from "./ColumnHeaderMenu";
import { TableFooter } from "./TableFooter";
import type {
  PropertyType,
  CellValue,
  SortRule,
  FilterCondition,
  AggregationType,
} from "@/types/database";

interface TableViewProps {
  databaseId: string;
  workspaceId: string;
  viewId?: string;
  filters?: FilterCondition[];
  sorts?: SortRule[];
}

export function TableView({
  databaseId,
  workspaceId,
  viewId,
  filters = [],
  sorts = [],
}: TableViewProps) {
  const utils = trpc.useUtils();

  // --- データ取得 ---
  const { data, isLoading } = trpc.dbRows.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });

  const createRow = trpc.dbRows.create.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });
  const updateCell = trpc.dbRows.updateCell.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });
  const deleteRow = trpc.dbRows.delete.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });
  const createProperty = trpc.dbProperties.create.useMutation({
    onSettled: () => utils.dbProperties.list.invalidate({ databaseId }),
  });
  const updateProperty = trpc.dbProperties.update.useMutation({
    onSettled: () => utils.dbProperties.list.invalidate({ databaseId }),
  });

  // --- State ---
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [aggregations, setAggregations] = useState<
    Record<string, AggregationType>
  >({});
  const resizeRef = useRef<{
    propertyId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // --- セル値のルックアップマップ ---
  const cellMap = useMemo(() => {
    const map = new Map<string, CellValue>();
    if (data?.cells) {
      for (const cell of data.cells) {
        map.set(`${cell.pageId}:${cell.propertyId}`, cell.value as CellValue);
      }
    }
    return map;
  }, [data?.cells]);

  // --- 表示するプロパティ (visible & position 順) ---
  const visibleProperties = useMemo(() => {
    return (properties ?? []).filter((p) => p.isVisible);
  }, [properties]);

  // --- ソート適用 ---
  const sortedRows = useMemo(() => {
    const rows = [...(data?.rows ?? [])];
    if (sorts.length === 0) return rows;

    rows.sort((a, b) => {
      for (const sort of sorts) {
        const aVal = cellMap.get(`${a.id}:${sort.propertyId}`);
        const bVal = cellMap.get(`${b.id}:${sort.propertyId}`);
        const prop = visibleProperties.find((p) => p.id === sort.propertyId);

        // Title property uses page title
        const aStr =
          prop?.type === "title" ? a.title : aVal != null ? String(aVal) : "";
        const bStr =
          prop?.type === "title" ? b.title : bVal != null ? String(bVal) : "";

        const cmp = aStr.localeCompare(bStr, "ja");
        if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
    return rows;
  }, [data?.rows, sorts, cellMap, visibleProperties]);

  // --- フィルタ適用 ---
  const filteredRows = useMemo(() => {
    if (filters.length === 0) return sortedRows;

    return sortedRows.filter((row) => {
      return filters.every((filter) => {
        const prop = visibleProperties.find((p) => p.id === filter.propertyId);
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
  }, [sortedRows, filters, cellMap, visibleProperties]);

  // --- セル値更新ハンドラ ---
  const handleCellChange = useCallback(
    (pageId: string, propertyId: string, value: CellValue) => {
      // title プロパティの場合はページのtitleを更新
      const prop = visibleProperties.find((p) => p.id === propertyId);
      if (prop?.type === "title") {
        // TODO: pages.update を呼ぶ (title 更新)
        return;
      }
      updateCell.mutate({ pageId, propertyId, value });
    },
    [updateCell, visibleProperties],
  );

  // --- 列リサイズ ---
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, propertyId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startWidth =
        columnWidths[propertyId] ??
        visibleProperties.find((p) => p.id === propertyId)?.width ??
        200;
      resizeRef.current = { propertyId, startX: e.clientX, startWidth };

      function onMouseMove(ev: MouseEvent) {
        if (!resizeRef.current) return;
        const diff = ev.clientX - resizeRef.current.startX;
        const newWidth = Math.max(80, resizeRef.current.startWidth + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizeRef.current!.propertyId]: newWidth,
        }));
      }

      function onMouseUp() {
        if (resizeRef.current) {
          const { propertyId: pid } = resizeRef.current;
          const width = columnWidths[pid] ?? 200;
          updateProperty.mutate({ propertyId: pid, width });
        }
        resizeRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [columnWidths, visibleProperties, updateProperty],
  );

  // --- 新規列追加 ---
  const handleAddColumn = useCallback(() => {
    createProperty.mutate({
      databaseId,
      name: "新しい列",
      type: "text",
    });
  }, [databaseId, createProperty]);

  // --- 新規行追加 ---
  const handleAddRow = useCallback(() => {
    createRow.mutate({ databaseId });
  }, [databaseId, createRow]);

  // --- ローディング ---
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[32px] animate-pulse rounded bg-[var(--bg-tertiary)]"
          />
        ))}
      </div>
    );
  }

  const activeSort = (propertyId: string): SortRule | undefined =>
    sorts.find((s) => s.propertyId === propertyId);

  return (
    <div className="database-table-wrapper overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        {/* === ヘッダー === */}
        <thead>
          <tr className="border-b border-[var(--border-default)]">
            {visibleProperties.map((prop, idx) => {
              const width = columnWidths[prop.id] ?? prop.width ?? 200;
              const sort = activeSort(prop.id);
              const isTitle = prop.type === "title";

              return (
                <th
                  key={prop.id}
                  className="relative h-[33px] border-r border-[var(--border-default)] text-left font-normal text-[var(--text-secondary)]"
                  style={{
                    width: `${width}px`,
                    minWidth: `${width}px`,
                    position: isTitle ? "sticky" : undefined,
                    left: isTitle ? 0 : undefined,
                    zIndex: isTitle ? 2 : 1,
                    backgroundColor: "var(--bg-primary)",
                  }}
                >
                  <button
                    className="flex h-full w-full items-center gap-1.5 px-2 py-1 hover:bg-[var(--bg-hover)]"
                    onClick={() =>
                      setActiveHeaderMenu(
                        activeHeaderMenu === prop.id ? null : prop.id,
                      )
                    }
                  >
                    <span className="truncate">{prop.name}</span>
                    {sort && (
                      <span className="shrink-0 text-[var(--accent-blue)]">
                        {sort.direction === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )}
                      </span>
                    )}
                  </button>

                  {/* ColumnHeaderMenu */}
                  {activeHeaderMenu === prop.id && (
                    <ColumnHeaderMenu
                      property={prop}
                      databaseId={databaseId}
                      onClose={() => setActiveHeaderMenu(null)}
                    />
                  )}

                  {/* リサイズハンドル */}
                  <div
                    className="absolute right-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[var(--accent-blue)]"
                    onMouseDown={(e) => handleResizeStart(e, prop.id)}
                  />
                </th>
              );
            })}

            {/* 新規列追加ボタン */}
            <th className="h-[33px] w-[44px] border-r border-[var(--border-default)]">
              <button
                onClick={handleAddColumn}
                className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                title="列を追加"
              >
                <Plus size={14} />
              </button>
            </th>
          </tr>
        </thead>

        {/* === ボディ === */}
        <tbody>
          {filteredRows.map((row) => (
            <tr
              key={row.id}
              className="group/row border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
            >
              {visibleProperties.map((prop) => {
                const isTitle = prop.type === "title";
                const cellKey = `${row.id}:${prop.id}`;
                const cellValue = isTitle
                  ? row.title
                  : (cellMap.get(cellKey) ?? null);
                const width = columnWidths[prop.id] ?? prop.width ?? 200;

                return (
                  <td
                    key={prop.id}
                    className="h-[33px] border-r border-[var(--border-default)]"
                    style={{
                      width: `${width}px`,
                      minWidth: `${width}px`,
                      position: isTitle ? "sticky" : undefined,
                      left: isTitle ? 0 : undefined,
                      zIndex: isTitle ? 1 : undefined,
                      backgroundColor: "var(--bg-primary)",
                    }}
                  >
                    <PropertyEditor
                      type={prop.type as PropertyType}
                      value={cellValue}
                      onChange={(v) => handleCellChange(row.id, prop.id, v)}
                      config={prop.config as Record<string, unknown>}
                      pageId={row.id}
                      workspaceId={workspaceId}
                    />
                  </td>
                );
              })}
              <td className="h-[33px] w-[44px]" />
            </tr>
          ))}

          {/* 新規行追加 */}
          <tr>
            <td colSpan={visibleProperties.length + 1} className="h-[33px]">
              <button
                onClick={handleAddRow}
                className="flex h-full w-full items-center gap-1.5 px-2 text-[13px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              >
                <Plus size={14} />
                新規
              </button>
            </td>
          </tr>
        </tbody>

        {/* === フッター (集計) === */}
        <tfoot>
          <TableFooter
            properties={visibleProperties}
            rows={filteredRows}
            cellMap={cellMap}
            aggregations={aggregations}
            onAggregationChange={(propertyId, type) =>
              setAggregations((prev) => ({ ...prev, [propertyId]: type }))
            }
            columnWidths={columnWidths}
          />
        </tfoot>
      </table>
    </div>
  );
}
