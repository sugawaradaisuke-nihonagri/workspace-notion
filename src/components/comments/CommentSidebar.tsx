"use client";

import { useState, useMemo } from "react";
import { MessageCircle, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { CommentThread } from "./CommentThread";

interface CommentSidebarProps {
  pageId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentSidebar({
  pageId,
  currentUserId,
  isOpen,
  onClose,
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState("");
  const utils = trpc.useUtils();

  const { data: threads = [], isLoading } = trpc.comments.list.useQuery(
    { pageId },
    { enabled: isOpen },
  );

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ pageId });
      setNewComment("");
    },
  });

  const { unresolvedThreads, resolvedThreads } = useMemo(() => {
    const unresolved: typeof threads = [];
    const resolved: typeof threads = [];
    for (const t of threads) {
      (t.isResolved ? resolved : unresolved).push(t);
    }
    return { unresolvedThreads: unresolved, resolvedThreads: resolved };
  }, [threads]);
  const unresolvedCount = unresolvedThreads.length;

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-l border-[var(--border-default)] bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-[var(--text-secondary)]" />
          <span className="text-[14px] font-medium text-[var(--text-primary)]">
            コメント
          </span>
          {unresolvedCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent-blue)] px-1 text-[10px] font-bold text-white">
              {unresolvedCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* New comment input */}
      <div className="border-b border-[var(--border-default)] p-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを追加..."
          className="w-full resize-none rounded-[6px] bg-[var(--bg-secondary)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
              e.preventDefault();
              createComment.mutate({
                pageId,
                content: newComment.trim(),
              });
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => {
              if (newComment.trim()) {
                createComment.mutate({
                  pageId,
                  content: newComment.trim(),
                });
              }
            }}
            disabled={!newComment.trim() || createComment.isPending}
            className="rounded-[6px] bg-[var(--accent-blue)] px-3 py-1 text-[12px] font-medium text-white disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-[60px] animate-pulse rounded-[8px] bg-[var(--bg-tertiary)]"
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-tertiary)]">
            <MessageCircle size={32} className="mb-2 opacity-30" />
            <p className="text-[13px]">コメントはまだありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Unresolved threads */}
            {unresolvedThreads.map((thread) => (
              <CommentThread
                key={thread.id}
                comment={thread}
                currentUserId={currentUserId}
                pageId={pageId}
              />
            ))}

            {/* Resolved threads */}
            {resolvedThreads.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2">
                  <div className="h-px flex-1 bg-[var(--border-default)]" />
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    解決済み ({resolvedThreads.length})
                  </span>
                  <div className="h-px flex-1 bg-[var(--border-default)]" />
                </div>
                {resolvedThreads.map((thread) => (
                  <CommentThread
                    key={thread.id}
                    comment={thread}
                    currentUserId={currentUserId}
                    pageId={pageId}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
