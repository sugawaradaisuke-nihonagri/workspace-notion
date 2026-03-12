"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  MessageCircle,
  AtSign,
  Share2,
  FileText,
  X,
  Check,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore } from "@/stores/notification-store";
import { trpc } from "@/lib/trpc/client";

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString("ja-JP");
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  comment: <MessageCircle size={14} />,
  reply: <MessageCircle size={14} />,
  mention: <AtSign size={14} />,
  share: <Share2 size={14} />,
  page_update: <FileText size={14} />,
};

export function NotificationPanel(): React.ReactNode {
  const { isOpen, close } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { enabled: isOpen },
  );

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  const handleNotificationClick = useCallback(
    (notification: {
      id: string;
      isRead: boolean;
      pageId?: string | null;
    }): void => {
      if (!notification.isRead) {
        markRead.mutate({ notificationId: notification.id });
      }
      // pageId click — currently just marks as read since we need workspaceId for routing
      // TODO: enhance notification router to include workspaceId for navigation
      close();
    },
    [markRead, close],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed right-4 top-[52px] z-50 flex w-[380px] max-h-[500px] flex-col overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
              通知
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <Check size={12} />
                <span>すべて既読</span>
              </button>
              <button
                onClick={close}
                className="flex h-[24px] w-[24px] items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--text-secondary)]" />
              </div>
            )}

            {!isLoading && (!notifications || notifications.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
                <Bell size={28} className="mb-2 opacity-40" />
                <span className="text-[13px]">通知はありません</span>
              </div>
            )}

            {!isLoading &&
              notifications &&
              notifications.length > 0 &&
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                >
                  {/* Unread indicator */}
                  <div className="flex w-[6px] shrink-0 items-center pt-2.5">
                    {!notification.isRead && (
                      <div className="h-[6px] w-[6px] rounded-full bg-[var(--accent-blue)]" />
                    )}
                  </div>

                  {/* Actor avatar */}
                  <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[10px] font-semibold text-[var(--text-secondary)]">
                    {notification.actorImage ? (
                      <img
                        src={notification.actorImage}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span>
                        {notification.actorName?.slice(0, 2).toUpperCase() ??
                          "?"}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-tertiary)]">
                        {TYPE_ICONS[notification.type] ?? <Bell size={14} />}
                      </span>
                      <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                        {notification.title}
                      </span>
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                        {notification.message}
                      </p>
                    )}
                    <span className="mt-1 block text-[11px] text-[var(--text-tertiary)]">
                      {relativeTime(new Date(notification.createdAt))}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
