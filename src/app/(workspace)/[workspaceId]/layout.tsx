import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { workspaces, workspaceMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { WorkspaceLayout } from "./workspace-layout";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { workspaceId } = await params;
  const db = getDb();

  // ワークスペース取得 + 所属チェックを並列実行
  const [workspace, member] = await Promise.all([
    db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .then((rows) => rows[0]),
    db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, session.user.id),
        ),
      )
      .then((rows) => rows[0]),
  ]);

  if (!workspace || !member) redirect("/");

  return (
    <WorkspaceLayout
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      workspaceIcon={workspace.icon ?? "📦"}
    >
      {children}
    </WorkspaceLayout>
  );
}
