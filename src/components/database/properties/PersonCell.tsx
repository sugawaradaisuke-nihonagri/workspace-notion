"use client";

import { useState, useRef, useEffect } from "react";
import { User, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface PersonCellProps {
  value: string[];
  onChange: (value: string[]) => void;
  workspaceId?: string;
}

export function PersonCell({ value, onChange, workspaceId }: PersonCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ワークスペースメンバーの取得
  const { data: workspace } = trpc.workspace.get.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId && isOpen },
  );

  const members =
    (
      workspace as {
        members?: { userId: string; name: string; image?: string }[];
      }
    )?.members ?? [];

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  function handleToggle(userId: string): void {
    if (value.includes(userId)) {
      onChange(value.filter((v) => v !== userId));
    } else {
      onChange([...value, userId]);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 px-2 py-1 text-[13px]"
      >
        {value.length > 0 ? (
          <div className="flex items-center gap-1">
            {value.map((userId) => (
              <span
                key={userId}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[12px] text-[var(--text-secondary)]"
              >
                <User size={10} />
                {members.find((m) => m.userId === userId)?.name ??
                  userId.slice(0, 6)}
              </span>
            ))}
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[var(--text-tertiary)]">
            <User size={12} />空
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="max-h-[200px] overflow-y-auto p-1">
            {members.length > 0 ? (
              members.map((member) => (
                <button
                  key={member.userId}
                  onClick={() => handleToggle(member.userId)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-[var(--bg-hover)]"
                >
                  {member.image ? (
                    <img
                      src={member.image}
                      alt=""
                      className="h-[18px] w-[18px] rounded-full"
                    />
                  ) : (
                    <User size={14} className="text-[var(--text-tertiary)]" />
                  )}
                  <span className="text-[var(--text-primary)]">
                    {member.name}
                  </span>
                  {value.includes(member.userId) && (
                    <span className="ml-auto text-[11px] text-[var(--accent-blue)]">
                      ✓
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-2 py-3 text-center text-[12px] text-[var(--text-tertiary)]">
                メンバーを読み込み中...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
