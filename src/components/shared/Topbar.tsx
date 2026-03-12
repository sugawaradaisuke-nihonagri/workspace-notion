"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface TopbarProps {
  workspaceId: string;
  pageId: string;
  onToggleComments?: () => void;
  commentCount?: number;
}

export function Topbar({
  workspaceId,
  pageId,
  onToggleComments,
  commentCount,
}: TopbarProps) {
  const router = useRouter();
  const { data: allPages } = trpc.pages.list.useQuery({ workspaceId });
  const { data: page } = trpc.pages.get.useQuery({ pageId });

  // Build breadcrumb chain by walking parentId upward
  const breadcrumbs = useMemo(() => {
    if (!allPages || !page) return [];

    const pageMap = new Map(allPages.map((p) => [p.id, p]));
    const chain: { id: string; title: string; icon: string | null }[] = [];

    let current:
      | {
          id: string;
          title: string;
          icon: string | null;
          parentId: string | null;
        }
      | undefined = pageMap.get(pageId);

    while (current) {
      chain.unshift({
        id: current.id,
        title: current.title,
        icon: current.icon,
      });
      current = current.parentId ? pageMap.get(current.parentId) : undefined;
    }

    return chain;
  }, [allPages, page, pageId]);

  return (
    <div className="topbar flex h-[44px] shrink-0 items-center justify-between border-b border-[var(--border-default)] px-3">
      {/* Left: Breadcrumbs */}
      <nav className="flex min-w-0 items-center gap-0.5 overflow-hidden">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <div key={crumb.id} className="flex items-center gap-0.5">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  className="shrink-0 text-[var(--text-tertiary)]"
                />
              )}
              <button
                onClick={() => {
                  if (!isLast) {
                    router.push(`/${workspaceId}/${crumb.id}`);
                  }
                }}
                className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[13px] transition-colors ${
                  isLast
                    ? "font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {crumb.icon && (
                  <span className="shrink-0 text-[14px]">{crumb.icon}</span>
                )}
                <span className="truncate">{crumb.title}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Presence avatars placeholder */}
        <div className="mr-1 flex -space-x-1.5">
          <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[var(--accent-blue)] text-[10px] font-semibold text-white ring-2 ring-[var(--bg-primary)]">
            <Users size={12} />
          </div>
        </div>

        {/* Comment button */}
        {onToggleComments && (
          <button
            onClick={onToggleComments}
            className="relative flex h-[28px] items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <MessageCircle size={13} />
            <span>コメント</span>
            {commentCount != null && commentCount > 0 && (
              <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--accent-blue)] px-0.5 text-[9px] font-bold text-white">
                {commentCount}
              </span>
            )}
          </button>
        )}

        {/* Share button */}
        <button className="flex h-[28px] items-center gap-1.5 rounded-[6px] px-2 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]">
          <Share2 size={13} />
          <span>共有</span>
        </button>

        {/* More menu */}
        <button className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
