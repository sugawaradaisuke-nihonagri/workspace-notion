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
**トレードオフ**: 個別ブロックの CRDT 同期は Yjs の Y.Doc が管理するため、blocks テーブルはフォールバック用

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
**トレードオフ**: @dnd-kit の高度な機能（DragOverlay のアニメーション等）は未使用

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
**トレードオフ**: ReactRenderer の `require()` による動的インポートが必要

---

## EAV パターンによるデータベースセル値管理

**決定日**: 2026-03-12
**理由**: Notion のようにユーザーが自由に列を追加/削除できる動的カラムを実現。`database_properties` (列定義) と `database_cell_values` (セル値) を分離し、JSONB value で任意の型を格納
**代替案**: PostgreSQL の ALTER TABLE で動的カラム追加、JSONB で行全体を1カラムに格納
**トレードオフ**: JOIN が複雑になる。10,000行超では全セル一括取得が遅延する可能性

---

## クライアントサイド フィルタ/ソート

**決定日**: 2026-03-12
**理由**: データベースのフィルタ/ソート/グループをクライアント側の `useMemo` で処理。フィルタ条件変更のたびにサーバーへ再クエリする必要がなく、即時応答
**代替案**: サーバーサイドフィルタ (SQL WHERE + ORDER BY)
**トレードオフ**: 全行+全セルを初回一括取得するため、10,000行超でペイロードサイズが問題に

---

## データベースビュー設定の永続化

**決定日**: 2026-03-12
**理由**: フィルタ/ソート/グループ/表示列を `database_views` テーブルに JSONB で保存。ビュー切り替え時に設定を即座にロード
**代替案**: URL パラメータでフィルタ条件を表現、LocalStorage
**トレードオフ**: ビュー設定変更のたびに DB 書き込みが発生するが、mutation debounce で緩和可能

---

## Yjs CRDT + y-websocket (リアルタイム同時編集)

**決定日**: 2026-03-12
**理由**: Yjs は最も広く使われている CRDT 実装で、Tiptap が公式に Collaboration 拡張を提供。y-websocket v3 はスタンドアロンサーバーとして運用可能で、Next.js のサーバーレス制約に影響されない
**代替案**: Liveblocks (SaaS), Automerge, ShareDB (OT)
**トレードオフ**: y-websocket サーバーを別プロセスでホスティングする必要あり。Vercel Edge Functions では WebSocket サーバーを直接ホストできないため、Railway/Fly.io 等が必要

---

## Tiptap Collaboration + CollaborationCursor

**決定日**: 2026-03-12
**理由**: Tiptap の公式拡張で Y.Doc との連携が確立。StarterKit の History と排他的なため、コラボモード時は History を無効化して Yjs の undo manager に委譲
**代替案**: y-prosemirror プラグインを直接使用
**トレードオフ**: CollaborationCursor v2 は Tiptap v3 との peer dep 警告あり（機能上は問題なし）

---

## Yjs 状態の PostgreSQL bytea 永続化

**決定日**: 2026-03-12
**理由**: Yjs の `encodeStateAsUpdate()` で Y.Doc を Uint8Array にシリアライズし、PostgreSQL の bytea カラムに保存。2秒デバウンスで DB 書き込み頻度を抑制。別途のKVストア（Redis等）が不要
**代替案**: Redis に保存、S3 に保存、y-leveldb で LevelDB に保存
**トレードオフ**: bytea カラムは大きなドキュメントでは数MB になる可能性 → 将来的にガベージコレクション（encodeStateAsUpdate → mergeUpdates）を検討

---

## 5段階ロールベース権限管理

**決定日**: 2026-03-12
**理由**: Notion の権限モデルを参考に、owner/admin/editor/commenter/viewer の5段階。数値レベル (5→1) で比較することで、`hasRole(userRole, minRole)` の1関数でチェック可能
**代替案**: ページ単位の ACL (Access Control List)、属性ベースアクセス制御 (ABAC)
**トレードオフ**: ワークスペース単位のロールのみで、ページ単位の個別権限はなし。Phase 4 以降でページ単位の共有設定を追加検討

---

## 権限チェックの一元化 (verify-access.ts)

**決定日**: 2026-03-12
**理由**: 各ルーターに散在していた inline の `verifyPageAccess` を `verify-access.ts` に集約。`requirePageRole` と `requireDatabaseRole` の2関数で全ルーターの認可を統一
**代替案**: tRPC middleware として全プロシージャに自動適用
**トレードオフ**: middleware 方式だと pageId/databaseId の取得パターンがプロシージャごとに異なるため、明示的な関数呼び出しの方が柔軟
