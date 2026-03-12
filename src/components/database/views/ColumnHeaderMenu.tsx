"use client";

import { useRef, useEffect, useState } from "react";
import { Pencil, Trash2, EyeOff, ArrowUp, ArrowDown, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PROPERTY_TYPE_LABELS } from "@/types/database";
import type { PropertyType } from "@/types/database";

interface ColumnHeaderMenuProps {
  property: {
    id: string;
    name: string;
    type: string;
    databaseId: string;
  };
  databaseId: string;
  onClose: () => void;
}

export function ColumnHeaderMenu({
  property,
  databaseId,
  onClose,
}: ColumnHeaderMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(property.name);
  const utils = trpc.useUtils();

  const updateProperty = trpc.dbProperties.update.useMutation({
    onSettled: () => {
      utils.dbProperties.list.invalidate({ databaseId });
      onClose();
    },
  });

  const deleteProperty = trpc.dbProperties.delete.useMutation({
    onSettled: () => {
      utils.dbProperties.list.invalidate({ databaseId });
      onClose();
    },
  });

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

  const isTitle = property.type === "title";

  function handleRename(): void {
    if (newName.trim() && newName !== property.name) {
      updateProperty.mutate({
        propertyId: property.id,
        name: newName.trim(),
      });
    } else {
      setIsRenaming(false);
    }
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-[200px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {/* Property type badge */}
      <div className="border-b border-[var(--border-default)] px-3 py-2">
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {PROPERTY_TYPE_LABELS[property.type as PropertyType] ?? property.type}
        </span>
      </div>

      {/* Rename */}
      {isRenaming ? (
        <div className="p-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
            autoFocus
          />
        </div>
      ) : (
        <div className="p-1">
          <button
            onClick={() => setIsRenaming(true)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
          >
            <Pencil size={14} className="text-[var(--text-tertiary)]" />
            名前を変更
          </button>

          {!isTitle && (
            <>
              <button
                onClick={() =>
                  updateProperty.mutate({
                    propertyId: property.id,
                    isVisible: false,
                  })
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              >
                <EyeOff size={14} className="text-[var(--text-tertiary)]" />
                非表示にする
              </button>

              <div className="my-1 border-t border-[var(--border-default)]" />

              <button
                onClick={() =>
                  deleteProperty.mutate({ propertyId: property.id })
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] text-[#e57373] hover:bg-[var(--bg-hover)]"
              >
                <Trash2 size={14} />
                削除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
