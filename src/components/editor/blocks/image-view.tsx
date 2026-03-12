"use client";

import { useCallback, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

export function ImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const src = node.attrs.src as string | null;
  const alt = node.attrs.alt as string;
  const caption = node.attrs.caption as string;
  const width = node.attrs.width as number | null;
  const uploading = node.attrs.uploading as boolean;

  const [isResizing, setIsResizing] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      // Show uploading state
      updateAttributes({ uploading: true });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          console.error("Upload failed:", data.error);
          updateAttributes({ uploading: false });
          return;
        }

        const data = await res.json();
        updateAttributes({
          src: data.url,
          uploading: false,
        });
      } catch (err) {
        console.error("Upload error:", err);
        updateAttributes({ uploading: false });
      }
    },
    [updateAttributes],
  );

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleUpload(file);
    };
    input.click();
  }, [handleUpload]);

  const handleUrlEmbed = useCallback(() => {
    const url = prompt("画像URLを入力:");
    if (url) {
      updateAttributes({ src: url });
    }
  }, [updateAttributes]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const file = Array.from(e.clipboardData.items)
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  // --- Resize handlers ---
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = imgRef.current?.offsetWidth ?? 600;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startXRef.current;
        const newWidth = Math.max(
          100,
          Math.min(860, startWidthRef.current + delta),
        );
        if (imgRef.current) {
          imgRef.current.style.width = `${newWidth}px`;
        }
      };

      const onUp = (ev: MouseEvent) => {
        setIsResizing(false);
        const delta = ev.clientX - startXRef.current;
        const newWidth = Math.max(
          100,
          Math.min(860, startWidthRef.current + delta),
        );
        updateAttributes({ width: Math.round(newWidth) });
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [updateAttributes],
  );

  // --- Empty state: upload placeholder ---
  if (!src) {
    return (
      <NodeViewWrapper className="image-block my-2" data-type="image-block">
        <div
          contentEditable={false}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
            dragOver
              ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10"
              : "border-[var(--border-default)] bg-[var(--bg-secondary)]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">アップロード中...</span>
            </div>
          ) : (
            <>
              <div className="text-3xl text-[var(--text-tertiary)]">🖼</div>
              <p className="text-sm text-[var(--text-secondary)]">
                画像をドラッグ&ドロップ、またはクリックして選択
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  onClick={handleFileSelect}
                >
                  ファイルを選択
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
                  onClick={handleUrlEmbed}
                >
                  URLで埋め込み
                </button>
              </div>
            </>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // --- Image loaded state ---
  return (
    <NodeViewWrapper
      className={`image-block my-2 ${selected ? "ring-2 ring-[var(--accent-blue)] rounded-lg" : ""}`}
      data-type="image-block"
    >
      <figure
        contentEditable={false}
        className="relative inline-block max-w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`block max-w-full rounded-md ${isResizing ? "" : "transition-[width] duration-150"}`}
          style={{ width: width ? `${width}px` : undefined }}
          draggable={false}
        />

        {/* Resize handle (right edge) */}
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-1.5 rounded-full bg-[var(--accent-blue)] opacity-60" />
        </div>

        {/* Caption */}
        {editingCaption ? (
          <input
            type="text"
            className="mt-1 w-full bg-transparent text-center text-sm text-[var(--text-tertiary)] outline-none placeholder:text-[var(--text-tertiary)]/50"
            placeholder="キャプションを追加..."
            defaultValue={caption}
            autoFocus
            onBlur={(e) => {
              updateAttributes({ caption: e.target.value });
              setEditingCaption(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateAttributes({
                  caption: (e.target as HTMLInputElement).value,
                });
                setEditingCaption(false);
              }
            }}
          />
        ) : (
          <figcaption
            className="mt-1 cursor-text text-center text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            onClick={() => setEditingCaption(true)}
          >
            {caption || "キャプションを追加..."}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
}
