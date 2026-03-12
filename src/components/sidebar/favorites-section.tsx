"use client";

import { useRouter, useParams } from "next/navigation";
import { Star } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface FavoritesSectionProps {
  workspaceId: string;
}

export function FavoritesSection({ workspaceId }: FavoritesSectionProps) {
  const router = useRouter();
  const params = useParams();
  const activePageId = params.pageId as string | undefined;

  const { data: favorites } = trpc.favorites.list.useQuery({ workspaceId });

  if (!favorites || favorites.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="px-[10px] pb-[4px] pt-[12px]">
        <div className="flex items-center gap-1.5">
          <Star size={12} className="text-[var(--text-tertiary)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--text-tertiary)]">
            お気に入り
          </span>
        </div>
      </div>
      <div className="py-1">
        {favorites.map((fav) => {
          const isActive = activePageId === fav.pageId;
          return (
            <button
              key={fav.pageId}
              onClick={() => router.push(`/${workspaceId}/${fav.pageId}`)}
              className={`flex h-[30px] w-full items-center gap-2 rounded px-[10px] text-[13.5px] transition-colors ${
                isActive
                  ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <span className="shrink-0 text-[14px]">{fav.icon ?? "📄"}</span>
              <span className="truncate">{fav.title ?? "Untitled"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
