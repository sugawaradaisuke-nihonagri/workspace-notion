// === Database Property Types ===

export const PROPERTY_TYPES = [
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "files",
  "checkbox",
  "url",
  "email",
  "phone",
  "relation",
  "rollup",
  "formula",
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
  "unique_id",
  "button",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const VIEW_LAYOUTS = [
  "table",
  "board",
  "calendar",
  "gallery",
  "list",
  "timeline",
  "chart",
] as const;

export type ViewLayout = (typeof VIEW_LAYOUTS)[number];

// --- Select / MultiSelect option ---
export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

// --- Status group ---
export interface StatusGroup {
  id: string;
  label: string;
  color: string;
  optionIds: string[];
}

// --- Property config by type ---
export interface SelectConfig {
  options: SelectOption[];
}

export interface MultiSelectConfig {
  options: SelectOption[];
}

export interface StatusConfig {
  options: SelectOption[];
  groups: StatusGroup[];
}

export interface NumberConfig {
  format: "number" | "percent" | "currency" | "bar";
  currency?: string;
}

export interface DateConfig {
  includeTime: boolean;
  dateFormat?: string;
  timeFormat?: "12h" | "24h";
}

export interface RelationConfig {
  databaseId: string;
  isSynced: boolean;
}

export type PropertyConfig =
  | SelectConfig
  | MultiSelectConfig
  | StatusConfig
  | NumberConfig
  | DateConfig
  | RelationConfig
  | Record<string, unknown>;

// --- Cell value types ---
export type CellValue =
  | string
  | number
  | boolean
  | string[] // multi_select, person, files
  | { start: string; end?: string | null; reminder?: string | null } // date
  | null;

// --- Filter / Sort ---
export interface FilterCondition {
  propertyId: string;
  operator: string; // "equals" | "contains" | "is_empty" | "is_not_empty" | "gt" | "lt" etc.
  value?: CellValue;
}

export interface FilterGroup {
  connector: "and" | "or";
  conditions: FilterCondition[];
}

export interface SortRule {
  propertyId: string;
  direction: "asc" | "desc";
}

// --- Property display info ---
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  title: "タイトル",
  text: "テキスト",
  number: "数値",
  select: "セレクト",
  multi_select: "マルチセレクト",
  status: "ステータス",
  date: "日付",
  person: "ユーザー",
  files: "ファイル",
  checkbox: "チェックボックス",
  url: "URL",
  email: "メール",
  phone: "電話番号",
  relation: "リレーション",
  rollup: "ロールアップ",
  formula: "関数",
  created_time: "作成日時",
  created_by: "作成者",
  last_edited_time: "最終更新日時",
  last_edited_by: "最終更新者",
  unique_id: "ID",
  button: "ボタン",
};

// --- Select option colors ---
export const SELECT_COLORS = [
  {
    id: "gray",
    label: "グレー",
    bg: "var(--tag-gray-bg)",
    text: "var(--tag-gray-text)",
  },
  { id: "brown", label: "ブラウン", bg: "#4a3728", text: "#d4a574" },
  { id: "orange", label: "オレンジ", bg: "#3d2e1e", text: "#f0a050" },
  { id: "yellow", label: "イエロー", bg: "#3d3520", text: "#e8c840" },
  { id: "green", label: "グリーン", bg: "#1e3a2a", text: "#50c878" },
  { id: "blue", label: "ブルー", bg: "#1e2d3d", text: "#5090f0" },
  { id: "purple", label: "パープル", bg: "#2d1e3d", text: "#a070e0" },
  { id: "pink", label: "ピンク", bg: "#3d1e2d", text: "#e070b0" },
  { id: "red", label: "レッド", bg: "#3d1e1e", text: "#e05050" },
] as const;

// --- Status default config ---
export const DEFAULT_STATUS_CONFIG: StatusConfig = {
  options: [
    { id: "not_started", label: "Not started", color: "gray" },
    { id: "in_progress", label: "In progress", color: "blue" },
    { id: "done", label: "Done", color: "green" },
  ],
  groups: [
    { id: "todo", label: "To-do", color: "gray", optionIds: ["not_started"] },
    {
      id: "in_progress",
      label: "In progress",
      color: "blue",
      optionIds: ["in_progress"],
    },
    { id: "complete", label: "Complete", color: "green", optionIds: ["done"] },
  ],
};

// --- Aggregation ---
export type AggregationType =
  | "none"
  | "count"
  | "count_values"
  | "sum"
  | "average"
  | "min"
  | "max"
  | "percent_empty"
  | "percent_not_empty";

export const AGGREGATION_LABELS: Record<AggregationType, string> = {
  none: "なし",
  count: "カウント",
  count_values: "値のカウント",
  sum: "合計",
  average: "平均",
  min: "最小",
  max: "最大",
  percent_empty: "空欄の割合",
  percent_not_empty: "入力済みの割合",
};
