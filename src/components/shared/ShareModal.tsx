"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, Trash2, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useShareStore } from "@/stores/share-store";
import { trpc } from "@/lib/trpc/client";
import type { Role } from "@/lib/permissions";

const ROLE_LABELS: Record<Role, string> = {
  owner: "オーナー",
  admin: "管理者",
  editor: "編集者",
  commenter: "コメント可",
  viewer: "閲覧のみ",
};

const ASSIGNABLE_ROLES: Role[] = ["admin", "editor", "commenter", "viewer"];

export function ShareModal(): React.ReactNode {
  const { isOpen, close, pageId, workspaceId } = useShareStore();

  if (!isOpen || !pageId || !workspaceId) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40"
            style={{ backdropFilter: "blur(6px)" }}
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-1/2 z-50 w-[480px] -translate-x-1/2 overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)]"
            style={{ top: "18vh", boxShadow: "var(--shadow-xl)" }}
          >
            <ShareModalContent
              pageId={pageId}
              workspaceId={workspaceId}
              onClose={close}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Inner content (uses tRPC hooks) ---

interface ShareModalContentProps {
  pageId: string;
  workspaceId: string;
  onClose: () => void;
}

function ShareModalContent({
  pageId,
  workspaceId,
  onClose,
}: ShareModalContentProps): React.ReactNode {
  const utils = trpc.useUtils();

  // Existing shares for this page
  const { data: shares } = trpc.pageShares.list.useQuery({ pageId });

  // Workspace members for invite search
  const { data: members } = trpc.workspace.members.useQuery({ workspaceId });

  // Mutations
  const createShare = trpc.pageShares.create.useMutation({
    onSuccess: () => utils.pageShares.list.invalidate({ pageId }),
  });
  const updateShare = trpc.pageShares.update.useMutation({
    onSuccess: () => utils.pageShares.list.invalidate({ pageId }),
  });
  const deleteShare = trpc.pageShares.delete.useMutation({
    onSuccess: () => utils.pageShares.list.invalidate({ pageId }),
  });

  // Invite search
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>("editor");
  const inputRef = useRef<HTMLInputElement>(null);

  // Members not yet shared with
  const sharedUserIds = new Set(shares?.map((s) => s.userId) ?? []);
  const invitableMembers = (members ?? []).filter(
    (m) =>
      !sharedUserIds.has(m.userId) &&
      (searchQuery.length === 0 ||
        m.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleInvite = useCallback(
    (userId: string) => {
      createShare.mutate({ pageId, userId, role: inviteRole });
      setSearchQuery("");
      setShowDropdown(false);
    },
    [createShare, pageId, inviteRole],
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent): void {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-invite-area]")) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
          ページを共有
        </h3>
        <button
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Invite area */}
      <div
        className="relative border-b border-[var(--border-default)] px-4 py-3"
        data-invite-area
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="メンバーを検索して招待…"
              className="h-[32px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] pl-8 pr-3 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-blue)]"
            />
          </div>

          {/* Role selector for invite */}
          <RoleSelect value={inviteRole} onChange={setInviteRole} />
        </div>

        {/* Dropdown */}
        {showDropdown && invitableMembers.length > 0 && (
          <div
            className="absolute left-4 right-4 top-full z-10 mt-1 max-h-[180px] overflow-y-auto rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-1"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {invitableMembers.map((m) => (
              <button
                key={m.userId}
                onClick={() => handleInvite(m.userId)}
                className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
              >
                <Avatar name={m.userName} image={m.userImage} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {m.userName}
                  </span>
                  <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                    {m.userEmail}
                  </span>
                </div>
                <UserPlus
                  size={14}
                  className="shrink-0 text-[var(--text-tertiary)]"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current shares list */}
      <div className="max-h-[280px] overflow-y-auto px-4 py-2">
        {(!shares || shares.length === 0) && (
          <div className="py-6 text-center text-[13px] text-[var(--text-tertiary)]">
            まだ共有されていません
          </div>
        )}
        {shares?.map((share) => (
          <div
            key={share.id}
            className="flex items-center gap-2.5 rounded-[8px] px-1 py-2"
          >
            <Avatar name={share.userName} image={share.userImage} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                {share.userName ?? "Unknown"}
              </span>
              <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                {share.userEmail}
              </span>
            </div>

            {/* Role change */}
            <RoleSelect
              value={share.role as Role}
              onChange={(newRole) =>
                updateShare.mutate({ shareId: share.id, role: newRole })
              }
            />

            {/* Remove */}
            <button
              onClick={() => deleteShare.mutate({ shareId: share.id })}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[var(--text-tertiary)] transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Shared components ---

function Avatar({
  name,
  image,
}: {
  name: string | null;
  image: string | null;
}): React.ReactNode {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? ""}
        className="h-[28px] w-[28px] shrink-0 rounded-full object-cover"
      />
    );
  }

  const initial = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[11px] font-semibold text-white">
      {initial}
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}): React.ReactNode {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-[28px] items-center gap-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
      >
        {ROLE_LABELS[value]}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[130px] overflow-hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <button
              key={role}
              onClick={() => {
                onChange(role);
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-[5px] px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                role === value
                  ? "bg-[var(--accent-blue)]/10 font-medium text-[var(--accent-blue)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
