"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorProvider, type JSONContent } from "@tiptap/react";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { trpc } from "@/lib/trpc/client";
import { useYjsProvider, CURSOR_COLORS } from "@/lib/realtime";
import { useMentionItems } from "@/hooks/use-mention-items";
import { getEditorExtensions } from "./extensions";
import { BlockDragHandle } from "./BlockDragHandle";
import { CollabPresenceBar } from "./CollabPresenceBar";
import { InlineCommentBridge } from "./InlineCommentBridge";

interface EditorProps {
  pageId: string;
  /** Workspace ID — used to fetch @mention candidates */
  workspaceId?: string;
  /** Current user info — required for collaboration cursors */
  user?: { id: string; name: string };
}

const AUTOSAVE_DELAY = 1000;

const defaultContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function Editor({ pageId, workspaceId, user }: EditorProps) {
  const [blockId, setBlockId] = useState<string | null>(null);
  const [initialContent, setInitialContent] = useState<JSONContent | null>(
    null,
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<JSONContent | null>(null);
  const initialLoadedRef = useRef(false);
  const seededRef = useRef(false);

  // --- Yjs collaboration ---
  const { ydoc, provider, connected } = useYjsProvider({
    roomName: `page:${pageId}`,
    user: user ?? { id: "anonymous", name: "Anonymous" },
    enabled: !!user,
  });

  const isCollaborative = !!provider && connected;

  // Compute cursor color for current user
  const cursorUser = useMemo(() => {
    if (!user) return undefined;
    const colorIdx =
      user.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      CURSOR_COLORS.length;
    const c = CURSOR_COLORS[colorIdx];
    return { name: user.name, color: c.color, colorLight: c.light };
  }, [user]);

  // @mention items fetcher
  const getMentionItems = useMentionItems(workspaceId);

  // Build extensions — memoized per collaboration state
  const extensions = useMemo(
    () =>
      getEditorExtensions(
        provider && cursorUser
          ? { ydoc, provider, user: cursorUser }
          : undefined,
        { getMentionItems },
      ),
    // Re-create only when provider connection changes or mention data updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!provider, ydoc, getMentionItems],
  );

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
    if (!blockList || initialLoadedRef.current) return;

    if (blockList.length > 0) {
      const firstBlock = blockList[0];
      setBlockId(firstBlock.id);

      const content = firstBlock.content as JSONContent;
      if (content && content.type === "doc") {
        setInitialContent(content);
      } else {
        setInitialContent(defaultContent);
      }
    } else {
      setInitialContent(defaultContent);
      createBlock.mutate({
        pageId,
        type: "paragraph",
        content: defaultContent as Record<string, unknown>,
      });
    }
    initialLoadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockList]);

  // Reset on page change
  useEffect(() => {
    initialLoadedRef.current = false;
    seededRef.current = false;
    setInitialContent(null);
    setBlockId(null);
  }, [pageId]);

  // --- Seed Y.Doc from blocks when collaborative and doc is empty ---
  const handleCreate = useCallback(
    ({ editor }: { editor: TiptapEditor }) => {
      if (!isCollaborative || seededRef.current) return;
      seededRef.current = true;

      // Wait for initial sync from WS server
      const checkAndSeed = () => {
        // Check if Y.Doc fragment is effectively empty (only has default empty paragraph)
        const json = editor.getJSON();
        const isEmpty =
          !json.content ||
          json.content.length === 0 ||
          (json.content.length === 1 &&
            json.content[0].type === "paragraph" &&
            (!json.content[0].content || json.content[0].content.length === 0));

        if (isEmpty && initialContent && initialContent !== defaultContent) {
          // Seed the Y.Doc with existing block content
          editor.commands.setContent(initialContent);
        }
      };

      if (provider) {
        // If already synced, check immediately
        if (provider.synced) {
          checkAndSeed();
        } else {
          provider.once("sync", () => {
            // Small delay to let Yjs state propagate to ProseMirror
            setTimeout(checkAndSeed, 100);
          });
        }
      }
    },
    [isCollaborative, provider, initialContent],
  );

  // --- 自動保存 (non-collab mode fallback + collab periodic save) ---
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
      // In collab mode, save less frequently (Yjs handles real-time sync)
      const delay = isCollaborative ? 5000 : AUTOSAVE_DELAY;
      timerRef.current = setTimeout(() => {
        if (latestContentRef.current) {
          saveContent(latestContentRef.current);
        }
      }, delay);
    },
    [saveContent, isCollaborative],
  );

  // コンポーネントアンマウント時に未保存があればフラッシュ
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (latestContentRef.current && blockId) {
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
      {provider && <CollabPresenceBar provider={provider} />}
      <EditorProvider
        key={`${pageId}-${!!provider}`}
        extensions={extensions}
        content={isCollaborative ? undefined : initialContent}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        editorContainerProps={{
          className: "editor-container",
        }}
        immediatelyRender={false}
      >
        <BlockDragHandle />
        <InlineCommentBridge pageId={pageId} enabled={!!user} />
      </EditorProvider>
    </div>
  );
}
