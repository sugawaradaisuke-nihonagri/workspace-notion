"use client";

import { useState, useRef, useEffect } from "react";
import {
  MoreHorizontal,
  Download,
  Upload,
  Clock,
  Settings,
} from "lucide-react";
import { ExportImportModal } from "./ExportImportModal";
import { PageHistory } from "./PageHistory";
import { WorkspaceSettings } from "./WorkspaceSettings";

interface MoreMenuProps {
  pageId: string;
  workspaceId: string;
}

export function MoreMenu({ pageId, workspaceId }: MoreMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const items = [
    {
      icon: <Download size={14} />,
      label: "エクスポート / インポート",
      action: () => {
        setIsOpen(false);
        setShowExport(true);
      },
    },
    {
      icon: <Clock size={14} />,
      label: "ページ履歴",
      action: () => {
        setIsOpen(false);
        setShowHistory(true);
      },
    },
    {
      icon: <Settings size={14} />,
      label: "ワークスペース設定",
      action: () => {
        setIsOpen(false);
        setShowSettings(true);
      },
    },
  ];

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          <MoreHorizontal size={16} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-[220px] rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1 shadow-lg">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ExportImportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        pageId={pageId}
        workspaceId={workspaceId}
      />
      <PageHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        pageId={pageId}
      />
      <WorkspaceSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}
