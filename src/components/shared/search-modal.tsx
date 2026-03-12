"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, FileText, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchStore } from "@/stores/search-store";
import { trpc } from "@/lib/trpc/client";

interface SearchResult {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  type: "page" | "database" | "database_row";
  updatedAt: Date;
}

export function SearchModal() {
  const { isOpen, close } = useSearchStore();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string | undefined;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K グローバルショートカット
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useSearchStore.getState().toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // モーダルオープン時にフォーカス + リセット
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIndex(0);
      // 次フレームでフォーカス（AnimatePresence のマウント後）
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // debounce 200ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // 検索クエリ
  const { data: searchResults, isLoading: isSearching } =
    trpc.pages.search.useQuery(
      { workspaceId: workspaceId ?? "", query: debouncedQuery },
      {
        enabled: !!workspaceId && debouncedQuery.length > 0,
      },
    );

  // 最近のページ（全ページを updatedAt 降順で6件）
  const { data: allPages } = trpc.pages.list.useQuery(
    { workspaceId: workspaceId ?? "" },
    { enabled: !!workspaceId },
  );

  const recentPages: SearchResult[] = allPages
    ? [...allPages]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 6)
    : [];

  // 親ページ名のルックアップ
  const pageMap = new Map(allPages?.map((p) => [p.id, p]) ?? []);
  function getParentName(parentId: string | null): string | null {
    if (!parentId) return null;
    return pageMap.get(parentId)?.title ?? null;
  }

  // 表示するリスト
  const isSearchMode = debouncedQuery.length > 0;
  const displayItems: SearchResult[] = isSearchMode
    ? (searchResults ?? [])
    : recentPages;

  // selectedIndex をリスト範囲に収める
  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  // 遷移ハンドラ
  const handleSelect = useCallback(
    (pageId: string) => {
      if (!workspaceId) return;
      router.push(`/${workspaceId}/${pageId}`);
      close();
    },
    [workspaceId, router, close],
  );

  // キーボードナビゲーション
  function handleKeyDown(e: React.KeyboardEvent): void {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < displayItems.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : displayItems.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (displayItems[selectedIndex]) {
          handleSelect(displayItems[selectedIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  }

  // 選択中アイテムのスクロール追従
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!workspaceId) return null;

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
            className="fixed inset-0 z-50 bg-black/40"
            style={{ backdropFilter: "blur(6px)" }}
            onClick={close}
          />

          {/* モーダル */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 z-50 w-[540px] -translate-x-1/2 overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)]"
            style={{ top: "14vh", boxShadow: "var(--shadow-xl)" }}
            onKeyDown={handleKeyDown}
          >
            {/* 検索入力 */}
            <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4">
              <Search
                size={16}
                className="shrink-0 text-[var(--text-tertiary)]"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ページを検索…"
                className="h-[48px] flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
              />
              <kbd
                onClick={close}
                className="cursor-pointer rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
              >
                ESC
              </kbd>
            </div>

            {/* 結果リスト */}
            <div ref={listRef} className="max-h-[340px] overflow-y-auto p-2">
              {/* セクション見出し */}
              {!isSearchMode && displayItems.length > 0 && (
                <div className="px-2 pb-1 pt-1 text-[11px] font-semibold text-[var(--text-tertiary)]">
                  最近のページ
                </div>
              )}

              {isSearchMode && isSearching && (
                <div className="flex items-center justify-center py-8 text-[13px] text-[var(--text-tertiary)]">
                  検索中…
                </div>
              )}

              {isSearchMode && !isSearching && displayItems.length === 0 && (
                <div className="flex items-center justify-center py-8 text-[13px] text-[var(--text-tertiary)]">
                  一致するページはありません
                </div>
              )}

              {!isSearchMode && displayItems.length === 0 && (
                <div className="flex items-center justify-center py-8 text-[13px] text-[var(--text-tertiary)]">
                  ページがありません
                </div>
              )}

              {displayItems.map((item, index) => {
                const parentName = getParentName(item.parentId);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left transition-colors"
                    style={{
                      background: isSelected
                        ? "var(--bg-hover)"
                        : "transparent",
                    }}
                  >
                    {/* アイコン */}
                    <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center text-[16px]">
                      {item.icon ?? (item.type === "database" ? "🗃️" : "📄")}
                    </span>

                    {/* タイトル + 親 */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] text-[var(--text-primary)]">
                        {item.title}
                      </span>
                      {parentName && (
                        <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                          {parentName}
                        </span>
                      )}
                    </div>

                    {/* タイプバッジ */}
                    {item.type === "database" && (
                      <Database
                        size={12}
                        className="shrink-0 text-[var(--text-tertiary)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
