interface PageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params;

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-[15px] text-[var(--text-secondary)]">
          左のサイドバーからページを選択するか、新規ページを作成してください
        </p>
      </div>
    </div>
  );
}
