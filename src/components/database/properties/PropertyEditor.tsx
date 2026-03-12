"use client";

import type { PropertyType, CellValue, FileItem } from "@/types/database";
import { TitleCell } from "./TitleCell";
import { TextCell } from "./TextCell";
import { NumberCell } from "./NumberCell";
import { CheckboxCell } from "./CheckboxCell";
import { SelectCell } from "./SelectCell";
import { MultiSelectCell } from "./MultiSelectCell";
import { StatusCell } from "./StatusCell";
import { DateCell } from "./DateCell";
import { PersonCell } from "./PersonCell";
import { URLCell } from "./URLCell";
import { EmailCell } from "./EmailCell";
import { PhoneCell } from "./PhoneCell";
import { FilesCell } from "./FilesCell";
import { RelationCell } from "./RelationCell";
import { RollupCell } from "./RollupCell";
import { FormulaCell } from "./FormulaCell";

interface PropertyEditorProps {
  type: PropertyType;
  value: CellValue;
  onChange: (value: CellValue) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  pageId?: string;
  isInline?: boolean;
  workspaceId?: string;
  /** For rollup: all cell values keyed as "pageId:propertyId" */
  cellMap?: Map<string, CellValue>;
  /** For formula: current row's cell values keyed by propertyId */
  rowValues?: Map<string, CellValue>;
  /** For formula: property name → id mapping */
  propertyNameMap?: Map<string, string>;
}

export function PropertyEditor({
  type,
  value,
  onChange,
  config = {},
  onConfigChange,
  pageId,
  isInline = true,
  workspaceId,
  cellMap,
  rowValues,
  propertyNameMap,
}: PropertyEditorProps) {
  switch (type) {
    case "title":
      return (
        <TitleCell
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
          pageId={pageId}
        />
      );
    case "text":
      return (
        <TextCell
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );
    case "number":
      return (
        <NumberCell
          value={value as number | null}
          onChange={(v) => onChange(v)}
          config={config}
        />
      );
    case "checkbox":
      return (
        <CheckboxCell
          value={(value as boolean) ?? false}
          onChange={(v) => onChange(v)}
        />
      );
    case "select":
      return (
        <SelectCell
          value={(value as string) ?? null}
          onChange={(v) => onChange(v)}
          config={config}
          onConfigChange={onConfigChange}
        />
      );
    case "multi_select":
      return (
        <MultiSelectCell
          value={(value as string[]) ?? []}
          onChange={(v) => onChange(v)}
          config={config}
          onConfigChange={onConfigChange}
        />
      );
    case "status":
      return (
        <StatusCell
          value={(value as string) ?? null}
          onChange={(v) => onChange(v)}
          config={config}
        />
      );
    case "date":
      return (
        <DateCell
          value={value as { start: string; end?: string | null } | null}
          onChange={(v) => onChange(v)}
          config={config}
        />
      );
    case "person":
      return (
        <PersonCell
          value={(value as string[]) ?? []}
          onChange={(v) => onChange(v)}
          workspaceId={workspaceId}
        />
      );
    case "url":
      return (
        <URLCell
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );
    case "email":
      return (
        <EmailCell
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );
    case "phone":
      return (
        <PhoneCell
          value={(value as string) ?? ""}
          onChange={(v) => onChange(v)}
        />
      );
    case "files":
      return (
        <FilesCell
          value={(value as FileItem[]) ?? []}
          onChange={(v) => onChange(v)}
        />
      );
    case "relation":
      return (
        <RelationCell
          value={(value as string[]) ?? []}
          onChange={(v) => onChange(v)}
          config={config}
        />
      );
    case "rollup":
      return (
        <RollupCell
          value={value}
          config={config}
          cellMap={cellMap}
          pageId={pageId}
        />
      );
    case "formula":
      return (
        <FormulaCell
          value={value}
          config={config}
          rowValues={rowValues}
          propertyNameMap={propertyNameMap}
        />
      );
    // Read-only computed types
    case "created_time":
    case "last_edited_time":
      return (
        <span className="px-2 text-[13px] text-[var(--text-secondary)]">
          {value
            ? new Date(value as string).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      );
    case "created_by":
    case "last_edited_by":
      return (
        <span className="px-2 text-[13px] text-[var(--text-secondary)]">
          {(value as string) || "—"}
        </span>
      );
    default:
      return (
        <span className="px-2 text-[13px] text-[var(--text-tertiary)]">—</span>
      );
  }
}
