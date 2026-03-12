/**
 * シードスクリプト — pnpm db:seed で実行
 *
 * テストデータ:
 *   - ワークスペース「プロダクトチーム」
 *   - ユーザー 3 名
 *   - ページツリー (8 ページ + 1 データベース)
 *   - タスクボード: 6 プロパティ, 10 行, 3 ビュー
 *   - Q2 スプリント計画: 15+ ブロック
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { generateKeyBetween } from "fractional-indexing";
import * as schema from "./schema";

// ── DB connection ────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ── Pre-generated UUIDs ──────────────────────────────────
const ID = {
  // Users
  user1: crypto.randomUUID(),
  user2: crypto.randomUUID(),
  user3: crypto.randomUUID(),
  // Workspace
  workspace: crypto.randomUUID(),
  // Pages (top-level)
  roadmap: crypto.randomUUID(),
  taskBoard: crypto.randomUUID(),
  designSystem: crypto.randomUUID(),
  teamWiki: crypto.randomUUID(),
  // Pages (children)
  q2Sprint: crypto.randomUUID(),
  releaseNotes: crypto.randomUUID(),
  componentList: crypto.randomUUID(),
  colorPalette: crypto.randomUUID(),
  onboarding: crypto.randomUUID(),
  devGuidelines: crypto.randomUUID(),
  // Database properties
  propTitle: crypto.randomUUID(),
  propStatus: crypto.randomUUID(),
  propPriority: crypto.randomUUID(),
  propAssignee: crypto.randomUUID(),
  propDueDate: crypto.randomUUID(),
  propTags: crypto.randomUUID(),
  // Database rows (10)
  row1: crypto.randomUUID(),
  row2: crypto.randomUUID(),
  row3: crypto.randomUUID(),
  row4: crypto.randomUUID(),
  row5: crypto.randomUUID(),
  row6: crypto.randomUUID(),
  row7: crypto.randomUUID(),
  row8: crypto.randomUUID(),
  row9: crypto.randomUUID(),
  row10: crypto.randomUUID(),
  // Database views
  viewTable: crypto.randomUUID(),
  viewBoard: crypto.randomUUID(),
  viewCalendar: crypto.randomUUID(),
} as const;

// ── Position helpers ─────────────────────────────────────
function positions(count: number): string[] {
  const result: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < count; i++) {
    prev = generateKeyBetween(prev, null);
    result.push(prev);
  }
  return result;
}

// ── Tiptap JSONContent helpers ───────────────────────────
function doc(...content: unknown[]) {
  return { type: "doc", content };
}

function paragraph(text: string, marks?: Array<{ type: string }>) {
  if (!text) return { type: "paragraph" };
  const textNode: Record<string, unknown> = { type: "text", text };
  if (marks) textNode.marks = marks;
  return { type: "paragraph", content: [textNode] };
}

function heading(level: number, text: string) {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function bulletList(...items: string[]) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [paragraph(text)],
    })),
  };
}

function orderedList(...items: string[]) {
  return {
    type: "orderedList",
    attrs: { start: 1 },
    content: items.map((text) => ({
      type: "listItem",
      content: [paragraph(text)],
    })),
  };
}

function taskList(...items: Array<{ text: string; checked: boolean }>) {
  return {
    type: "taskList",
    content: items.map((item) => ({
      type: "taskItem",
      attrs: { checked: item.checked },
      content: [paragraph(item.text)],
    })),
  };
}

function blockquote(text: string) {
  return { type: "blockquote", content: [paragraph(text)] };
}

function codeBlock(code: string, language = "typescript") {
  return {
    type: "codeBlock",
    attrs: { language },
    content: [{ type: "text", text: code }],
  };
}

function callout(emoji: string, text: string) {
  return {
    type: "callout",
    attrs: { emoji },
    content: [{ type: "text", text }],
  };
}

function divider() {
  return { type: "horizontalRule" };
}

// ══════════════════════════════════════════════════════════
// SEED
// ══════════════════════════════════════════════════════════
async function seed() {
  console.log("🌱 シードデータ投入開始...\n");

  // ── 1. Users ───────────────────────────────────────────
  console.log("  👤 ユーザー (3名)...");
  await db.insert(schema.users).values([
    {
      id: ID.user1,
      email: "tanaka@example.com",
      name: "田中 太郎",
      image: null,
    },
    {
      id: ID.user2,
      email: "suzuki@example.com",
      name: "鈴木 花子",
      image: null,
    },
    {
      id: ID.user3,
      email: "yamada@example.com",
      name: "山田 健一",
      image: null,
    },
  ]);

  // ── 2. Workspace ───────────────────────────────────────
  console.log("  🏢 ワークスペース「プロダクトチーム」...");
  await db.insert(schema.workspaces).values({
    id: ID.workspace,
    name: "プロダクトチーム",
    icon: "🚀",
    plan: "free",
  });

  // ── 3. Workspace Members ───────────────────────────────
  console.log("  👥 メンバーシップ...");
  await db.insert(schema.workspaceMembers).values([
    {
      workspaceId: ID.workspace,
      userId: ID.user1,
      role: "owner",
    },
    {
      workspaceId: ID.workspace,
      userId: ID.user2,
      role: "admin",
    },
    {
      workspaceId: ID.workspace,
      userId: ID.user3,
      role: "editor",
    },
  ]);

  // ── 4. Pages (tree structure) ──────────────────────────
  console.log("  📄 ページツリー (10ページ)...");
  const topPos = positions(4);
  const roadmapChildPos = positions(2);
  const designChildPos = positions(2);
  const wikiChildPos = positions(2);

  await db.insert(schema.pages).values([
    // Top-level pages
    {
      id: ID.roadmap,
      workspaceId: ID.workspace,
      parentId: null,
      title: "プロダクトロードマップ",
      icon: "🗺️",
      type: "page",
      position: topPos[0],
      createdBy: ID.user1,
      lastEditedBy: ID.user1,
    },
    {
      id: ID.taskBoard,
      workspaceId: ID.workspace,
      parentId: null,
      title: "タスクボード",
      icon: "📋",
      type: "database",
      position: topPos[1],
      createdBy: ID.user1,
      lastEditedBy: ID.user1,
    },
    {
      id: ID.designSystem,
      workspaceId: ID.workspace,
      parentId: null,
      title: "デザインシステム",
      icon: "🎨",
      type: "page",
      position: topPos[2],
      createdBy: ID.user2,
      lastEditedBy: ID.user2,
    },
    {
      id: ID.teamWiki,
      workspaceId: ID.workspace,
      parentId: null,
      title: "チーム Wiki",
      icon: "📖",
      type: "page",
      position: topPos[3],
      createdBy: ID.user1,
      lastEditedBy: ID.user3,
    },
    // Roadmap children
    {
      id: ID.q2Sprint,
      workspaceId: ID.workspace,
      parentId: ID.roadmap,
      title: "Q2 スプリント計画",
      icon: "📅",
      type: "page",
      position: roadmapChildPos[0],
      createdBy: ID.user1,
      lastEditedBy: ID.user2,
    },
    {
      id: ID.releaseNotes,
      workspaceId: ID.workspace,
      parentId: ID.roadmap,
      title: "リリースノート v2.4",
      icon: "📝",
      type: "page",
      position: roadmapChildPos[1],
      createdBy: ID.user2,
      lastEditedBy: ID.user2,
    },
    // Design System children
    {
      id: ID.componentList,
      workspaceId: ID.workspace,
      parentId: ID.designSystem,
      title: "コンポーネント一覧",
      icon: "🧩",
      type: "page",
      position: designChildPos[0],
      createdBy: ID.user2,
      lastEditedBy: ID.user2,
    },
    {
      id: ID.colorPalette,
      workspaceId: ID.workspace,
      parentId: ID.designSystem,
      title: "カラーパレット",
      icon: "🎨",
      type: "page",
      position: designChildPos[1],
      createdBy: ID.user2,
      lastEditedBy: ID.user2,
    },
    // Team Wiki children
    {
      id: ID.onboarding,
      workspaceId: ID.workspace,
      parentId: ID.teamWiki,
      title: "オンボーディング",
      icon: "👋",
      type: "page",
      position: wikiChildPos[0],
      createdBy: ID.user3,
      lastEditedBy: ID.user3,
    },
    {
      id: ID.devGuidelines,
      workspaceId: ID.workspace,
      parentId: ID.teamWiki,
      title: "開発ガイドライン",
      icon: "📐",
      type: "page",
      position: wikiChildPos[1],
      createdBy: ID.user1,
      lastEditedBy: ID.user1,
    },
  ]);

  // ── 5. Blocks — Q2 Sprint Planning (15+ blocks) ───────
  console.log("  📝 ブロック (Q2 スプリント計画 — 18 blocks)...");
  const blockPos = positions(18);

  const q2Content = doc(
    heading(1, "Q2 スプリント計画 (2026年4月〜6月)"),
    callout(
      "🎯",
      "目標: ボードビュー・カレンダービューの完成と、リアルタイムコラボレーション基盤の構築",
    ),
    divider(),
    heading(2, "スプリント 1 (4/1 — 4/14)"),
    paragraph("データベースの残りビューを実装するスプリント。"),
    taskList(
      { text: "ボードビュー (カンバン) 実装", checked: true },
      { text: "カレンダービュー 実装", checked: true },
      { text: "ギャラリービュー 実装", checked: true },
      { text: "ビュー管理 (ViewTabs) 実装", checked: false },
    ),
    heading(2, "スプリント 2 (4/15 — 4/28)"),
    paragraph("セルの Optimistic Update とドラッグ&ドロップを実装。"),
    bulletList(
      "セル値更新の楽観的更新",
      "行の D&D 並替 (@dnd-kit)",
      "プロパティ列の D&D 並替",
      "Relation / Rollup プロパティ",
    ),
    heading(2, "スプリント 3 (5/1 — 5/14)"),
    paragraph("リアルタイムコラボレーションの基盤構築。"),
    orderedList(
      "Yjs CRDT ドキュメントのセットアップ",
      "y-websocket サーバーの構築",
      "Tiptap Collaboration Extension の統合",
      "カーソル位置のリアルタイム共有",
    ),
    divider(),
    heading(2, "技術的な注意事項"),
    blockquote(
      "Yjs の導入にあたり、現在の単一ブロック ↔ Tiptap JSONContent ブリッジパターンの再設計が必要。CRDT と EAV の整合性に注意すること。",
    ),
    codeBlock(
      `// Yjs provider setup example
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  "wss://ws.example.com",
  \`page-\${pageId}\`,
  ydoc
);`,
      "typescript",
    ),
    heading(3, "リスクと対策"),
    bulletList(
      "WebSocket 接続の安定性 → 自動再接続 + オフラインキュー",
      "コンフリクト解決 → Yjs CRDT が自動マージ",
      "パフォーマンス → 差分同期 (awareness protocol)",
    ),
  );

  // Store as a single "paragraph" block that holds the full Tiptap document
  await db.insert(schema.blocks).values({
    pageId: ID.q2Sprint,
    type: "paragraph",
    content: q2Content,
    props: {},
    position: blockPos[0],
    createdBy: ID.user1,
  });

  // ── 6. Blocks — Release Notes v2.4 ────────────────────
  console.log("  📝 ブロック (リリースノート v2.4)...");
  const releaseContent = doc(
    heading(1, "リリースノート v2.4"),
    paragraph("リリース日: 2026年3月12日"),
    divider(),
    heading(2, "✨ 新機能"),
    bulletList(
      "データベーステーブルビュー — 13種のセルタイプ、フィルタ/ソート/グループ",
      "列ヘッダーメニュー — リネーム、非表示、削除",
      "テーブルフッター集計 — count, sum, average 等 8 種",
      "ビュータブ切り替え — 複数ビューの作成・管理",
    ),
    heading(2, "🐛 バグ修正"),
    bulletList(
      "サイドバーのページ展開状態が遷移後にリセットされる問題を修正",
      "Optimistic Update 時のキャッシュ不整合を解消",
      "CodeBlock のシンタックスハイライトが一部言語で崩れる問題を修正",
    ),
    heading(2, "⚡ パフォーマンス改善"),
    bulletList(
      "QueryClient staleTime を 30s に設定 — 不要な再フェッチを削減",
      "絵文字ピッカーの動的インポート — 初回ロード 500KB 削減",
    ),
  );

  await db.insert(schema.blocks).values({
    pageId: ID.releaseNotes,
    type: "paragraph",
    content: releaseContent,
    props: {},
    position: "a0",
    createdBy: ID.user2,
  });

  // ── 7. Blocks — Other pages (lightweight) ─────────────
  console.log("  📝 ブロック (その他ページ)...");

  const pagesWithContent: Array<{
    pageId: string;
    content: unknown;
    createdBy: string;
  }> = [
    {
      pageId: ID.roadmap,
      content: doc(
        heading(1, "プロダクトロードマップ"),
        paragraph(
          "2026年の開発計画を管理するページです。各フェーズの詳細は子ページを参照してください。",
        ),
        bulletList(
          "Phase 1: コアエディタ ✅",
          "Phase 2: データベース 🟡",
          "Phase 3: リアルタイム + コラボ",
          "Phase 4-5: 拡張機能",
        ),
      ),
      createdBy: ID.user1,
    },
    {
      pageId: ID.designSystem,
      content: doc(
        heading(1, "デザインシステム"),
        paragraph(
          "WorkSpace アプリケーションのデザイントークン、コンポーネント、パターンを定義します。",
        ),
        callout(
          "📌",
          "Notion の UI/UX を参考にしつつ、独自のダークテーマを基調としたデザインを採用しています。",
        ),
      ),
      createdBy: ID.user2,
    },
    {
      pageId: ID.componentList,
      content: doc(
        heading(1, "コンポーネント一覧"),
        heading(2, "レイアウト"),
        bulletList("Sidebar (260px / 44px)", "Topbar (44px)", "PageHeader"),
        heading(2, "エディタ"),
        bulletList(
          "Editor (Tiptap)",
          "SlashMenu (16 ブロックタイプ)",
          "BlockDragHandle",
          "BlockContextMenu",
        ),
        heading(2, "データベース"),
        bulletList(
          "TableView",
          "BoardView",
          "CalendarView",
          "GalleryView",
          "FilterBar / SortBar / GroupBar",
          "PropertyEditor (13 セルタイプ)",
        ),
      ),
      createdBy: ID.user2,
    },
    {
      pageId: ID.colorPalette,
      content: doc(
        heading(1, "カラーパレット"),
        heading(2, "ベースカラー"),
        bulletList(
          "bg-primary: #191919",
          "bg-secondary: #1e1e1e",
          "bg-tertiary: #252525",
          "accent-blue: #2383e2",
        ),
        heading(2, "テキストカラー"),
        bulletList(
          "text-primary: rgba(255, 255, 255, 0.88)",
          "text-secondary: rgba(255, 255, 255, 0.55)",
          "text-tertiary: rgba(255, 255, 255, 0.35)",
        ),
        heading(2, "ブロックカラー (10色)"),
        bulletList(
          "gray, brown, orange, yellow, green",
          "blue, purple, pink, red, teal",
        ),
      ),
      createdBy: ID.user2,
    },
    {
      pageId: ID.teamWiki,
      content: doc(
        heading(1, "チーム Wiki"),
        paragraph(
          "チーム全員のナレッジベースです。オンボーディング資料や開発ガイドラインをまとめています。",
        ),
      ),
      createdBy: ID.user1,
    },
    {
      pageId: ID.onboarding,
      content: doc(
        heading(1, "オンボーディング"),
        callout("👋", "新しいメンバーの方へ — ようこそプロダクトチームへ！"),
        heading(2, "初日にやること"),
        orderedList(
          "Slack の #product-team チャンネルに参加",
          "GitHub リポジトリへのアクセス権を取得",
          "ローカル開発環境をセットアップ (pnpm install && pnpm dev)",
          "デザインシステムのドキュメントを一読",
        ),
        heading(2, "技術スタック"),
        bulletList(
          "フロントエンド: Next.js 16 + TypeScript + Tailwind CSS v4",
          "バックエンド: tRPC v11 + Drizzle ORM + Neon PostgreSQL",
          "認証: Auth.js v5 (GitHub / Google OAuth)",
          "エディタ: Tiptap v2 (ProseMirror ベース)",
          "状態管理: Zustand + React Query",
        ),
      ),
      createdBy: ID.user3,
    },
    {
      pageId: ID.devGuidelines,
      content: doc(
        heading(1, "開発ガイドライン"),
        heading(2, "ブランチ戦略"),
        bulletList(
          "main: プロダクション (保護ブランチ)",
          "develop: 開発統合ブランチ",
          "feature/*: 機能開発",
          "fix/*: バグ修正",
        ),
        heading(2, "コミットメッセージ"),
        codeBlock(
          `feat: 新機能の追加
fix: バグ修正
refactor: リファクタリング
docs: ドキュメント更新
test: テスト追加/修正`,
          "text",
        ),
        heading(2, "コードレビュー"),
        bulletList(
          "PR は 400行以内を目安",
          "最低 1 名のレビュー承認が必要",
          "CI (lint + type-check) がパスしていること",
        ),
      ),
      createdBy: ID.user1,
    },
  ];

  for (const page of pagesWithContent) {
    await db.insert(schema.blocks).values({
      pageId: page.pageId,
      type: "paragraph",
      content: page.content,
      props: {},
      position: "a0",
      createdBy: page.createdBy,
    });
  }

  // ── 8. Database Properties (6 columns) ─────────────────
  console.log("  📊 データベースプロパティ (6列)...");
  const propPos = positions(6);

  const statusOptions = [
    { id: "not_started", label: "Not started", color: "gray" },
    { id: "in_progress", label: "In progress", color: "blue" },
    { id: "done", label: "Done", color: "green" },
  ];

  const priorityOptions = [
    { id: "high", label: "高", color: "red" },
    { id: "medium", label: "中", color: "orange" },
    { id: "low", label: "低", color: "green" },
  ];

  const tagOptions = [
    { id: "frontend", label: "フロントエンド", color: "blue" },
    { id: "backend", label: "バックエンド", color: "purple" },
    { id: "design", label: "デザイン", color: "pink" },
    { id: "infra", label: "インフラ", color: "orange" },
    { id: "bug", label: "バグ", color: "red" },
    { id: "improvement", label: "改善", color: "green" },
  ];

  await db.insert(schema.databaseProperties).values([
    {
      id: ID.propTitle,
      databaseId: ID.taskBoard,
      name: "タスク名",
      type: "title",
      config: {},
      position: propPos[0],
      width: 280,
    },
    {
      id: ID.propStatus,
      databaseId: ID.taskBoard,
      name: "ステータス",
      type: "status",
      config: {
        options: statusOptions,
        groups: [
          {
            id: "todo",
            label: "To-do",
            color: "gray",
            optionIds: ["not_started"],
          },
          {
            id: "in_progress",
            label: "In progress",
            color: "blue",
            optionIds: ["in_progress"],
          },
          {
            id: "complete",
            label: "Complete",
            color: "green",
            optionIds: ["done"],
          },
        ],
      },
      position: propPos[1],
      width: 160,
    },
    {
      id: ID.propPriority,
      databaseId: ID.taskBoard,
      name: "優先度",
      type: "select",
      config: { options: priorityOptions },
      position: propPos[2],
      width: 120,
    },
    {
      id: ID.propAssignee,
      databaseId: ID.taskBoard,
      name: "担当者",
      type: "person",
      config: {},
      position: propPos[3],
      width: 140,
    },
    {
      id: ID.propDueDate,
      databaseId: ID.taskBoard,
      name: "期限",
      type: "date",
      config: { includeTime: false, dateFormat: "YYYY-MM-DD" },
      position: propPos[4],
      width: 140,
    },
    {
      id: ID.propTags,
      databaseId: ID.taskBoard,
      name: "タグ",
      type: "multi_select",
      config: { options: tagOptions },
      position: propPos[5],
      width: 200,
    },
  ]);

  // ── 9. Database Rows (10 rows) ─────────────────────────
  console.log("  📋 タスクボード行 (10件)...");
  const rowPos = positions(10);
  const rowIds = [
    ID.row1,
    ID.row2,
    ID.row3,
    ID.row4,
    ID.row5,
    ID.row6,
    ID.row7,
    ID.row8,
    ID.row9,
    ID.row10,
  ];

  const tasks = [
    {
      title: "ボードビュー (カンバン) 実装",
      status: "done",
      priority: "high",
      assignee: ID.user1,
      due: "2026-04-07",
      tags: ["frontend"],
    },
    {
      title: "カレンダービュー実装",
      status: "done",
      priority: "high",
      assignee: ID.user1,
      due: "2026-04-10",
      tags: ["frontend"],
    },
    {
      title: "ギャラリービュー実装",
      status: "done",
      priority: "medium",
      assignee: ID.user2,
      due: "2026-04-12",
      tags: ["frontend", "design"],
    },
    {
      title: "ビュー管理 (ViewTabs) 実装",
      status: "in_progress",
      priority: "high",
      assignee: ID.user1,
      due: "2026-04-14",
      tags: ["frontend"],
    },
    {
      title: "セルの Optimistic Update",
      status: "not_started",
      priority: "medium",
      assignee: ID.user2,
      due: "2026-04-18",
      tags: ["frontend", "backend"],
    },
    {
      title: "行の D&D 並替",
      status: "not_started",
      priority: "medium",
      assignee: ID.user1,
      due: "2026-04-21",
      tags: ["frontend"],
    },
    {
      title: "Relation / Rollup プロパティ",
      status: "not_started",
      priority: "medium",
      assignee: ID.user3,
      due: "2026-04-25",
      tags: ["backend"],
    },
    {
      title: "Yjs CRDT セットアップ",
      status: "not_started",
      priority: "high",
      assignee: ID.user1,
      due: "2026-05-05",
      tags: ["backend", "infra"],
    },
    {
      title: "y-websocket サーバー構築",
      status: "not_started",
      priority: "high",
      assignee: ID.user3,
      due: "2026-05-09",
      tags: ["backend", "infra"],
    },
    {
      title: "UI カラーパレットの見直し",
      status: "in_progress",
      priority: "low",
      assignee: ID.user2,
      due: "2026-04-30",
      tags: ["design", "improvement"],
    },
  ];

  // Insert row pages (type: database_row)
  await db.insert(schema.pages).values(
    tasks.map((task, i) => ({
      id: rowIds[i],
      workspaceId: ID.workspace,
      parentId: ID.taskBoard,
      databaseId: ID.taskBoard,
      title: task.title,
      icon: "📄",
      type: "database_row" as const,
      position: rowPos[i],
      createdBy: task.assignee,
      lastEditedBy: task.assignee,
    })),
  );

  // ── 10. Cell Values ────────────────────────────────────
  console.log("  📊 セル値 (50件)...");
  const cellValues: Array<{
    pageId: string;
    propertyId: string;
    value: unknown;
  }> = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const rowId = rowIds[i];

    // Status
    cellValues.push({
      pageId: rowId,
      propertyId: ID.propStatus,
      value: task.status,
    });
    // Priority
    cellValues.push({
      pageId: rowId,
      propertyId: ID.propPriority,
      value: task.priority,
    });
    // Assignee
    cellValues.push({
      pageId: rowId,
      propertyId: ID.propAssignee,
      value: [task.assignee],
    });
    // Due date
    cellValues.push({
      pageId: rowId,
      propertyId: ID.propDueDate,
      value: { start: task.due },
    });
    // Tags
    cellValues.push({
      pageId: rowId,
      propertyId: ID.propTags,
      value: task.tags,
    });
  }

  await db.insert(schema.databaseCellValues).values(cellValues);

  // ── 11. Database Views (3 views) ───────────────────────
  console.log("  👁️ データベースビュー (3件)...");
  const viewPos = positions(3);
  const allPropIds = [
    ID.propTitle,
    ID.propStatus,
    ID.propPriority,
    ID.propAssignee,
    ID.propDueDate,
    ID.propTags,
  ];

  await db.insert(schema.databaseViews).values([
    {
      id: ID.viewTable,
      databaseId: ID.taskBoard,
      name: "テーブル",
      layout: "table",
      filter: {},
      sort: [],
      groupBy: {},
      visibleProperties: allPropIds,
      position: viewPos[0],
    },
    {
      id: ID.viewBoard,
      databaseId: ID.taskBoard,
      name: "ボード",
      layout: "board",
      filter: {},
      sort: [],
      groupBy: { propertyId: ID.propStatus },
      visibleProperties: allPropIds,
      position: viewPos[1],
    },
    {
      id: ID.viewCalendar,
      databaseId: ID.taskBoard,
      name: "カレンダー",
      layout: "calendar",
      filter: {},
      sort: [],
      groupBy: {},
      visibleProperties: allPropIds,
      position: viewPos[2],
    },
  ]);

  console.log("\n✅ シードデータ投入完了！\n");
  console.log(`  ワークスペース ID: ${ID.workspace}`);
  console.log(`  ユーザー:`);
  console.log(`    田中太郎 (owner): ${ID.user1}`);
  console.log(`    鈴木花子 (admin): ${ID.user2}`);
  console.log(`    山田健一 (member): ${ID.user3}`);
  console.log(`  タスクボード: ${ID.taskBoard}`);
  console.log(`  ページ数: 10 (8 pages + 1 database + 10 database_rows)\n`);
}

seed().catch((err) => {
  console.error("❌ シードエラー:", err);
  process.exit(1);
});
