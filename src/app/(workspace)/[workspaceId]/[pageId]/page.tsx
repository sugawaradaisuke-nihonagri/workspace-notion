import { Editor } from "@/components/editor";

interface PageProps {
  params: Promise<{ workspaceId: string; pageId: string }>;
}

export default async function EditorPage({ params }: PageProps) {
  const { pageId } = await params;

  return <Editor pageId={pageId} />;
}
