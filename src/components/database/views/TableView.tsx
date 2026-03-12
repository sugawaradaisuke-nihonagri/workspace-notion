"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Plus, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// ========== Sortable Row ==========
interface SortableRowProps {
  rowId: string;
  children: React.ReactNode;
}

function SortableRow({ rowId, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });

  return (
    <tr
      ref={setNodeRef}
      className="group/row border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {/* Drag handle cell */}
      <td className="h-[33px] w-[28px] border-r border-[var(--border-default)]">
        <button
          {...attributes}
          {...listeners}
          className="flex h-full w-full cursor-grab items-center justify-center text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover/row:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </button>
      </td>
      {children}
    </tr>
  );
}

// ========== Sortable Column Header ==========
interface SortableColumnHeaderProps {
  propertyId: string;
  isTitle: boolean;
  width: number;
  sort: SortRule | undefined;
  name: string;
  onHeaderClick: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  headerMenu: React.ReactNode;
}

function SortableColumnHeader({
  propertyId,
  isTitle,
  width,
  sort,
  name,
  onHeaderClick,
  onResizeStart,
  headerMenu,
}: SortableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: propertyId, disabled: isTitle });

  return (
    <th
      ref={setNodeRef}
      className="relative h-[33px] border-r border-[var(--border-default)] text-left font-normal text-[var(--text-secondary)]"
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        position: isTitle ? "sticky" : undefined,
        left: isTitle ? 0 : undefined,
        zIndex: isTitle ? 2 : isDragging ? 10 : 1,
        backgroundColor: "var(--bg-primary)",
        transform: isTitle ? undefined : CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex h-full w-full items-center">
        {/* Column drag handle (non-title columns only) */}
        {!isTitle && (
          <button
            {...attributes}
            {...listeners}
            className="flex h-full shrink-0 cursor-grab items-center px-0.5 text-[var(--text-tertiary)] opacity-0 transition-opacity hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical size={10} />
          </button>
        )}
        <button
          className="flex h-full flex-1 items-center gap-1.5 px-2 py-1 hover:bg-[var(--bg-hover)]"
          onClick={onHeaderClick}
        >
          <span className="truncate">{name}</span>
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
      </div>

      {headerMenu}

      {/* リサイズハンドル */}
      <div
        className="absolute right-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[var(--accent-blue)]"
        onMouseDown={onResizeStart}
      />
    </th>
  );
}

// ========== Main TableView ==========
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
    // --- Optimistic Update ---
    onMutate: async (variables) => {
      await utils.dbRows.list.cancel({ databaseId });
      const prev = utils.dbRows.list.getData({ databaseId });
      if (prev) {
        const existingIdx = prev.cells.findIndex(
          (c) =>
            c.pageId === variables.pageId &&
            c.propertyId === variables.propertyId,
        );
        const newCells = [...prev.cells];
        if (existingIdx >= 0) {
          newCells[existingIdx] = {
            ...newCells[existingIdx],
            value: variables.value as Record<string, unknown> | null,
          };
        } else {
          newCells.push({
            id: crypto.randomUUID(),
            pageId: variables.pageId,
            propertyId: variables.propertyId,
            value: variables.value as Record<string, unknown> | null,
            updatedAt: new Date(),
          });
        }
        utils.dbRows.list.setData({ databaseId }, { ...prev, cells: newCells });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.dbRows.list.setData({ databaseId }, ctx.prev);
      }
    },
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

  // --- Row reorder ---
  const reorderPage = trpc.pages.reorder.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });

  // --- Column reorder ---
  const reorderProperty = trpc.dbProperties.reorder.useMutation({
    onSettled: () => utils.dbProperties.list.invalidate({ databaseId }),
  });

  // --- Title 更新 (pages.update) ---
  const updatePage = trpc.pages.update.useMutation({
    onMutate: async (variables) => {
      await utils.dbRows.list.cancel({ databaseId });
      const prev = utils.dbRows.list.getData({ databaseId });
      if (prev && variables.title != null) {
        const newRows = prev.rows.map((r) =>
          r.id === variables.pageId ? { ...r, title: variables.title! } : r,
        );
        utils.dbRows.list.setData({ databaseId }, { ...prev, rows: newRows });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.dbRows.list.setData({ databaseId }, ctx.prev);
      }
    },
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });

  // --- State ---
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [aggregations, setAggregations] = useState<
    Record<string, AggregationType>
  >({});
  const [dragMode, setDragMode] = useState<"row" | "column" | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const resizeRef = useRef<{
    propertyId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // --- DnD sensors ---
  const rowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const colSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
      const prop = visibleProperties.find((p) => p.id === propertyId);
      if (prop?.type === "title") {
        updatePage.mutate({ pageId, title: String(value ?? "") });
        return;
      }
      updateCell.mutate({ pageId, propertyId, value });
    },
    [updateCell, updatePage, visibleProperties],
  );

  // --- プロパティ config 更新 (Select 新オプション追加用) ---
  const handleConfigChange = useCallback(
    (propertyId: string, config: Record<string, unknown>) => {
      updateProperty.mutate({ propertyId, config });
    },
    [updateProperty],
  );

  // --- Row D&D handlers ---
  const handleRowDragStart = useCallback((event: DragStartEvent) => {
    setDragMode("row");
    setActiveDragId(String(event.active.id));
  }, []);

  const handleRowDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragMode(null);
      setActiveDragId(null);
      if (!over || active.id === over.id) return;

      const activeIdx = filteredRows.findIndex((r) => r.id === active.id);
      const overIdx = filteredRows.findIndex((r) => r.id === over.id);
      if (activeIdx === -1 || overIdx === -1) return;

      // Determine afterPageId for the reorder API
      // If moving down (overIdx > activeIdx), afterPageId = over row
      // If moving up (overIdx < activeIdx), afterPageId = row before over
      const afterPageId =
        overIdx === 0
          ? null
          : overIdx > activeIdx
            ? filteredRows[overIdx].id
            : (filteredRows[overIdx - 1]?.id ?? null);

      reorderPage.mutate({
        pageId: String(active.id),
        afterPageId,
        parentId: databaseId,
      });
    },
    [filteredRows, reorderPage, databaseId],
  );

  // --- Column D&D handlers ---
  const handleColDragStart = useCallback((event: DragStartEvent) => {
    setDragMode("column");
    setActiveDragId(String(event.active.id));
  }, []);

  const handleColDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragMode(null);
      setActiveDragId(null);
      if (!over || active.id === over.id) return;

      const activeIdx = visibleProperties.findIndex((p) => p.id === active.id);
      const overIdx = visibleProperties.findIndex((p) => p.id === over.id);
      if (activeIdx === -1 || overIdx === -1) return;

      // Title column (index 0) should not be moved
      const activeP = visibleProperties[activeIdx];
      if (activeP.type === "title") return;

      const afterPropertyId =
        overIdx === 0
          ? null
          : overIdx > activeIdx
            ? visibleProperties[overIdx].id
            : (visibleProperties[overIdx - 1]?.id ?? null);

      reorderProperty.mutate({
        propertyId: String(active.id),
        afterPropertyId,
      });
    },
    [visibleProperties, reorderProperty],
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

  const draggedRow =
    activeDragId && dragMode === "row"
      ? filteredRows.find((r) => r.id === activeDragId)
      : null;

  const draggedCol =
    activeDragId && dragMode === "column"
      ? visibleProperties.find((p) => p.id === activeDragId)
      : null;

  return (
    <div className="database-table-wrapper overflow-x-auto">
      {/* Column D&D context (wraps headers) */}
      <DndContext
        sensors={colSensors}
        collisionDetection={closestCenter}
        onDragStart={handleColDragStart}
        onDragEnd={handleColDragEnd}
      >
        {/* Row D&D context (wraps tbody) */}
        <DndContext
          sensors={rowSensors}
          collisionDetection={closestCenter}
          onDragStart={handleRowDragStart}
          onDragEnd={handleRowDragEnd}
        >
          <table className="w-full border-collapse text-[13px]">
            {/* === ヘッダー === */}
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {/* Drag handle column header */}
                <th className="h-[33px] w-[28px] border-r border-[var(--border-default)]" />

                <SortableContext
                  items={visibleProperties.map((p) => p.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {visibleProperties.map((prop) => {
                    const width = columnWidths[prop.id] ?? prop.width ?? 200;
                    const sort = activeSort(prop.id);
                    const isTitle = prop.type === "title";

                    return (
                      <SortableColumnHeader
                        key={prop.id}
                        propertyId={prop.id}
                        isTitle={isTitle}
                        width={width}
                        sort={sort}
                        name={prop.name}
                        onHeaderClick={() =>
                          setActiveHeaderMenu(
                            activeHeaderMenu === prop.id ? null : prop.id,
                          )
                        }
                        onResizeStart={(e) => handleResizeStart(e, prop.id)}
                        headerMenu={
                          activeHeaderMenu === prop.id ? (
                            <ColumnHeaderMenu
                              property={prop}
                              databaseId={databaseId}
                              onClose={() => setActiveHeaderMenu(null)}
                            />
                          ) : null
                        }
                      />
                    );
                  })}
                </SortableContext>

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
            <SortableContext
              items={filteredRows.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {filteredRows.map((row) => (
                  <SortableRow key={row.id} rowId={row.id}>
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
                            left: isTitle ? 28 : undefined,
                            zIndex: isTitle ? 1 : undefined,
                            backgroundColor: "var(--bg-primary)",
                          }}
                        >
                          <PropertyEditor
                            type={prop.type as PropertyType}
                            value={cellValue}
                            onChange={(v) =>
                              handleCellChange(row.id, prop.id, v)
                            }
                            config={prop.config as Record<string, unknown>}
                            onConfigChange={(c) =>
                              handleConfigChange(prop.id, c)
                            }
                            pageId={row.id}
                            workspaceId={workspaceId}
                          />
                        </td>
                      );
                    })}
                    <td className="h-[33px] w-[44px]" />
                  </SortableRow>
                ))}

                {/* 新規行追加 */}
                <tr>
                  <td
                    colSpan={visibleProperties.length + 2}
                    className="h-[33px]"
                  >
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
            </SortableContext>

            {/* === フッター (集計) === */}
            <tfoot>
              <TableFooter
                properties={visibleProperties}
                rows={filteredRows}
                cellMap={cellMap}
                aggregations={aggregations}
                onAggregationChange={(propertyId, type) =>
                  setAggregations((prev) => ({
                    ...prev,
                    [propertyId]: type,
                  }))
                }
                columnWidths={columnWidths}
              />
            </tfoot>
          </table>

          {/* Row drag overlay */}
          <DragOverlay>
            {draggedRow ? (
              <div className="rounded border border-[var(--accent-blue)] bg-[var(--bg-primary)] px-3 py-1.5 text-[13px] shadow-lg">
                {draggedRow.icon && (
                  <span className="mr-1">{draggedRow.icon}</span>
                )}
                {draggedRow.title || "Untitled"}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Column drag overlay */}
        <DragOverlay>
          {draggedCol ? (
            <div className="rounded border border-[var(--accent-blue)] bg-[var(--bg-primary)] px-3 py-1.5 text-[12px] font-medium shadow-lg">
              {draggedCol.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
