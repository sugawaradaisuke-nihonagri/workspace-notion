"use client";

import { useState } from "react";
import { X, RotateCcw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface PageHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
}

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString("ja-JP");
}

export function PageHistory({ isOpen, onClose, pageId }: PageHistoryProps) {
  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.pageVersions.list.useQuery(
    { pageId },
    { enabled: isOpen },
  );

  const [previewId, setPreviewId] = useState<string | null>(null);
  const { data: previewVersion } = trpc.pageVersions.get.useQuery(
    { versionId: previewId! },
    { enabled: !!previewId },
  );

  const createSnapshot = trpc.pageVersions.create.useMutation({
    onSettled: () => utils.pageVersions.list.invalidate({ pageId }),
  });

  const restoreVersion = trpc.pageVersions.restore.useMutation({
    onSuccess: () => {
      utils.pages.get.invalidate({ pageId });
      utils.pageVersions.list.invalidate({ pageId });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 flex max-h-[80vh] w-full max-w-[520px] flex-col rounded-xl bg-[var(--bg-elevated)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--text-secondary)]" />
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              ページ履歴
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => createSnapshot.mutate({ pageId })}
              disabled={createSnapshot.isPending}
              className="flex h-[28px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-blue)] px-3 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              スナップショット作成
            </button>
            <button
              onClick={onClose}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-[13px] text-[var(--text-tertiary)]">
              読み込み中…
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--text-tertiary)]">
              まだ履歴がありません。「スナップショット作成」で現在の状態を保存できます。
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {versions.map((v) => (
                <div key={v.id} className="group">
                  <div
                    className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-[var(--bg-hover)]"
                    onClick={() =>
                      setPreviewId(previewId === v.id ? null : v.id)
                    }
                  >
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">
                        {v.title ?? "Untitled"}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                        <span>{relativeTime(new Date(v.createdAt))}</span>
                        {v.editorName && (
                          <>
                            <span>·</span>
                            <span>{v.editorName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {previewId === v.id ? (
                      <ChevronUp
                        size={14}
                        className="text-[var(--text-tertiary)]"
                      />
                    ) : (
                      <ChevronDown
                        size={14}
                        className="text-[var(--text-tertiary)]"
                      />
                    )}
                  </div>

                  {/* Preview & restore */}
                  {previewId === v.id && (
                    <div className="border-t border-[var(--border-default)] bg-[var(--bg-primary)] px-5 py-3">
                      {previewVersion ? (
                        <>
                          <div className="mb-3 max-h-[200px] overflow-y-auto rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-[12px] text-[var(--text-secondary)]">
                            {(() => {
                              const snapshot =
                                previewVersion.blocksSnapshot as Array<{
                                  content?: {
                                    type?: string;
                                    content?: Array<{
                                      content?: Array<{ text?: string }>;
                                    }>;
                                  };
                                }>;
                              if (!snapshot || snapshot.length === 0)
                                return "空のスナップショット";
                              // Extract text preview from Tiptap JSON
                              const block = snapshot[0];
                              const doc = block?.content as
                                | {
                                    content?: Array<{
                                      content?: Array<{ text?: string }>;
                                    }>;
                                  }
                                | undefined;
                              if (!doc?.content) return "コンテンツなし";
                              const lines = doc.content
                                .slice(0, 10)
                                .map((node) => {
                                  if (node.content) {
                                    return node.content
                                      .map((c) => c.text ?? "")
                                      .join("");
                                  }
                                  return "";
                                })
                                .filter(Boolean);
                              return lines.length > 0
                                ? lines.join("\n")
                                : "コンテンツなし";
                            })()}
                          </div>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "このバージョンに復元しますか？現在の内容は自動的にバックアップされます。",
                                )
                              ) {
                                restoreVersion.mutate({ versionId: v.id });
                              }
                            }}
                            disabled={restoreVersion.isPending}
                            className="flex h-[30px] items-center gap-1.5 rounded-[6px] bg-[var(--accent-blue)] px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                          >
                            <RotateCcw size={12} />
                            このバージョンに復元
                          </button>
                        </>
                      ) : (
                        <div className="text-[12px] text-[var(--text-tertiary)]">
                          読み込み中…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
