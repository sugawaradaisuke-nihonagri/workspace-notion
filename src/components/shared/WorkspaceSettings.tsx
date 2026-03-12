"use client";

import { useState } from "react";
import {
  X,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  Pencil,
  MessageSquare,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface WorkspaceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown size={12} />,
  admin: <Shield size={12} />,
  editor: <Pencil size={12} />,
  commenter: <MessageSquare size={12} />,
  viewer: <Eye size={12} />,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  editor: "編集者",
  commenter: "コメンター",
  viewer: "閲覧者",
};

const ASSIGNABLE_ROLES = ["admin", "editor", "commenter", "viewer"] as const;

export function WorkspaceSettings({
  isOpen,
  onClose,
  workspaceId,
}: WorkspaceSettingsProps) {
  const utils = trpc.useUtils();
  const { data: workspace } = trpc.workspace.get.useQuery({ workspaceId });
  const { data: members, isLoading } = trpc.workspace.members.useQuery({
    workspaceId,
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<(typeof ASSIGNABLE_ROLES)[number]>("editor");
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [isEditingWs, setIsEditingWs] = useState(false);

  const inviteMember = trpc.workspace.invite.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      utils.workspace.members.invalidate({ workspaceId });
    },
  });

  const updateRole = trpc.workspace.updateMemberRole.useMutation({
    onSettled: () => utils.workspace.members.invalidate({ workspaceId }),
  });

  const removeMember = trpc.workspace.removeMember.useMutation({
    onSettled: () => utils.workspace.members.invalidate({ workspaceId }),
  });

  const updateWorkspace = trpc.workspace.update.useMutation({
    onSuccess: () => {
      setIsEditingWs(false);
      utils.workspace.get.invalidate({ workspaceId });
    },
  });

  if (!isOpen) return null;

  const myRole = workspace?.role ?? "viewer";
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-[560px] flex-col rounded-xl bg-[var(--bg-elevated)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            ワークスペース設定
          </h2>
          <button
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Workspace info */}
          <div className="mb-6">
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              ワークスペース情報
            </h3>
            {isEditingWs ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="h-[34px] w-[50px] rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-center text-[18px] outline-none"
                  placeholder="📦"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-[34px] flex-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-[13px] text-[var(--text-primary)] outline-none"
                  placeholder="ワークスペース名"
                />
                <button
                  onClick={() =>
                    updateWorkspace.mutate({
                      workspaceId,
                      name: editName || undefined,
                      icon: editIcon || undefined,
                    })
                  }
                  className="h-[34px] rounded-[6px] bg-[var(--accent-blue)] px-3 text-[12px] font-medium text-white hover:opacity-90"
                >
                  保存
                </button>
                <button
                  onClick={() => setIsEditingWs(false)}
                  className="h-[34px] rounded-[6px] px-3 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[24px]">{workspace?.icon ?? "📦"}</span>
                <span className="text-[15px] font-medium text-[var(--text-primary)]">
                  {workspace?.name}
                </span>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditName(workspace?.name ?? "");
                      setEditIcon(workspace?.icon ?? "📦");
                      setIsEditingWs(true);
                    }}
                    className="ml-auto text-[12px] text-[var(--accent-blue)] hover:underline"
                  >
                    編集
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Invite */}
          {canManage && (
            <div className="mb-6">
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                メンバーを招待
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="h-[34px] flex-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inviteEmail) {
                      inviteMember.mutate({
                        workspaceId,
                        email: inviteEmail,
                        role: inviteRole,
                      });
                    }
                  }}
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as typeof inviteRole)
                  }
                  className="h-[34px] rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-[12px] text-[var(--text-primary)] outline-none"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (inviteEmail) {
                      inviteMember.mutate({
                        workspaceId,
                        email: inviteEmail,
                        role: inviteRole,
                      });
                    }
                  }}
                  disabled={!inviteEmail || inviteMember.isPending}
                  className="flex h-[34px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-blue)] px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <UserPlus size={13} />
                  招待
                </button>
              </div>
              {inviteMember.error && (
                <p className="mt-1.5 text-[11px] text-red-400">
                  {inviteMember.error.message}
                </p>
              )}
            </div>
          )}

          {/* Members list */}
          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              メンバー ({members?.length ?? 0})
            </h3>
            {isLoading ? (
              <div className="py-4 text-center text-[13px] text-[var(--text-tertiary)]">
                読み込み中…
              </div>
            ) : (
              <div className="space-y-1">
                {members?.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3 rounded-[6px] px-3 py-2 hover:bg-[var(--bg-hover)]"
                  >
                    {/* Avatar */}
                    {m.userImage ? (
                      <img
                        src={m.userImage}
                        alt=""
                        className="h-[30px] w-[30px] shrink-0 rounded-full"
                      />
                    ) : (
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[11px] font-bold text-white">
                        {(m.userName ?? "?")[0]}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                        {m.userName}
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-tertiary)]">
                        {m.userEmail}
                      </div>
                    </div>

                    {/* Role badge */}
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      {ROLE_ICONS[m.role]}
                      {canManage && m.role !== "owner" ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            updateRole.mutate({
                              workspaceId,
                              userId: m.userId,
                              role: e.target
                                .value as (typeof ASSIGNABLE_ROLES)[number],
                            })
                          }
                          className="rounded border-none bg-transparent text-[11px] text-[var(--text-secondary)] outline-none"
                        >
                          {ASSIGNABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{ROLE_LABELS[m.role]}</span>
                      )}
                    </div>

                    {/* Remove button */}
                    {canManage && m.role !== "owner" && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `${m.userName} をワークスペースから削除しますか？`,
                            )
                          ) {
                            removeMember.mutate({
                              workspaceId,
                              userId: m.userId,
                            });
                          }
                        }}
                        className="flex h-[24px] w-[24px] items-center justify-center rounded text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
