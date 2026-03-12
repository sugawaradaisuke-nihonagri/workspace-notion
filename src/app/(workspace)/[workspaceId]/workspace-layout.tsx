"use client";

import { Sidebar } from "@/components/sidebar";
import { SearchModal } from "@/components/shared/search-modal";
import { ShareModal } from "@/components/shared/ShareModal";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string;
}

export function WorkspaceLayout({
  children,
  workspaceId,
  workspaceName,
  workspaceIcon,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      <Sidebar
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        workspaceIcon={workspaceIcon}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <SearchModal />
      <ShareModal />
    </div>
  );
}
