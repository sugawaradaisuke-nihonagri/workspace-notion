"use client";

import { useRef, useState, useCallback } from "react";
import {
  Upload,
  File,
  Image as ImageIcon,
  Film,
  Music,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { FileItem } from "@/types/database";

interface FilesCellProps {
  value: FileItem[];
  onChange: (value: FileItem[]) => void;
}

/** Get a display-friendly file size */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Get file icon based on MIME type */
function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith("image/"))
    return <ImageIcon size={11} className="shrink-0" />;
  if (mimeType.startsWith("video/"))
    return <Film size={11} className="shrink-0" />;
  if (mimeType.startsWith("audio/"))
    return <Music size={11} className="shrink-0" />;
  return <File size={11} className="shrink-0" />;
}

/** Extract short filename: truncate at 20 chars */
function shortName(name: string): string {
  if (name.length <= 24) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0) {
    const stem = name.slice(0, ext);
    const extension = name.slice(ext);
    return stem.slice(0, 20 - extension.length) + "…" + extension;
  }
  return name.slice(0, 20) + "…";
}

export function FilesCell({ value, onChange }: FilesCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);

      try {
        const newItems: FileItem[] = [];

        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            console.error("Upload failed:", err.error);
            continue;
          }

          const data = await res.json();
          newItems.push({
            url: data.url,
            name: data.name ?? file.name,
            size: data.size ?? file.size,
            mimeType: data.mimeType ?? file.type,
          });
        }

        if (newItems.length > 0) {
          onChange([...value, ...newItems]);
        }
      } finally {
        setUploading(false);
        // Reset input so the same file can be re-uploaded
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [value, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          {value.map((item, i) => (
            <div
              key={`${item.url}-${i}`}
              className="group inline-flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[11px]"
            >
              {/* Thumbnail for images, icon for others */}
              {item.mimeType.startsWith("image/") ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-[14px] w-[14px] shrink-0 rounded-[2px] object-cover"
                />
              ) : (
                getFileIcon(item.mimeType)
              )}

              {/* File name as link */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-blue)] hover:underline"
                title={`${item.name} (${formatSize(item.size)})`}
              >
                {shortName(item.name)}
              </a>

              {/* Open in new tab */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] group-hover:inline-flex"
              >
                <ExternalLink size={9} />
              </a>

              {/* Remove */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(i);
                }}
                className="hidden text-[var(--text-tertiary)] hover:text-red-400 group-hover:inline-flex"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {/* Add more button */}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center rounded bg-[var(--bg-tertiary)] p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          アップロード
        </button>
      )}
    </div>
  );
}
