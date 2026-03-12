"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/shared/Topbar";
import { PageHeader } from "@/components/editor/PageHeader";
import { Editor } from "@/components/editor";
import { DatabasePage } from "@/components/database";
import { CommentSidebar } from "@/components/comments";
import { trpc } from "@/lib/trpc/client";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface PageEditorViewProps {
  workspaceId: string;
  pageId: string;
}

export function PageEditorView({ workspaceId, pageId }: PageEditorViewProps) {
  const { data: session } = useSession();
  const { data: page, isLoading } = trpc.pages.get.useQuery({ pageId });
  const [showComments, setShowComments] = useState(false);

  const collabUser = session?.user
    ? {
        id: session.user.id ?? "unknown",
        name: session.user.name ?? "Anonymous",
      }
    : undefined;

  // Fetch comment count for the badge
  const { data: commentThreads } = trpc.comments.list.useQuery(
    { pageId },
    { enabled: !!collabUser },
  );
  const commentCount = commentThreads?.filter((t) => !t.isResolved).length ?? 0;

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
        <Topbar
          workspaceId={workspaceId}
          pageId={pageId}
          onToggleComments={() => setShowComments(!showComments)}
          commentCount={commentCount}
        />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PageHeader pageId={pageId} workspaceId={workspaceId} />
            <ErrorBoundary label="データベース">
              <DatabasePage databaseId={pageId} workspaceId={workspaceId} />
            </ErrorBoundary>
          </div>
          {collabUser && (
            <CommentSidebar
              pageId={pageId}
              currentUserId={collabUser.id}
              isOpen={showComments}
              onClose={() => setShowComments(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        workspaceId={workspaceId}
        pageId={pageId}
        onToggleComments={() => setShowComments(!showComments)}
        commentCount={commentCount}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <PageHeader pageId={pageId} workspaceId={workspaceId} />
          <ErrorBoundary label="エディタ">
            <Editor
              pageId={pageId}
              workspaceId={workspaceId}
              user={collabUser}
            />
          </ErrorBoundary>
        </div>
        {collabUser && (
          <CommentSidebar
            pageId={pageId}
            currentUserId={collabUser.id}
            isOpen={showComments}
            onClose={() => setShowComments(false)}
          />
        )}
      </div>
    </div>
  );
}
