"use client";

import type { PropertyType, CellValue } from "@/types/database";
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

interface PropertyEditorProps {
  type: PropertyType;
  value: CellValue;
  onChange: (value: CellValue) => void;
  config?: Record<string, unknown>;
  pageId?: string;
  isInline?: boolean;
  workspaceId?: string;
}

export function PropertyEditor({
  type,
  value,
  onChange,
  config = {},
  pageId,
  isInline = true,
  workspaceId,
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
        />
      );
    case "multi_select":
      return (
        <MultiSelectCell
          value={(value as string[]) ?? []}
          onChange={(v) => onChange(v)}
          config={config}
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
          value={(value as string[]) ?? []}
          onChange={(v) => onChange(v)}
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
