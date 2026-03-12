import { PageEditorView } from "./page-editor-view";

interface PageProps {
  params: Promise<{ workspaceId: string; pageId: string }>;
}

export default async function EditorPage({ params }: PageProps) {
  const { workspaceId, pageId } = await params;

  return <PageEditorView workspaceId={workspaceId} pageId={pageId} />;
}
