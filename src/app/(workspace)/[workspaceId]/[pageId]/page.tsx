interface PageProps {
  params: Promise<{ workspaceId: string; pageId: string }>;
}

export default async function EditorPage({ params }: PageProps) {
  const { pageId } = await params;

  return (
    <div className="mx-auto max-w-[860px] px-[52px] py-[24px]">
      <h1 className="text-[38px] font-bold leading-[1.2] tracking-[-0.8px] text-[var(--text-primary)]">
        {/* TODO: Tiptap エディタ */}
        ページエディタ (pageId: {pageId})
      </h1>
    </div>
  );
}
