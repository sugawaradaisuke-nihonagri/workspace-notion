"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import {
  Trash2,
  Copy,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Palette,
  Link,
  ChevronRight,
} from "lucide-react";
import { BLOCK_COLORS, type BlockColorId } from "../extensions/block-color";

interface BlockInfo {
  dom: HTMLElement;
  pos: number;
  node: PmNode;
}

interface BlockContextMenuProps {
  editor: Editor;
  block: BlockInfo;
  position: { x: number; y: number };
  onClose: () => void;
}

// --- Turn Into items ---
const TURN_INTO_ITEMS = [
  { id: "paragraph", label: "テキスト", icon: "Aa" },
  { id: "heading1", label: "見出し1", icon: "H₁" },
  { id: "heading2", label: "見出し2", icon: "H₂" },
  { id: "heading3", label: "見出し3", icon: "H₃" },
  { id: "todo", label: "To-doリスト", icon: "☑" },
  { id: "bullet", label: "箇条書き", icon: "•" },
  { id: "numbered", label: "番号付きリスト", icon: "1." },
  { id: "quote", label: "引用", icon: "❝" },
  { id: "callout", label: "コールアウト", icon: "💡" },
  { id: "code", label: "コード", icon: "⟨⟩" },
] as const;

export function BlockContextMenu({
  editor,
  block,
  position,
  onClose,
}: BlockContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [subMenu, setSubMenu] = useState<"turnInto" | "color" | null>(null);

  // Close on ESC or click outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    // Delay to prevent the opening click from immediately closing
    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timer);
    };
  }, [onClose]);

  // --- Actions ---

  const handleDelete = useCallback(() => {
    editor
      .chain()
      .focus()
      .deleteRange({ from: block.pos, to: block.pos + block.node.nodeSize })
      .run();
    onClose();
  }, [editor, block, onClose]);

  const handleDuplicate = useCallback(() => {
    const json = block.node.toJSON();
    const insertPos = block.pos + block.node.nodeSize;
    editor.chain().focus().insertContentAt(insertPos, json).run();
    onClose();
  }, [editor, block, onClose]);

  const handleMoveUp = useCallback(() => {
    // Find the previous sibling
    let prevPos: number | null = null;
    editor.state.doc.forEach((node, offset) => {
      if (offset < block.pos) {
        prevPos = offset;
      }
    });
    if (prevPos !== null) {
      moveBlock(editor, block.pos, prevPos);
    }
    onClose();
  }, [editor, block, onClose]);

  const handleMoveDown = useCallback(() => {
    // Find the next sibling
    let nextPos: number | null = null;
    let found = false;
    editor.state.doc.forEach((node, offset) => {
      if (found && nextPos === null) {
        nextPos = offset + node.nodeSize;
      }
      if (offset === block.pos) {
        found = true;
      }
    });
    if (nextPos !== null) {
      moveBlock(editor, block.pos, nextPos);
    }
    onClose();
  }, [editor, block, onClose]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.href}#block-${block.pos}`;
    navigator.clipboard.writeText(url);
    onClose();
  }, [block, onClose]);

  const handleTurnInto = useCallback(
    (typeId: string) => {
      const chain = editor.chain().focus();
      // First select the block
      chain.setTextSelection({ from: block.pos + 1, to: block.pos + 1 });

      switch (typeId) {
        case "paragraph":
          chain.setParagraph().run();
          break;
        case "heading1":
          chain.setHeading({ level: 1 }).run();
          break;
        case "heading2":
          chain.setHeading({ level: 2 }).run();
          break;
        case "heading3":
          chain.setHeading({ level: 3 }).run();
          break;
        case "todo":
          chain.toggleTaskList().run();
          break;
        case "bullet":
          chain.toggleBulletList().run();
          break;
        case "numbered":
          chain.toggleOrderedList().run();
          break;
        case "quote":
          chain.setBlockquote().run();
          break;
        case "callout":
          chain.setCallout().run();
          break;
        case "code":
          chain.setCodeBlock().run();
          break;
        default:
          chain.run();
      }
      onClose();
    },
    [editor, block, onClose],
  );

  const handleSetColor = useCallback(
    (colorId: BlockColorId) => {
      editor
        .chain()
        .focus()
        .setTextSelection({ from: block.pos + 1, to: block.pos + 1 })
        .updateAttributes(block.node.type.name, {
          blockColor: colorId === "default" ? null : colorId,
        })
        .run();
      onClose();
    },
    [editor, block, onClose],
  );

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
    >
      {/* Main menu */}
      <div
        className="w-[220px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-1"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* 削除 */}
        <MenuItem
          icon={<Trash2 size={14} />}
          label="削除"
          onClick={handleDelete}
          danger
        />

        {/* 複製 */}
        <MenuItem
          icon={<Copy size={14} />}
          label="複製"
          onClick={handleDuplicate}
        />

        <MenuDivider />

        {/* Turn into */}
        <MenuItem
          icon={<RotateCcw size={14} />}
          label="ブロックタイプ変換"
          hasSubmenu
          onMouseEnter={() => setSubMenu("turnInto")}
          onMouseLeave={() => setSubMenu(null)}
          onClick={() => setSubMenu(subMenu === "turnInto" ? null : "turnInto")}
        />

        <MenuDivider />

        {/* Move up */}
        <MenuItem
          icon={<ArrowUp size={14} />}
          label="上に移動"
          onClick={handleMoveUp}
        />

        {/* Move down */}
        <MenuItem
          icon={<ArrowDown size={14} />}
          label="下に移動"
          onClick={handleMoveDown}
        />

        <MenuDivider />

        {/* Color */}
        <MenuItem
          icon={<Palette size={14} />}
          label="カラー"
          hasSubmenu
          onMouseEnter={() => setSubMenu("color")}
          onMouseLeave={() => setSubMenu(null)}
          onClick={() => setSubMenu(subMenu === "color" ? null : "color")}
        />

        {/* Copy link */}
        <MenuItem
          icon={<Link size={14} />}
          label="リンクをコピー"
          onClick={handleCopyLink}
        />
      </div>

      {/* Turn Into submenu */}
      {subMenu === "turnInto" && (
        <div
          className="absolute left-[224px] top-[70px] w-[200px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
          onMouseEnter={() => setSubMenu("turnInto")}
          onMouseLeave={() => setSubMenu(null)}
        >
          {TURN_INTO_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTurnInto(item.id)}
              className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center text-[13px]">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Color submenu */}
      {subMenu === "color" && (
        <div
          className="absolute left-[224px] top-[192px] w-[200px] overflow-hidden rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-tertiary)] p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
          onMouseEnter={() => setSubMenu("color")}
          onMouseLeave={() => setSubMenu(null)}
        >
          {BLOCK_COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => handleSetColor(color.id)}
              className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              <span
                className="h-[16px] w-[16px] rounded-[3px] border border-[var(--border-default)]"
                style={{
                  backgroundColor: color.var
                    ? `var(${color.var})`
                    : "transparent",
                }}
              />
              {color.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  hasSubmenu,
  onMouseEnter,
  onMouseLeave,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  hasSubmenu?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--bg-hover)]"
      style={{ color: danger ? "#e57373" : "var(--text-primary)" }}
    >
      <span className="flex h-[16px] w-[16px] items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hasSubmenu && (
        <ChevronRight size={12} className="text-[var(--text-tertiary)]" />
      )}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-[var(--border-default)]" />;
}

// --- Helper (duplicated from BlockDragHandle to avoid circular import) ---

function moveBlock(editor: Editor, fromPos: number, targetPos: number): void {
  const node = editor.state.doc.nodeAt(fromPos);
  if (!node) return;

  const { state, view } = editor;
  const tr = state.tr;
  tr.delete(fromPos, fromPos + node.nodeSize);
  const mapped = tr.mapping.map(targetPos);
  tr.insert(mapped, node);
  view.dispatch(tr);
  editor.commands.focus();
}
