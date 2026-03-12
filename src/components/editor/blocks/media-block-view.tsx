"use client";

import { useCallback, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { MediaType } from "../extensions/media-block-extension";

const MEDIA_CONFIG: Record<
  MediaType,
  { icon: string; label: string; accept?: string; placeholder: string }
> = {
  video: {
    icon: "🎬",
    label: "動画",
    accept: "video/*",
    placeholder: "動画ファイルを選択、またはURLを入力",
  },
  audio: {
    icon: "🎵",
    label: "音声",
    accept: "audio/*",
    placeholder: "音声ファイルを選択、またはURLを入力",
  },
  file: {
    icon: "📎",
    label: "ファイル",
    placeholder: "ファイルを選択してアップロード",
  },
  bookmark: {
    icon: "🔗",
    label: "ブックマーク",
    placeholder: "URLを入力してプレビューを生成",
  },
  embed: {
    icon: "📐",
    label: "埋め込み",
    placeholder: "YouTube, Figma, CodePen 等のURLを入力",
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Convert a watch URL to an embed URL */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }

    // Vimeo
    if (u.hostname === "vimeo.com") {
      return `https://player.vimeo.com/video${u.pathname}`;
    }

    // Figma
    if (u.hostname === "www.figma.com" || u.hostname === "figma.com") {
      return `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(url)}`;
    }

    // CodePen
    if (u.hostname === "codepen.io" && u.pathname.includes("/pen/")) {
      return url.replace("/pen/", "/embed/");
    }

    // Default: use as-is (user provides embed URL directly)
    return url;
  } catch {
    return null;
  }
}

export function MediaBlockView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const mediaType = (node.attrs.mediaType as MediaType) ?? "file";
  const src = node.attrs.src as string | null;
  const name = node.attrs.name as string | null;
  const size = node.attrs.size as number | null;
  const caption = node.attrs.caption as string;
  const title = node.attrs.title as string | null;
  const description = node.attrs.description as string | null;
  const image = node.attrs.image as string | null;
  const uploading = node.attrs.uploading as boolean;

  const [urlInput, setUrlInput] = useState("");
  const config = MEDIA_CONFIG[mediaType];

  const handleUpload = useCallback(
    async (file: File) => {
      updateAttributes({ uploading: true, name: file.name, size: file.size });

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          updateAttributes({ uploading: false });
          return;
        }
        const data = await res.json();
        updateAttributes({
          src: data.url,
          name: data.name,
          size: data.size,
          mimeType: data.mimeType,
          uploading: false,
        });
      } catch {
        updateAttributes({ uploading: false });
      }
    },
    [updateAttributes],
  );

  const handleFileSelect = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    if (config.accept) input.accept = config.accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleUpload(file);
    };
    input.click();
  }, [handleUpload, config.accept]);

  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) return;

    if (mediaType === "embed") {
      const embedUrl = toEmbedUrl(urlInput.trim());
      if (embedUrl) {
        updateAttributes({ src: embedUrl, title: urlInput.trim() });
      }
    } else if (mediaType === "bookmark") {
      updateAttributes({ src: urlInput.trim(), title: urlInput.trim() });
    } else {
      updateAttributes({ src: urlInput.trim() });
    }
    setUrlInput("");
  }, [urlInput, mediaType, updateAttributes]);

  // --- Empty state ---
  if (!src) {
    return (
      <NodeViewWrapper className="media-block my-2" data-type="media-block">
        <div
          contentEditable={false}
          className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
            selected
              ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/5"
              : "border-[var(--border-default)] bg-[var(--bg-secondary)]"
          }`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">
                {name ? `${name} をアップロード中...` : "アップロード中..."}
              </span>
            </div>
          ) : (
            <>
              <div className="text-2xl">{config.icon}</div>
              <p className="text-sm text-[var(--text-secondary)]">
                {config.placeholder}
              </p>

              <div className="flex items-center gap-2">
                {/* File upload button (not for bookmark/embed) */}
                {mediaType !== "bookmark" && mediaType !== "embed" && (
                  <button
                    type="button"
                    className="rounded-md bg-[var(--accent-blue)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    onClick={handleFileSelect}
                  >
                    ファイルを選択
                  </button>
                )}

                {/* URL input */}
                <div className="flex gap-1">
                  <input
                    type="url"
                    className="w-56 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
                    placeholder="URLを貼り付け..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUrlSubmit();
                    }}
                  />
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    onClick={handleUrlSubmit}
                  >
                    埋め込み
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  // --- Loaded state: render based on mediaType ---
  return (
    <NodeViewWrapper
      className={`media-block my-2 ${selected ? "ring-2 ring-[var(--accent-blue)] rounded-lg" : ""}`}
      data-type="media-block"
    >
      <div contentEditable={false}>
        {mediaType === "video" && (
          <video
            src={src}
            controls
            className="max-w-full rounded-md"
            style={{ maxHeight: 480 }}
          >
            <track kind="captions" />
          </video>
        )}

        {mediaType === "audio" && (
          <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3">
            <span className="text-xl">🎵</span>
            <div className="min-w-0 flex-1">
              {name && (
                <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {name}
                </div>
              )}
              <audio src={src} controls className="mt-1 w-full" />
            </div>
          </div>
        )}

        {mediaType === "file" && (
          <a
            href={src}
            download={name ?? undefined}
            className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            <span className="text-xl">📎</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                {name ?? "ファイル"}
              </div>
              {size && (
                <div className="text-xs text-[var(--text-tertiary)]">
                  {formatSize(size)}
                </div>
              )}
            </div>
            <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
              ダウンロード ↓
            </span>
          </a>
        )}

        {mediaType === "bookmark" && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 overflow-hidden rounded-lg border border-[var(--border-default)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
              <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                {title ?? src}
              </div>
              {description && (
                <div className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                  {description}
                </div>
              )}
              <div className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
                🔗 {src}
              </div>
            </div>
            {image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={image}
                alt=""
                className="h-24 w-32 shrink-0 object-cover"
              />
            )}
          </a>
        )}

        {mediaType === "embed" && (
          <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
            <iframe
              src={src}
              title={title ?? "Embedded content"}
              className="h-96 w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        )}

        {/* Caption */}
        {caption && (
          <div className="mt-1 text-center text-sm text-[var(--text-tertiary)]">
            {caption}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
