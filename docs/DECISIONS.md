# 技術的意思決定記録

## Next.js 16 (App Router)

**決定日**: 2026-03-12
**理由**: Server Components によるパフォーマンス最適化、App Router のレイアウトネストでサイドバー構造を自然に表現
**代替案**: Remix, Vite + React Router
**トレードオフ**: 新しい API のため一部ライブラリ（middleware 等）で互換性問題あり

---

## Tailwind CSS v4

**決定日**: 2026-03-12
**理由**: `@theme inline` ブロックで CSS 変数を直接マッピング。`tailwind.config.ts` 不要でシンプル
**代替案**: Tailwind CSS v3, CSS Modules, styled-components
**トレードオフ**: v4 は新しく、一部プラグインが未対応

---

## Drizzle ORM + Neon

**決定日**: 2026-03-12
**理由**: TypeScript ファーストの型安全 ORM。Neon はサーバーレス PostgreSQL で Vercel との相性が良い
**代替案**: Prisma + Supabase, Kysely + PlanetScale
**トレードオフ**: Drizzle はエコシステムが Prisma より小さい。Neon Free プランはプロジェクト数制限あり

---

## tRPC v11

**決定日**: 2026-03-12
**理由**: フルスタック TypeScript で end-to-end 型安全。React Query 統合で Optimistic Update が自然
**代替案**: REST API (Next.js Route Handlers), GraphQL (Apollo)
**トレードオフ**: tRPC はフロントとバックが同一リポジトリ前提。外部 API 公開には不向き（Phase 5 で REST API を別途追加予定）

---

## Auth.js v5 (JWT セッション)

**決定日**: 2026-03-12
**理由**: Next.js との公式統合。JWT 戦略なら sessions テーブル不要でシンプル
**代替案**: Clerk, Lucia, Supabase Auth
**トレードオフ**: beta 版のため API が不安定。DB セッション vs JWT は将来見直し可能性あり

---

## Zustand (状態管理)

**決定日**: 2026-03-12
**理由**: ミニマル、ボイラープレート少、React 外からもアクセス可能
**代替案**: Jotai, Redux Toolkit, React Context
**トレードオフ**: DevTools は Redux ほど充実していない

---

## @dnd-kit (ドラッグ&ドロップ)

**決定日**: 2026-03-12
**理由**: ヘッドレス設計で柔軟。SortableContext でリスト並替が容易
**代替案**: react-beautiful-dnd (メンテ終了), react-dnd
**トレードオフ**: ツリー構造の D&D（親子変更）は自前実装が必要

---

## Fractional Indexing

**決定日**: 2026-03-12
**理由**: 並び替え時に他行の position 更新不要。文字列の辞書順ソートで DB 側の ORDER BY が自然
**代替案**: integer position (gap 方式), linked list
**トレードオフ**: position 文字列が長くなる可能性（数百万回の挿入後）。実用上は問題なし

---

## middleware → 標準 export

**決定日**: 2026-03-12
**理由**: Next.js 16 で `export default auth()` ラッパー方式が動かず、`export async function middleware()` に変更
**代替案**: Auth.js のラッパー方式を使い続ける（Next.js 14/15 向け）
**トレードオフ**: middleware 内で `await auth()` を毎回呼ぶオーバーヘッド（JWT デコードのみなので軽微）

---

## Tiptap v2 EditorProvider パターン

**決定日**: 2026-03-12
**理由**: `useEditor` ではなく `EditorProvider` を採用。子コンポーネント（SlashMenu, BlockDragHandle 等）が `useCurrentEditor()` で editor インスタンスにアクセス可能
**代替案**: `useEditor` フックで editor を props drilling
**トレードオフ**: EditorProvider は子コンポーネントを children として配置する制約がある

---

## 単一ブロック ↔ Tiptap JSONContent ブリッジ

**決定日**: 2026-03-12
**理由**: 1ページに1つの DB ブロック（type: "paragraph"）がページ全体の Tiptap JSONContent を `content` に保持。既存の blocks.list / blocks.update API をそのまま使用でき、スキーマ変更不要
**代替案**: pages テーブルに content JSONB カラム追加、個別ブロック ↔ Tiptap Node 双方向変換
**トレードオフ**: 個別ブロックの CRDT 同期は Phase 3 で再設計が必要

---

## StarterKit 衝突回避パターン

**決定日**: 2026-03-12
**理由**: StarterKit に含まれる `CodeBlock` と `HorizontalRule` をカスタム実装（CodeBlockLowlight, DividerExtension）で置換するため、`codeBlock: false, horizontalRule: false` で無効化
**代替案**: StarterKit を使わず全 extension を個別インポート
**トレードオフ**: StarterKit に新 extension が追加された場合に手動対応が必要

---

## ブロック D&D: ネイティブ Drag + ProseMirror Transaction

**決定日**: 2026-03-12
**理由**: Tiptap が ProseMirror を通じて DOM を管理するため、@dnd-kit で DOM 要素を sortable にすると ProseMirror のドキュメントモデルと不整合が発生。ネイティブ drag イベント + ProseMirror の `tr.mapping.map()` で安全に移動
**代替案**: @dnd-kit/sortable で Tiptap NodeView をラップ、react-dnd
**トレードオフ**: @dnd-kit の高度な機能（DragOverlay のアニメーション等）は未使用。将来的に必要なら DragOverlay のみ追加可能

---

## BlockColor: addGlobalAttributes パターン

**決定日**: 2026-03-12
**理由**: 9種類のブロックノードすべてに `blockColor` 属性を一括追加。個々のノード定義を変更不要
**代替案**: 各 Node Extension に個別に属性追加
**トレードオフ**: サポートするノードタイプの配列を手動管理する必要がある

---

## Suggestion API によるスラッシュコマンド

**決定日**: 2026-03-12
**理由**: Tiptap の `@tiptap/suggestion` が ProseMirror Plugin + Decoration の抽象化を提供。`ReactRenderer` で React コンポーネントをポータル的にマウント可能
**代替案**: 自前の ProseMirror Plugin + InputRule、prosemirror-suggest
**トレードオフ**: ReactRenderer の `require()` による動的インポートが必要（SSR 環境では使用されないため問題なし）
