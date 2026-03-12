"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { GripVertical, Plus } from "lucide-react";
import { BlockContextMenu } from "./menus/BlockContextMenu";

// --- Types ---

interface BlockInfo {
  dom: HTMLElement;
  pos: number;
  node: PmNode;
}

// --- Helpers ---

/** Iterate top-level nodes and find the one the mouse Y is inside */
function findBlockAtY(editor: Editor, y: number): BlockInfo | null {
  const doc = editor.state.doc;
  let result: BlockInfo | null = null;

  doc.forEach((node, offset) => {
    const dom = editor.view.nodeDOM(offset) as HTMLElement | null;
    if (!dom) return;
    const rect = dom.getBoundingClientRect();
    if (y >= rect.top - 2 && y <= rect.bottom + 2) {
      result = { dom, pos: offset, node };
    }
  });

  return result;
}

/** Get all top-level block infos */
function getAllBlocks(editor: Editor): BlockInfo[] {
  const blocks: BlockInfo[] = [];
  editor.state.doc.forEach((node, offset) => {
    const dom = editor.view.nodeDOM(offset) as HTMLElement | null;
    if (dom) {
      blocks.push({ dom, pos: offset, node });
    }
  });
  return blocks;
}

/** Move a top-level node from one position to another using a single transaction */
function moveBlock(editor: Editor, fromPos: number, targetPos: number): void {
  const node = editor.state.doc.nodeAt(fromPos);
  if (!node) return;

  const { state, view } = editor;
  const tr = state.tr;

  // Delete source first
  tr.delete(fromPos, fromPos + node.nodeSize);
  // Map the target position through the deletion
  const mapped = tr.mapping.map(targetPos);
  // Insert at the mapped position
  tr.insert(mapped, node);

  view.dispatch(tr);
  editor.commands.focus();
}

// --- Component ---

export function BlockDragHandle() {
  const { editor } = useCurrentEditor();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Hover state
  const [hoveredBlock, setHoveredBlock] = useState<BlockInfo | null>(null);
  const [handlePos, setHandlePos] = useState<{ top: number } | null>(null);

  // Context menu
  const [menuBlock, setMenuBlock] = useState<BlockInfo | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragSource, setDragSource] = useState<BlockInfo | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    top: number;
    targetPos: number;
  } | null>(null);

  // Multi-selection
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    from: number;
    to: number;
  } | null>(null);

  // --- Hover tracking ---
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!editor || isDragging) return;

      const editorDom = editor.view.dom;
      const wrapperEl = wrapperRef.current;
      if (!wrapperEl) return;

      const block = findBlockAtY(editor, e.clientY);
      if (!block) {
        setHoveredBlock(null);
        setHandlePos(null);
        return;
      }

      setHoveredBlock(block);

      const wrapperRect = wrapperEl.getBoundingClientRect();
      const blockRect = block.dom.getBoundingClientRect();
      setHandlePos({ top: blockRect.top - wrapperRect.top });
    },
    [editor, isDragging],
  );

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;
    editorDom.addEventListener("mousemove", handleMouseMove);

    const handleMouseLeave = (e: MouseEvent) => {
      if (isDragging) return;
      // Don't clear if the mouse moved into the block handle buttons
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget && wrapperRef.current?.contains(relatedTarget)) {
        return;
      }
      setHoveredBlock(null);
      setHandlePos(null);
    };
    editorDom.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      editorDom.removeEventListener("mousemove", handleMouseMove);
      editorDom.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, handleMouseMove, isDragging]);

  // Clear handles when mouse leaves the handle layer entirely
  const handleLayerLeave = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return;
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      // Don't clear if moving back into the editor
      if (relatedTarget && editor?.view.dom.contains(relatedTarget)) {
        return;
      }
      setHoveredBlock(null);
      setHandlePos(null);
    },
    [editor, isDragging],
  );

  // --- Insert paragraph above ---
  const handleInsertAbove = useCallback(() => {
    if (!editor || !hoveredBlock) return;
    editor
      .chain()
      .focus()
      .insertContentAt(hoveredBlock.pos, { type: "paragraph" })
      .run();
  }, [editor, hoveredBlock]);

  // --- Context menu ---
  const handleGripClick = useCallback(
    (e: React.MouseEvent) => {
      if (!hoveredBlock) return;
      e.stopPropagation();
      setMenuBlock(hoveredBlock);
      setMenuPos({ x: e.clientX, y: e.clientY });
    },
    [hoveredBlock],
  );

  const closeMenu = useCallback(() => {
    setMenuBlock(null);
    setMenuPos(null);
  }, []);

  // --- Drag & Drop ---
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!editor || !hoveredBlock) return;

      setIsDragging(true);
      setDragSource(hoveredBlock);

      // Make the drag image transparent (we'll show custom opacity)
      const ghost = document.createElement("div");
      ghost.style.opacity = "0";
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => ghost.remove(), 0);

      e.dataTransfer.effectAllowed = "move";

      // Dim the source block
      hoveredBlock.dom.style.opacity = "0.3";
    },
    [editor, hoveredBlock],
  );

  const handleDrag = useCallback(
    (e: React.DragEvent) => {
      if (!editor || !dragSource || e.clientY === 0) return;

      const target = findBlockAtY(editor, e.clientY);
      if (!target || target.pos === dragSource.pos) {
        setDropIndicator(null);
        return;
      }

      const targetRect = target.dom.getBoundingClientRect();
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      if (!wrapperRect) return;

      const midY = targetRect.top + targetRect.height / 2;
      const insertBefore = e.clientY < midY;

      setDropIndicator({
        top:
          (insertBefore ? targetRect.top : targetRect.bottom) - wrapperRect.top,
        targetPos: insertBefore
          ? target.pos
          : target.pos + target.node.nodeSize,
      });
    },
    [editor, dragSource],
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      // Reset source block opacity
      if (dragSource) {
        dragSource.dom.style.opacity = "";
      }

      if (editor && dragSource && dropIndicator) {
        moveBlock(editor, dragSource.pos, dropIndicator.targetPos);
      }

      setIsDragging(false);
      setDragSource(null);
      setDropIndicator(null);
    },
    [editor, dragSource, dropIndicator],
  );

  // --- Multi-selection (Shift+Click) ---
  useEffect(() => {
    if (!editor) return;

    const handleClick = (e: MouseEvent) => {
      if (!e.shiftKey) {
        // Normal click: clear selection, set anchor
        const block = findBlockAtY(editor, e.clientY);
        if (block) {
          setSelectionAnchor(block.pos);
        }
        setSelectedRange(null);
        return;
      }

      // Shift+Click: extend selection
      const block = findBlockAtY(editor, e.clientY);
      if (!block) return;

      const anchor = selectionAnchor ?? 0;
      const from = Math.min(anchor, block.pos);
      const toBlock =
        anchor > block.pos
          ? editor.state.doc.nodeAt(anchor)
          : editor.state.doc.nodeAt(block.pos);
      const toPos = Math.max(anchor, block.pos) + (toBlock?.nodeSize ?? 0);

      setSelectedRange({ from, to: toPos });

      // Apply ProseMirror text selection over the range
      const selection = TextSelection.create(editor.state.doc, from, toPos);
      editor.view.dispatch(editor.state.tr.setSelection(selection));
    };

    const editorDom = editor.view.dom;
    editorDom.addEventListener("click", handleClick);
    return () => editorDom.removeEventListener("click", handleClick);
  }, [editor, selectionAnchor]);

  // Bulk delete on Delete/Backspace when multi-selected
  useEffect(() => {
    if (!editor || !selectedRange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRange) {
        e.preventDefault();
        editor.chain().focus().deleteRange(selectedRange).run();
        setSelectedRange(null);
        setSelectionAnchor(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, selectedRange]);

  // --- Render ---
  if (!editor) return null;

  return (
    <div ref={wrapperRef} className="block-handle-layer">
      {/* Floating handle */}
      {handlePos && hoveredBlock && !isDragging && (
        <div
          className="block-handle-group"
          style={{ top: handlePos.top }}
          onMouseLeave={handleLayerLeave}
        >
          {/* + button */}
          <button
            className="block-handle-btn"
            onClick={handleInsertAbove}
            title="ブロックを追加"
          >
            <Plus size={14} />
          </button>

          {/* ⋮⋮ grip handle */}
          <div
            className="block-handle-btn block-grip"
            draggable
            onClick={handleGripClick}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            title="ドラッグで移動 / クリックでメニュー"
          >
            <GripVertical size={14} />
          </div>
        </div>
      )}

      {/* Drop indicator (blue line) */}
      {dropIndicator && (
        <div className="drop-indicator" style={{ top: dropIndicator.top }} />
      )}

      {/* Multi-selection highlight overlay */}
      {selectedRange && (
        <SelectedBlocksOverlay
          editor={editor}
          range={selectedRange}
          wrapperRef={wrapperRef}
        />
      )}

      {/* Context menu */}
      {menuBlock && menuPos && (
        <BlockContextMenu
          editor={editor}
          block={menuBlock}
          position={menuPos}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

// --- Multi-selection overlay ---

function SelectedBlocksOverlay({
  editor,
  range,
  wrapperRef,
}: {
  editor: Editor;
  range: { from: number; to: number };
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const blocks = getAllBlocks(editor);
  const wrapperRect = wrapperRef.current?.getBoundingClientRect();
  if (!wrapperRect) return null;

  return (
    <>
      {blocks
        .filter(
          (b) => b.pos >= range.from && b.pos + b.node.nodeSize <= range.to,
        )
        .map((b) => {
          const rect = b.dom.getBoundingClientRect();
          return (
            <div
              key={b.pos}
              className="selected-block-highlight"
              style={{
                top: rect.top - wrapperRect.top,
                height: rect.height,
              }}
            />
          );
        })}
    </>
  );
}
