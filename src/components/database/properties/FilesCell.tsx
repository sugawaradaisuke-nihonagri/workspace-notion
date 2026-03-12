"use client";

import { Upload, File } from "lucide-react";

interface FilesCellProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function FilesCell({ value, onChange }: FilesCellProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[11px] text-[var(--accent-blue)] hover:underline"
            >
              <File size={10} />
              ファイル {i + 1}
            </a>
          ))}
        </div>
      ) : (
        <button
          onClick={() => {
            // Phase 2: S3 upload integration
            // For now, show placeholder
          }}
          className="flex items-center gap-1 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <Upload size={12} />
          アップロード
        </button>
      )}
    </div>
  );
}
