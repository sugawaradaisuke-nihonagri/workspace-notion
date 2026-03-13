"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface PageHeaderProps {
  pageId: string;
  workspaceId: string;
}

// --- Cover gradients ---
const COVER_GRADIENTS = [
  {
    id: "gradient-1",
    label: "オーシャン",
    css: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "gradient-2",
    label: "サンセット",
    css: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    id: "gradient-3",
    label: "フォレスト",
    css: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "gradient-4",
    label: "ゴールド",
    css: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
  },
  {
    id: "gradient-5",
    label: "ミッドナイト",
    css: "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)",
  },
] as const;

export function PageHeader({ pageId, workspaceId }: PageHeaderProps) {
  const utils = trpc.useUtils();

  // --- Page data ---
  const { data: page } = trpc.pages.get.useQuery({ pageId });
  const updatePage = trpc.pages.update.useMutation({
    onMutate: async (newData) => {
      await utils.pages.get.cancel({ pageId });
      await utils.pages.list.cancel({ workspaceId });

      const previousPage = utils.pages.get.getData({ pageId });
      const previousList = utils.pages.list.getData({ workspaceId });

      // Optimistically update the single page cache
      utils.pages.get.setData({ pageId }, (old) =>
        old ? { ...old, ...newData, updatedAt: new Date() } : old,
      );

      // Optimistically update the page in the list cache (sidebar title/icon)
      utils.pages.list.setData({ workspaceId }, (old) =>
        old?.map((p) =>
          p.id === pageId ? { ...p, ...newData, updatedAt: new Date() } : p,
        ),
      );

      return { previousPage, previousList };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousPage) {
        utils.pages.get.setData({ pageId }, context.previousPage);
      }
      if (context?.previousList) {
        utils.pages.list.setData({ workspaceId }, context.previousList);
      }
    },
    onSettled: () => {
      utils.pages.get.invalidate({ pageId });
      utils.pages.list.invalidate({ workspaceId });
    },
  });

  // --- Title editing ---
  const titleRef = useRef<HTMLDivElement>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInitializedRef = useRef(false);
  const isEditingRef = useRef(false);

  // Set title in DOM only once when page data first arrives
  useEffect(() => {
    if (page && titleRef.current && !titleInitializedRef.current) {
      titleRef.current.textContent =
        page.title === "Untitled" ? "" : page.title;
      titleInitializedRef.current = true;
    }
  }, [page]);

  const handleTitleInput = useCallback(() => {
    const text = titleRef.current?.textContent ?? "";
    isEditingRef.current = true;

    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      updatePage.mutate({ pageId, title: text || "Untitled" });
      isEditingRef.current = false;
    }, 500);
  }, [pageId, updatePage]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Focus the editor below
      const editor = document.querySelector(".tiptap") as HTMLElement | null;
      editor?.focus();
    }
  }, []);

  // --- Icon picker ---
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleIconSelect = useCallback(
    (emoji: string) => {
      updatePage.mutate({ pageId, icon: emoji });
      setShowEmojiPicker(false);
    },
    [pageId, updatePage],
  );

  // Close emoji picker on click outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClick(e: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  // --- Cover ---
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverGradient, setCoverGradient] = useState<string | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState("");

  useEffect(() => {
    if (page?.coverUrl) {
      // Check if it's a gradient ID or URL
      const gradient = COVER_GRADIENTS.find((g) => g.id === page.coverUrl);
      if (gradient) {
        setCoverGradient(gradient.css);
      } else {
        setCoverGradient(null);
      }
    }
  }, [page?.coverUrl]);

  const handleSetCover = useCallback(
    (value: string) => {
      updatePage.mutate({ pageId, coverUrl: value });
      setShowCoverPicker(false);
    },
    [pageId, updatePage],
  );

  const handleRemoveCover = useCallback(() => {
    updatePage.mutate({ pageId, coverUrl: null });
    setCoverGradient(null);
    setShowCoverPicker(false);
  }, [pageId, updatePage]);

  if (!page) return null;

  const hasCover = !!page.coverUrl;
  const coverBg =
    coverGradient ??
    (page.coverUrl && !COVER_GRADIENTS.some((g) => g.id === page.coverUrl)
      ? `url(${page.coverUrl}) center/cover`
      : undefined);

  return (
    <div className="page-header">
      {/* Cover image */}
      {hasCover && (
        <div
          className="group/cover relative h-[180px] w-full"
          style={{ background: coverBg }}
        >
          <button
            onClick={() => setShowCoverPicker(true)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[6px] bg-[var(--bg-tertiary)] px-2.5 py-1 text-[12px] text-[var(--text-secondary)] opacity-0 transition-opacity group-hover/cover:opacity-100"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <ImageIcon size={12} />
            カバー変更
          </button>
        </div>
      )}

      {/* Cover picker */}
      {showCoverPicker && (
        <CoverPicker
          onSelect={handleSetCover}
          onRemove={handleRemoveCover}
          onClose={() => setShowCoverPicker(false)}
          coverUrlInput={coverUrlInput}
          setCoverUrlInput={setCoverUrlInput}
        />
      )}

      <div className="mx-auto max-w-[860px] px-[52px]">
        {/* Add cover button (when no cover) */}
        {!hasCover && (
          <div className="flex pt-[40px]">
            <button
              onClick={() => setShowCoverPicker(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-[12px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            >
              <ImageIcon size={12} />
              カバーを追加
            </button>
          </div>
        )}

        {/* Icon */}
        <div
          className="relative"
          style={{ marginTop: hasCover ? "-26px" : "8px" }}
        >
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-[8px] text-[42px] transition-colors hover:bg-[var(--bg-hover)]"
          >
            {page.icon ?? "📄"}
          </button>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute left-0 top-[56px] z-50"
            >
              <EmojiPicker onSelect={handleIconSelect} />
            </div>
          )}
        </div>

        {/* Title */}
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          dir="ltr"
          onInput={handleTitleInput}
          onKeyDown={handleTitleKeyDown}
          data-placeholder="Untitled"
          className="page-title mt-1 mb-1 text-[38px] font-bold leading-[1.2] tracking-[-0.8px] text-[var(--text-primary)] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]"
        />

        {/* Meta info */}
        <div className="mb-4 flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
          {page.updatedAt && (
            <span>
              最終更新:{" "}
              {new Date(page.updatedAt).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Emoji Picker (lazy loaded) ---

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [Picker, setPicker] = useState<React.ComponentType<{
    data: unknown;
    onEmojiSelect: (emoji: { native: string }) => void;
    theme: string;
    previewPosition: string;
    skinTonePosition: string;
    set: string;
  }> | null>(null);
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    Promise.all([import("@emoji-mart/react"), import("@emoji-mart/data")]).then(
      ([mod, dataModule]) => {
        setPicker(() => mod.default);
        setData(dataModule.default);
      },
    );
  }, []);

  if (!Picker || !data) {
    return (
      <div
        className="flex h-[350px] w-[352px] items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)]"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <span className="text-[13px] text-[var(--text-tertiary)]">
          読み込み中…
        </span>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[10px] border border-[var(--border-strong)]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => onSelect(emoji.native)}
        theme="dark"
        previewPosition="none"
        skinTonePosition="search"
        set="native"
      />
    </div>
  );
}

// --- Cover Picker ---

function CoverPicker({
  onSelect,
  onRemove,
  onClose,
  coverUrlInput,
  setCoverUrlInput,
}: {
  onSelect: (value: string) => void;
  onRemove: () => void;
  onClose: () => void;
  coverUrlInput: string;
  setCoverUrlInput: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 50);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed left-1/2 top-[20vh] z-50 w-[380px] -translate-x-1/2 overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-4"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          カバーを選択
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-[var(--bg-hover)]"
        >
          <X size={14} className="text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Gradients */}
      <div className="mb-3">
        <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-tertiary)]">
          グラデーション
        </div>
        <div className="flex gap-2">
          {COVER_GRADIENTS.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className="h-[36px] flex-1 rounded-[6px] transition-opacity hover:opacity-80"
              style={{ background: g.css }}
              title={g.label}
            />
          ))}
        </div>
      </div>

      {/* URL input */}
      <div className="mb-3">
        <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-tertiary)]">
          画像 URL
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={coverUrlInput}
            onChange={(e) => setCoverUrlInput(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-blue)]"
          />
          <button
            onClick={() => {
              if (coverUrlInput.trim()) onSelect(coverUrlInput.trim());
            }}
            className="rounded-[6px] bg-[var(--accent-blue)] px-3 py-1.5 text-[13px] text-white transition-opacity hover:opacity-90"
          >
            設定
          </button>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-full rounded-[6px] py-1.5 text-center text-[13px] text-[#e57373] transition-colors hover:bg-[var(--bg-hover)]"
      >
        カバーを削除
      </button>
    </div>
  );
}
