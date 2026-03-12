"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Table,
  LayoutGrid,
  Calendar,
  Image,
  List,
  MoreHorizontal,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Pencil,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import type { ViewLayout } from "@/types/database";

interface ViewTabsProps {
  databaseId: string;
  views: Array<{
    id: string;
    name: string;
    layout: string;
    isLocked: boolean | null;
  }>;
  activeViewId: string | null;
  onViewSwitch: (viewId: string) => void;
}

const VIEW_ICONS: Record<string, React.ReactNode> = {
  table: <Table size={14} />,
  board: <LayoutGrid size={14} />,
  calendar: <Calendar size={14} />,
  gallery: <Image size={14} />,
  list: <List size={14} />,
};

const LAYOUT_OPTIONS: {
  value: ViewLayout;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "table", label: "テーブル", icon: <Table size={14} /> },
  { value: "board", label: "ボード", icon: <LayoutGrid size={14} /> },
  { value: "calendar", label: "カレンダー", icon: <Calendar size={14} /> },
  { value: "gallery", label: "ギャラリー", icon: <Image size={14} /> },
];

export function ViewTabs({
  databaseId,
  views,
  activeViewId,
  onViewSwitch,
}: ViewTabsProps) {
  const utils = trpc.useUtils();

  const createView = trpc.dbViews.create.useMutation({
    onSettled: () => utils.dbViews.list.invalidate({ databaseId }),
  });
  const updateView = trpc.dbViews.update.useMutation({
    onSettled: () => utils.dbViews.list.invalidate({ databaseId }),
  });
  const deleteView = trpc.dbViews.delete.useMutation({
    onSettled: () => utils.dbViews.list.invalidate({ databaseId }),
  });

  const [contextMenuViewId, setContextMenuViewId] = useState<string | null>(
    null,
  );
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [renamingViewId, setRenamingViewId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // --- Close menus on outside click ---
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenuViewId(null);
      }
      if (
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus rename input
  useEffect(() => {
    if (renamingViewId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingViewId]);

  // --- Context menu handlers ---
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, viewId: string) => {
      e.preventDefault();
      setContextMenuViewId(viewId);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleRenameStart = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (view) {
        setRenamingViewId(viewId);
        setRenameValue(view.name);
      }
      setContextMenuViewId(null);
    },
    [views],
  );

  const handleRenameSubmit = useCallback(() => {
    if (renamingViewId && renameValue.trim()) {
      updateView.mutate({
        viewId: renamingViewId,
        name: renameValue.trim(),
      });
    }
    setRenamingViewId(null);
  }, [renamingViewId, renameValue, updateView]);

  const handleDuplicate = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (view) {
        createView.mutate({
          databaseId,
          name: `${view.name} のコピー`,
          layout: view.layout as ViewLayout,
        });
      }
      setContextMenuViewId(null);
    },
    [views, databaseId, createView],
  );

  const handleToggleLock = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (view) {
        updateView.mutate({
          viewId,
          isLocked: !view.isLocked,
        });
      }
      setContextMenuViewId(null);
    },
    [views, updateView],
  );

  const handleDelete = useCallback(
    (viewId: string) => {
      if (views.length <= 1) return; // Can't delete last view
      deleteView.mutate({ viewId });
      setContextMenuViewId(null);
    },
    [views, deleteView],
  );

  const handleAddView = useCallback(
    (layout: ViewLayout) => {
      const layoutLabels: Record<string, string> = {
        table: "テーブル",
        board: "ボード",
        calendar: "カレンダー",
        gallery: "ギャラリー",
      };
      createView.mutate({
        databaseId,
        name: `${layoutLabels[layout] ?? layout} ビュー`,
        layout,
      });
      setShowAddMenu(false);
    },
    [databaseId, createView],
  );

  const resolvedActiveId = activeViewId ?? views[0]?.id;

  return (
    <div className="flex items-center gap-0.5">
      {views.map((view) => {
        const isActive = view.id === resolvedActiveId;

        return (
          <div key={view.id} className="relative">
            {renamingViewId === view.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setRenamingViewId(null);
                }}
                className="w-[100px] rounded-[6px] bg-[var(--bg-secondary)] px-2.5 py-1 text-[13px] text-[var(--text-primary)] outline-none"
              />
            ) : (
              <button
                onClick={() => onViewSwitch(view.id)}
                onContextMenu={(e) => handleContextMenu(e, view.id)}
                className="flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[13px] transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--bg-hover)" : "transparent",
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                }}
              >
                {VIEW_ICONS[view.layout] ?? <Table size={14} />}
                <span className="max-w-[120px] truncate">{view.name}</span>
                {view.isLocked && (
                  <Lock size={10} className="text-[var(--text-tertiary)]" />
                )}
              </button>
            )}
          </div>
        );
      })}

      {/* Add view button */}
      <div className="relative" ref={addMenuRef}>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[13px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
        >
          <Plus size={14} />
        </button>

        {showAddMenu && (
          <div
            className="absolute left-0 top-full z-50 mt-1 w-[180px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <div className="px-3 pb-1 pt-2 text-[11px] font-semibold text-[var(--text-tertiary)]">
              レイアウト
            </div>
            {LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAddView(opt.value)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenuViewId && contextMenuPos && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-[180px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{
            left: contextMenuPos.x,
            top: contextMenuPos.y,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="py-1">
            {/* Rename */}
            <button
              onClick={() => handleRenameStart(contextMenuViewId)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <Pencil size={14} />
              名前を変更
            </button>

            {/* Duplicate */}
            <button
              onClick={() => handleDuplicate(contextMenuViewId)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              <Copy size={14} />
              複製
            </button>

            {/* Lock/Unlock */}
            <button
              onClick={() => handleToggleLock(contextMenuViewId)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              {views.find((v) => v.id === contextMenuViewId)?.isLocked ? (
                <>
                  <Unlock size={14} />
                  ロック解除
                </>
              ) : (
                <>
                  <Lock size={14} />
                  ロック
                </>
              )}
            </button>

            {/* Delete */}
            {views.length > 1 && (
              <>
                <div className="mx-2 my-1 border-t border-[var(--border-default)]" />
                <button
                  onClick={() => handleDelete(contextMenuViewId)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[#e57373] hover:bg-[var(--bg-hover)]"
                >
                  <Trash2 size={14} />
                  削除
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
