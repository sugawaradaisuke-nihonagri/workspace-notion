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
import type { MentionItem } from "../extensions/mention-extension";

export interface MentionMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface MentionMenuProps extends SuggestionProps<MentionItem> {}

const TYPE_LABELS: Record<string, string> = {
  user: "メンバー",
  page: "ページリンク",
};

const TYPE_ORDER = ["user", "page"] as const;

export const MentionMenu = forwardRef<MentionMenuRef, MentionMenuProps>(
  function MentionMenu(props, ref) {
    const { items, command } = props;
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

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
          className="w-[280px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-center py-6 text-[13px] text-[var(--text-tertiary)]">
            該当する候補なし
          </div>
        </div>
      );
    }

    // Group by type: users first, then pages
    const grouped = new Map<
      string,
      { item: MentionItem; flatIndex: number }[]
    >();
    items.forEach((item, flatIndex) => {
      const list = grouped.get(item.type) ?? [];
      list.push({ item, flatIndex });
      grouped.set(item.type, list);
    });

    return (
      <div
        ref={listRef}
        className="w-[280px] max-h-[320px] overflow-y-auto rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-1"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {TYPE_ORDER.map((type) => {
          const entries = grouped.get(type);
          if (!entries || entries.length === 0) return null;

          return (
            <div key={type}>
              <div className="px-2 pb-1 pt-2 text-[11px] font-semibold text-[var(--text-tertiary)]">
                {TYPE_LABELS[type]}
              </div>
              {entries.map(({ item, flatIndex }) => {
                const isSelected = flatIndex === selectedIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    data-index={flatIndex}
                    onClick={() => selectItem(flatIndex)}
                    onMouseEnter={() => setSelectedIndex(flatIndex)}
                    className="flex w-full items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left transition-colors"
                    style={{
                      background: isSelected
                        ? "var(--bg-hover)"
                        : "transparent",
                    }}
                  >
                    {/* Avatar / Icon */}
                    {item.type === "user" ? (
                      item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="h-[22px] w-[22px] shrink-0 rounded-full"
                        />
                      ) : (
                        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[11px] font-medium text-white">
                          {item.label.charAt(0).toUpperCase()}
                        </span>
                      )
                    ) : (
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center text-[14px]">
                        {item.icon ?? "📄"}
                      </span>
                    )}

                    {/* Label */}
                    <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                      {item.label}
                    </span>
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
