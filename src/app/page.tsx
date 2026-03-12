import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CreateWorkspaceForm } from "@/components/shared/create-workspace-form";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const db = getDb();

  // ユーザーのワークスペースを取得
  const memberships = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      name: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, session.user.id));

  // ワークスペースがあればリダイレクト
  if (memberships.length > 0) {
    redirect(`/${memberships[0].workspaceId}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-8 shadow-[var(--shadow-lg)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            ワークスペースを作成
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            チームのためのワークスペースを始めましょう
          </p>
        </div>
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
