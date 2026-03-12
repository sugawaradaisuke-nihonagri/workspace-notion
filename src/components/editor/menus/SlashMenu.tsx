"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashCommandItem } from "../extensions/slash-command";

export interface SlashMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SlashMenuProps extends SuggestionProps<SlashCommandItem> {}

const CATEGORY_LABELS: Record<string, string> = {
  basic: "基本ブロック",
  media: "メディア",
  advanced: "高度",
};

const CATEGORY_ORDER = ["basic", "media", "advanced"] as const;

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  function SlashMenu(props, ref) {
    const { items, command } = props;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    // リスト変更時にインデックスをリセット
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command(item);
        }
      },
      [items, command],
    );

    // キーボード操作
    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          selectItem(selectedIndex);
          return true;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          return true;
        }

        return false;
      },
    }));

    // 選択中アイテムをスクロール追従
    useEffect(() => {
      const list = listRef.current;
      if (!list) return;
      const selected = list.querySelector(
        `[data-index="${selectedIndex}"]`,
      ) as HTMLElement | null;
      selected?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    if (items.length === 0) {
      return (
        <div
          className="w-[300px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-center py-6 text-[13px] text-[var(--text-tertiary)]">
            該当するブロックなし
          </div>
        </div>
      );
    }

    // カテゴリ別にグルーピング
    const grouped = new Map<
      string,
      { item: SlashCommandItem; flatIndex: number }[]
    >();
    items.forEach((item, flatIndex) => {
      const list = grouped.get(item.category) ?? [];
      list.push({ item, flatIndex });
      grouped.set(item.category, list);
    });

    return (
      <div
        ref={listRef}
        className="w-[300px] max-h-[360px] overflow-y-auto rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-1"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {CATEGORY_ORDER.map((category) => {
          const entries = grouped.get(category);
          if (!entries || entries.length === 0) return null;

          return (
            <div key={category}>
              <div className="px-2 pb-1 pt-2 text-[11px] font-semibold text-[var(--text-tertiary)]">
                {CATEGORY_LABELS[category]}
              </div>
              {entries.map(({ item, flatIndex }) => {
                const isSelected = flatIndex === selectedIndex;
                return (
                  <button
                    key={item.id}
                    data-index={flatIndex}
                    onClick={() => selectItem(flatIndex)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                    className="flex w-full items-center gap-3 rounded-[6px] px-2 py-1.5 text-left transition-colors"
                    style={{
                      background: isSelected
                        ? "var(--bg-hover)"
                        : "transparent",
                    }}
                  >
                    {/* アイコンボックス */}
                    <span className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[16px]">
                      {item.icon}
                    </span>
                    {/* ラベル + 説明 */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                        {item.label}
                      </span>
                      <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                        {item.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  },
);
