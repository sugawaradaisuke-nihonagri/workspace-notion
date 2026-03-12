"use client";

import { useState, useCallback, useRef } from "react";
import { X, Download, Upload, FileText, FileCode, Globe } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { tiptapToMarkdown, tiptapToHtml } from "@/lib/export";
import { markdownToTiptap, extractTitleFromMarkdown } from "@/lib/import";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  workspaceId: string;
}

type Tab = "export" | "import";
type ExportFormat = "markdown" | "html";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportImportModal({
  isOpen,
  onClose,
  pageId,
  workspaceId,
}: ExportImportModalProps) {
  const [tab, setTab] = useState<Tab>("export");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown");
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: page } = trpc.pages.get.useQuery(
    { pageId },
    { enabled: isOpen },
  );
  const utils = trpc.useUtils();

  const createPage = trpc.pages.create.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate({ workspaceId });
    },
  });

  const createBlock = trpc.blocks.create.useMutation();

  const handleExport = useCallback(() => {
    if (!page || !page.blocks || page.blocks.length === 0) return;

    const content = page.blocks[0].content as {
      type?: string;
      content?: unknown[];
    };
    if (!content || content.type !== "doc") return;

    const title = page.title ?? "Untitled";
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, "_");

    if (exportFormat === "markdown") {
      const md = tiptapToMarkdown(
        content as Parameters<typeof tiptapToMarkdown>[0],
      );
      downloadFile(`# ${title}\n\n${md}`, `${safeTitle}.md`, "text/markdown");
    } else {
      const html = tiptapToHtml(
        content as Parameters<typeof tiptapToHtml>[0],
        title,
      );
      downloadFile(html, `${safeTitle}.html`, "text/html");
    }
  }, [page, exportFormat]);

  const handleImport = useCallback(
    async (markdown: string) => {
      if (!markdown.trim()) return;
      setImportStatus("インポート中…");

      try {
        const title = extractTitleFromMarkdown(markdown);
        const doc = markdownToTiptap(markdown);

        const newPage = await createPage.mutateAsync({
          workspaceId,
          title,
          icon: "📝",
        });

        await createBlock.mutateAsync({
          pageId: newPage.id,
          type: "paragraph",
          content: doc as unknown as Record<string, unknown>,
        });

        setImportStatus(`「${title}」をインポートしました`);
        setImportText("");

        setTimeout(() => {
          onClose();
          window.location.href = `/${workspaceId}/${newPage.id}`;
        }, 500);
      } catch {
        setImportStatus("インポートに失敗しました");
      }
    },
    [workspaceId, createPage, createBlock, onClose],
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (
          file.name.endsWith(".md") ||
          file.name.endsWith(".markdown") ||
          file.name.endsWith(".txt")
        ) {
          setImportText(text);
        } else {
          setImportStatus("Markdown ファイル (.md, .txt) のみ対応しています");
        }
      };
      reader.readAsText(file);
    },
    [],
  );

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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab("export")}
              className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === "export"
                  ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Download size={14} />
              エクスポート
            </button>
            <button
              onClick={() => setTab("import")}
              className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === "import"
                  ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              <Upload size={14} />
              インポート
            </button>
          </div>
          <button
            onClick={onClose}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "export" ? (
            <div>
              <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
                「{page?.title ?? "Untitled"}」をエクスポートします。
              </p>

              {/* Format selection */}
              <div className="mb-4 space-y-2">
                <button
                  onClick={() => setExportFormat("markdown")}
                  className={`flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 transition-colors ${
                    exportFormat === "markdown"
                      ? "border-[var(--accent-blue)] bg-[var(--accent-blue-bg)]"
                      : "border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <FileText
                    size={20}
                    className={
                      exportFormat === "markdown"
                        ? "text-[var(--accent-blue)]"
                        : "text-[var(--text-tertiary)]"
                    }
                  />
                  <div className="text-left">
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">
                      Markdown (.md)
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      GitHub、Obsidian 等で利用可能
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setExportFormat("html")}
                  className={`flex w-full items-center gap-3 rounded-[8px] border px-4 py-3 transition-colors ${
                    exportFormat === "html"
                      ? "border-[var(--accent-blue)] bg-[var(--accent-blue-bg)]"
                      : "border-[var(--border-default)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <Globe
                    size={20}
                    className={
                      exportFormat === "html"
                        ? "text-[var(--accent-blue)]"
                        : "text-[var(--text-tertiary)]"
                    }
                  />
                  <div className="text-left">
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">
                      HTML (.html)
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)]">
                      ブラウザで表示、PDF 印刷可能
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={handleExport}
                className="flex h-[36px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--accent-blue)] text-[13px] font-medium text-white hover:opacity-90"
              >
                <Download size={14} />
                ダウンロード
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-[13px] text-[var(--text-secondary)]">
                Markdown ファイルをインポートして新しいページを作成します。
              </p>

              {/* File upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mb-3 flex h-[60px] w-full items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-[var(--border-default)] text-[13px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
              >
                <FileCode size={18} />
                ファイルを選択 (.md, .txt)
              </button>

              {/* Or paste */}
              <div className="mb-1 text-[11px] text-[var(--text-tertiary)]">
                または Markdown をペースト:
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="# ページタイトル\n\nここにMarkdownを入力..."
                className="mb-4 h-[150px] w-full resize-none rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 font-mono text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />

              {importStatus && (
                <p className="mb-3 text-[12px] text-[var(--text-secondary)]">
                  {importStatus}
                </p>
              )}

              <button
                onClick={() => handleImport(importText)}
                disabled={!importText.trim() || createPage.isPending}
                className="flex h-[36px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--accent-blue)] text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                <Upload size={14} />
                インポート
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
