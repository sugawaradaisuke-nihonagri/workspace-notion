"use client";

import { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Trash2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc/client";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 30) return `${diffDays}日前`;
  return d.toLocaleDateString("ja-JP");
}

export function TrashModal({ isOpen, onClose, workspaceId }: TrashModalProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: trashedPages, isLoading } = trpc.pages.trash.useQuery(
    { workspaceId },
    { enabled: isOpen },
  );

  const restoreMutation = trpc.pages.restore.useMutation({
    onSuccess: () => {
      utils.pages.trash.invalidate({ workspaceId });
      utils.pages.list.invalidate({ workspaceId });
    },
  });

  const permanentDeleteMutation = trpc.pages.permanentDelete.useMutation({
    onSuccess: () => {
      utils.pages.trash.invalidate({ workspaceId });
    },
  });

  useEffect(() => {
    if (isOpen) {
      setFilterQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Escape キーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function handleRestore(pageId: string): void {
    restoreMutation.mutate({ pageId });
  }

  function handlePermanentDelete(pageId: string): void {
    const confirmed = window.confirm(
      "完全に削除しますか？この操作は取り消せません。",
    );
    if (!confirmed) return;
    permanentDeleteMutation.mutate({ pageId });
  }

  const filteredPages = trashedPages?.filter((page) =>
    page.title.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* モーダル */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-full max-w-[600px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] pointer-events-auto"
              style={{ boxShadow: "var(--shadow-xl)" }}
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  ゴミ箱
                </h2>
                <button
                  onClick={onClose}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 検索入力 */}
              <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4">
                <Search
                  size={16}
                  className="shrink-0 text-[var(--text-tertiary)]"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="削除済みページを検索…"
                  className="h-[44px] flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                />
              </div>

              {/* ページリスト */}
              <div className="max-h-[400px] overflow-y-auto p-2">
                {isLoading && (
                  <div className="flex items-center justify-center py-10 text-[13px] text-[var(--text-tertiary)]">
                    読み込み中…
                  </div>
                )}

                {!isLoading && filteredPages && filteredPages.length === 0 && (
                  <div className="flex items-center justify-center py-10 text-[13px] text-[var(--text-tertiary)]">
                    ゴミ箱は空です
                  </div>
                )}

                {filteredPages?.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    {/* アイコン */}
                    <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center text-[16px]">
                      {page.icon ?? "📄"}
                    </span>

                    {/* タイトル + メタ情報 */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] text-[var(--text-primary)]">
                        {page.title || "Untitled"}
                      </span>
                      <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                        {page.deletedAt
                          ? formatRelativeDate(page.deletedAt)
                          : ""}
                        {page.editorName ? ` — ${page.editorName}` : ""}
                      </span>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleRestore(page.id)}
                        disabled={restoreMutation.isPending}
                        title="復元"
                        className="flex h-[28px] w-[28px] items-center justify-center rounded text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(page.id)}
                        disabled={permanentDeleteMutation.isPending}
                        title="完全削除"
                        className="flex h-[28px] w-[28px] items-center justify-center rounded text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
