"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { ViewTabs } from "./ViewTabs";
import { TableView } from "./views/TableView";
import { BoardView } from "./views/BoardView";
import { CalendarView } from "./views/CalendarView";
import { GalleryView } from "./views/GalleryView";
import { FilterBar, SortBar, GroupBar } from "./controls";
import type { FilterCondition, SortRule } from "@/types/database";

interface DatabasePageProps {
  databaseId: string;
  workspaceId: string;
}

export function DatabasePage({ databaseId, workspaceId }: DatabasePageProps) {
  const utils = trpc.useUtils();

  // --- Data ---
  const { data: views } = trpc.dbViews.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });
  const { data: rowData } = trpc.dbRows.list.useQuery({ databaseId });

  const updateView = trpc.dbViews.update.useMutation({
    onSettled: () => utils.dbViews.list.invalidate({ databaseId }),
  });
  const createRow = trpc.dbRows.create.useMutation({
    onSettled: () => utils.dbRows.list.invalidate({ databaseId }),
  });

  // --- Active view ---
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const activeView = useMemo(() => {
    if (views && views.length > 0) {
      return views.find((v) => v.id === activeViewId) ?? views[0];
    }
    return null;
  }, [views, activeViewId]);

  // --- Local filter/sort/group state ---
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);

  // --- View switch: restore filter/sort from view config ---
  const handleViewSwitch = useCallback(
    (viewId: string) => {
      setActiveViewId(viewId);
      const view = views?.find((v) => v.id === viewId);
      if (view) {
        setFilters(
          (view.filter as { conditions?: FilterCondition[] })?.conditions ?? [],
        );
        setSorts((view.sort as SortRule[]) ?? []);
        setGroupBy(
          (view.groupBy as { propertyId?: string })?.propertyId ?? null,
        );
      }
    },
    [views],
  );

  // --- Persist filter/sort/group changes to view ---
  const handleFiltersChange = useCallback(
    (newFilters: FilterCondition[]) => {
      setFilters(newFilters);
      if (activeView) {
        updateView.mutate({
          viewId: activeView.id,
          filter: { connector: "and", conditions: newFilters },
        });
      }
    },
    [activeView, updateView],
  );

  const handleSortsChange = useCallback(
    (newSorts: SortRule[]) => {
      setSorts(newSorts);
      if (activeView) {
        updateView.mutate({
          viewId: activeView.id,
          sort: newSorts as unknown as Record<string, unknown>[],
        });
      }
    },
    [activeView, updateView],
  );

  const handleGroupByChange = useCallback(
    (propertyId: string | null) => {
      setGroupBy(propertyId);
      if (activeView) {
        updateView.mutate({
          viewId: activeView.id,
          groupBy: propertyId ? { propertyId } : {},
        });
      }
    },
    [activeView, updateView],
  );

  const handleAddRow = useCallback(() => {
    createRow.mutate({ databaseId });
  }, [databaseId, createRow]);

  const visibleProperties = useMemo(() => {
    return (properties ?? []).filter((p) => p.isVisible);
  }, [properties]);

  const rowCount = rowData?.rows?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* === DB Header === */}
      <div className="flex items-center gap-3 px-4 pb-1 pt-2">
        <span className="text-[13px] text-[var(--text-tertiary)]">
          {rowCount} 件
        </span>
        <div className="flex-1" />
        <button
          onClick={handleAddRow}
          className="flex items-center gap-1.5 rounded-[6px] bg-[var(--accent-blue)] px-3 py-1 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          新規
        </button>
      </div>

      {/* === ViewTabs + Controls === */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)] px-4 py-1">
        {/* View tabs */}
        {views && views.length > 0 && (
          <ViewTabs
            databaseId={databaseId}
            views={views.map((v) => ({
              id: v.id,
              name: v.name,
              layout: v.layout,
              isLocked: v.isLocked,
            }))}
            activeViewId={activeView?.id ?? null}
            onViewSwitch={handleViewSwitch}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-1">
          <FilterBar
            properties={visibleProperties}
            filters={filters}
            onChange={handleFiltersChange}
          />
          <SortBar
            properties={visibleProperties}
            sorts={sorts}
            onChange={handleSortsChange}
          />
          <GroupBar
            properties={visibleProperties}
            groupBy={groupBy}
            onChange={handleGroupByChange}
          />
        </div>
      </div>

      {/* === View Content === */}
      <div className="flex-1 overflow-auto">{renderView()}</div>
    </div>
  );

  function renderView() {
    const layout = activeView?.layout ?? "table";

    switch (layout) {
      case "table":
        return (
          <TableView
            databaseId={databaseId}
            workspaceId={workspaceId}
            viewId={activeView?.id}
            filters={filters}
            sorts={sorts}
          />
        );
      case "board":
        return (
          <BoardView
            databaseId={databaseId}
            workspaceId={workspaceId}
            viewId={activeView?.id}
            filters={filters}
            sorts={sorts}
            groupByPropertyId={groupBy}
          />
        );
      case "calendar":
        return (
          <CalendarView
            databaseId={databaseId}
            workspaceId={workspaceId}
            viewId={activeView?.id}
            filters={filters}
            sorts={sorts}
          />
        );
      case "gallery":
        return (
          <GalleryView
            databaseId={databaseId}
            workspaceId={workspaceId}
            viewId={activeView?.id}
            filters={filters}
            sorts={sorts}
          />
        );
      default:
        return (
          <div className="flex h-full items-center justify-center text-[14px] text-[var(--text-tertiary)]">
            {layout} ビューは未実装です
          </div>
        );
    }
  }
}
