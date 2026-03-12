"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  CornerDownRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface Comment {
  id: string;
  pageId: string;
  parentId: string | null;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  content: string;
  inlineRef: unknown;
  isResolved: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CommentWithReplies extends Comment {
  replies: Comment[];
}

interface CommentThreadProps {
  comment: CommentWithReplies;
  currentUserId: string;
  pageId: string;
}

function timeAgo(dateStr: Date | string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

function CommentBubble({
  comment,
  currentUserId,
  isReply = false,
}: {
  comment: Comment;
  currentUserId: string;
  isReply?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ pageId: comment.pageId });
      setIsEditing(false);
    },
  });

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ pageId: comment.pageId });
    },
  });

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const isOwn = comment.authorId === currentUserId;
  const initial = (comment.authorName ?? "?").charAt(0).toUpperCase();

  return (
    <div className={`group flex gap-2 ${isReply ? "ml-6" : ""}`}>
      {/* Avatar */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[11px] font-bold text-white">
        {comment.authorImage ? (
          <img
            src={comment.authorImage}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        ) : (
          initial
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">
            {comment.authorName ?? "Unknown"}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {timeAgo(comment.createdAt)}
          </span>

          {/* Menu */}
          {isOwn && (
            <div className="relative ml-auto" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="invisible rounded p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] group-hover:visible"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 w-[120px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-primary)]"
                  style={{ boxShadow: "var(--shadow-lg)" }}
                >
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    <Pencil size={12} /> 編集
                  </button>
                  <button
                    onClick={() => {
                      deleteComment.mutate({ commentId: comment.id });
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-red-500 hover:bg-[var(--bg-hover)]"
                  >
                    <Trash2 size={12} /> 削除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none rounded bg-[var(--bg-secondary)] px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none"
              rows={2}
              autoFocus
            />
            <div className="mt-1 flex gap-1">
              <button
                onClick={() =>
                  updateComment.mutate({
                    commentId: comment.id,
                    content: editContent,
                  })
                }
                className="rounded bg-[var(--accent-blue)] px-2 py-0.5 text-[11px] font-medium text-white"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }}
                className="rounded px-2 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-[1.5] text-[var(--text-secondary)]">
            {comment.content}
          </p>
        )}
      </div>
    </div>
  );
}

export function CommentThread({
  comment,
  currentUserId,
  pageId,
}: CommentThreadProps) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const utils = trpc.useUtils();

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ pageId });
      setReplyContent("");
      setShowReply(false);
    },
  });

  const resolveComment = trpc.comments.resolve.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ pageId });
    },
  });

  return (
    <div
      className={`rounded-[8px] border border-[var(--border-default)] p-3 ${
        comment.isResolved ? "opacity-50" : ""
      }`}
    >
      {/* Top-level comment */}
      <CommentBubble comment={comment} currentUserId={currentUserId} />

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-[var(--border-default)] pl-2">
          {comment.replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isReply
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
        >
          <CornerDownRight size={11} /> 返信
        </button>
        <button
          onClick={() =>
            resolveComment.mutate({
              commentId: comment.id,
              isResolved: !comment.isResolved,
            })
          }
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
        >
          <Check size={11} /> {comment.isResolved ? "再開" : "解決"}
        </button>
      </div>

      {/* Reply input */}
      {showReply && (
        <div className="mt-2 ml-6">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="返信を入力..."
            className="w-full resize-none rounded bg-[var(--bg-secondary)] px-2 py-1.5 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && replyContent.trim()) {
                e.preventDefault();
                createComment.mutate({
                  pageId,
                  content: replyContent.trim(),
                  parentId: comment.id,
                });
              }
            }}
          />
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => {
                if (replyContent.trim()) {
                  createComment.mutate({
                    pageId,
                    content: replyContent.trim(),
                    parentId: comment.id,
                  });
                }
              }}
              disabled={!replyContent.trim()}
              className="rounded bg-[var(--accent-blue)] px-2 py-0.5 text-[11px] font-medium text-white disabled:opacity-50"
            >
              送信
            </button>
            <button
              onClick={() => {
                setShowReply(false);
                setReplyContent("");
              }}
              className="rounded px-2 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
