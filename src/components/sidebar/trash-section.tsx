"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { TrashModal } from "@/components/shared/TrashModal";

interface TrashSectionProps {
  workspaceId: string;
}

export function TrashSection({ workspaceId }: TrashSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-[var(--border-default)] px-[10px] py-[6px]">
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-[30px] w-full items-center gap-2 rounded px-[10px] text-[13.5px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
      >
        <Trash2 size={16} />
        <span>ゴミ箱</span>
      </button>

      {isOpen && (
        <TrashModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
