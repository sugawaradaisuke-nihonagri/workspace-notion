"use client";

import { Topbar } from "@/components/shared/Topbar";
import { PageHeader } from "@/components/editor/PageHeader";
import { Editor } from "@/components/editor";
import { DatabasePage } from "@/components/database";
import { trpc } from "@/lib/trpc/client";

interface PageEditorViewProps {
  workspaceId: string;
  pageId: string;
}

export function PageEditorView({ workspaceId, pageId }: PageEditorViewProps) {
  const { data: page, isLoading } = trpc.pages.get.useQuery({ pageId });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="h-[44px] shrink-0 border-b border-[var(--border-default)]" />
        <div className="flex-1">
          <div className="mx-auto max-w-[860px] px-[52px] py-[60px]">
            <div className="space-y-4">
              <div className="h-[42px] w-[200px] animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="h-[30px] w-[400px] animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="h-[20px] w-full animate-pulse rounded bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!page) return null;

  // Database view routing
  if (page.type === "database") {
    return (
      <div className="flex h-full flex-col">
        <Topbar workspaceId={workspaceId} pageId={pageId} />
        <div className="flex-1 overflow-hidden">
          <PageHeader pageId={pageId} workspaceId={workspaceId} />
          <DatabasePage databaseId={pageId} workspaceId={workspaceId} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar workspaceId={workspaceId} pageId={pageId} />
      <div className="flex-1 overflow-y-auto">
        <PageHeader pageId={pageId} workspaceId={workspaceId} />
        <Editor pageId={pageId} />
      </div>
    </div>
  );
}
