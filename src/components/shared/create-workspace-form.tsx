"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export function CreateWorkspaceForm() {
  const [name, setName] = useState("");
  const router = useRouter();

  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (workspace) => {
      router.push(`/${workspace.id}`);
    },
  });

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspace.mutate({ name: name.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="workspace-name"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          ワークスペース名
        </label>
        <input
          id="workspace-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: プロダクトチーム"
          className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-tertiary)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]"
        />
      </div>
      {createWorkspace.error && (
        <p className="text-sm text-red-400">{createWorkspace.error.message}</p>
      )}
      <button
        type="submit"
        disabled={!name.trim() || createWorkspace.isPending}
        className="w-full rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {createWorkspace.isPending ? "作成中..." : "作成する"}
      </button>
    </form>
  );
}
