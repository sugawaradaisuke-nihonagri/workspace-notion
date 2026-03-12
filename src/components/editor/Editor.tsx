"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorProvider, type JSONContent } from "@tiptap/react";
import { trpc } from "@/lib/trpc/client";
import { getEditorExtensions } from "./extensions";
import { BlockDragHandle } from "./BlockDragHandle";

interface EditorProps {
  pageId: string;
}

const AUTOSAVE_DELAY = 1000;

const defaultContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function Editor({ pageId }: EditorProps) {
  const [blockId, setBlockId] = useState<string | null>(null);
  const [initialContent, setInitialContent] = useState<JSONContent | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<JSONContent | null>(null);

  // --- データ取得 ---
  const { data: blockList, isLoading } = trpc.blocks.list.useQuery(
    { pageId },
    { refetchOnWindowFocus: false },
  );

  const updateBlock = trpc.blocks.update.useMutation();
  const createBlock = trpc.blocks.create.useMutation({
    onSuccess: (newBlock) => {
      setBlockId(newBlock.id);
    },
  });

  // ブロックデータが来たら初期コンテンツをセット
  useEffect(() => {
    if (!blockList) return;

    if (blockList.length > 0) {
      const firstBlock = blockList[0];
      setBlockId(firstBlock.id);

      // content が Tiptap JSONContent 形式なら使う、そうでなければデフォルト
      const content = firstBlock.content as JSONContent;
      if (content && content.type === "doc") {
        setInitialContent(content);
      } else {
        setInitialContent(defaultContent);
      }
    } else {
      // ブロックがなければ作成
      setInitialContent(defaultContent);
      createBlock.mutate({
        pageId,
        type: "paragraph",
        content: defaultContent as Record<string, unknown>,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockList]);

  // --- 自動保存 ---
  const saveContent = useCallback(
    (content: JSONContent) => {
      if (!blockId) return;
      updateBlock.mutate({
        blockId,
        content: content as Record<string, unknown>,
      });
    },
    [blockId, updateBlock],
  );

  const handleUpdate = useCallback(
    ({ editor }: { editor: { getJSON: () => JSONContent } }) => {
      const json = editor.getJSON();
      latestContentRef.current = json;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        if (latestContentRef.current) {
          saveContent(latestContentRef.current);
        }
      }, AUTOSAVE_DELAY);
    },
    [saveContent],
  );

  // コンポーネントアンマウント時に未保存があればフラッシュ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (latestContentRef.current && blockId) {
        // 同期的に最後の保存を試行
        saveContent(latestContentRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  // --- ローディング ---
  if (isLoading || !initialContent) {
    return (
      <div className="mx-auto max-w-[860px] px-[52px] py-[24px]">
        <div className="space-y-3">
          <div className="h-[36px] w-[200px] animate-pulse rounded bg-[var(--bg-tertiary)]" />
          <div className="h-[20px] w-full animate-pulse rounded bg-[var(--bg-tertiary)]" />
          <div className="h-[20px] w-3/4 animate-pulse rounded bg-[var(--bg-tertiary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-wrapper relative mx-auto max-w-[860px] px-[52px] py-[24px]">
      <EditorProvider
        extensions={getEditorExtensions()}
        content={initialContent}
        onUpdate={handleUpdate}
        editorContainerProps={{
          className: "editor-container",
        }}
        immediatelyRender={false}
      >
        <BlockDragHandle />
      </EditorProvider>
    </div>
  );
}
