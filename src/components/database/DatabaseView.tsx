"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Plus,
  LayoutGrid,
  Table,
  List,
  Calendar,
  GalleryHorizontal,
  GanttChart,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TableView } from "./views/TableView";
import { FilterBar, SortBar, GroupBar } from "./controls";
import type { FilterCondition, SortRule, ViewLayout } from "@/types/database";

// 非デフォルトビューを遅延ロード
const BoardView = dynamic(() =>
  import("./views/BoardView").then((m) => ({ default: m.BoardView })),
);
const CalendarView = dynamic(() =>
  import("./views/CalendarView").then((m) => ({ default: m.CalendarView })),
);
const GalleryView = dynamic(() =>
  import("./views/GalleryView").then((m) => ({ default: m.GalleryView })),
);
const TimelineView = dynamic(() =>
  import("./views/TimelineView").then((m) => ({ default: m.TimelineView })),
);
const ChartView = dynamic(() =>
  import("./views/ChartView").then((m) => ({ default: m.ChartView })),
);

interface DatabaseViewProps {
  databaseId: string;
  workspaceId: string;
}

const VIEW_ICONS: Record<string, React.ReactNode> = {
  table: <Table size={14} />,
  board: <LayoutGrid size={14} />,
  calendar: <Calendar size={14} />,
  gallery: <GalleryHorizontal size={14} />,
  list: <List size={14} />,
  timeline: <GanttChart size={14} />,
  chart: <BarChart3 size={14} />,
};

export function DatabaseView({ databaseId, workspaceId }: DatabaseViewProps) {
  const utils = trpc.useUtils();

  // --- ビュー一覧 ---
  const { data: views } = trpc.dbViews.list.useQuery({ databaseId });
  const { data: properties } = trpc.dbProperties.list.useQuery({ databaseId });

  const createView = trpc.dbViews.create.useMutation({
    onSettled: () => utils.dbViews.list.invalidate({ databaseId }),
  });
  const updateView = trpc.dbViews.update.useMutation({
    onSettled: () => utils.dbViews.list.invalidate({ databaseId }),
  });

  // --- アクティブビュー ---
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const activeView = useMemo(() => {
    if (views && views.length > 0) {
      return views.find((v) => v.id === activeViewId) ?? views[0];
    }
    return null;
  }, [views, activeViewId]);

  // --- ローカルフィルタ/ソート/グループ状態 ---
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);

  // ビューが変わったらフィルタ/ソートをリセット
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

  // --- フィルタ/ソート変更時にビュー設定を保存 ---
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

  const handleAddView = useCallback(() => {
    createView.mutate({
      databaseId,
      name: `ビュー ${(views?.length ?? 0) + 1}`,
      layout: "table",
    });
  }, [databaseId, views, createView]);

  const visibleProperties = useMemo(() => {
    return (properties ?? []).filter((p) => p.isVisible);
  }, [properties]);

  return (
    <div className="flex h-full flex-col">
      {/* === ビュータブ + コントロール === */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)] px-4 py-1">
        {/* View tabs */}
        <div className="flex items-center gap-0.5">
          {views?.map((view) => (
            <button
              key={view.id}
              onClick={() => handleViewSwitch(view.id)}
              className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] transition-colors"
              style={{
                backgroundColor:
                  view.id === (activeView?.id ?? views[0]?.id)
                    ? "var(--bg-hover)"
                    : "transparent",
                color:
                  view.id === (activeView?.id ?? views[0]?.id)
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
              }}
            >
              {VIEW_ICONS[view.layout] ?? <Table size={14} />}
              {view.name}
            </button>
          ))}

          <button
            onClick={handleAddView}
            className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[13px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <Plus size={14} />
          </button>
        </div>

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

      {/* === ビューコンテンツ === */}
      <div className="flex-1 overflow-auto">
        {(() => {
          const layout = activeView?.layout ?? "table";
          const viewProps = {
            databaseId,
            workspaceId,
            viewId: activeView?.id,
            filters,
            sorts,
          };

          switch (layout) {
            case "table":
              return <TableView {...viewProps} />;
            case "board":
              return <BoardView {...viewProps} groupByPropertyId={groupBy} />;
            case "calendar":
              return <CalendarView {...viewProps} />;
            case "gallery":
              return <GalleryView {...viewProps} />;
            case "timeline":
              return <TimelineView {...viewProps} />;
            case "chart":
              return <ChartView {...viewProps} />;
            default:
              return (
                <div className="flex h-full items-center justify-center text-[14px] text-[var(--text-tertiary)]">
                  {layout} ビューは未実装です
                </div>
              );
          }
        })()}
      </div>
    </div>
  );
}
