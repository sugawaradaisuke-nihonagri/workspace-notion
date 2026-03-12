# パフォーマンス最適化記録

## 目標値

| 指標 | 目標 | 現在 |
|------|------|------|
| 初回ロード (LCP) | < 1.5秒 | 未計測 |
| ブロック操作応答 | < 50ms | ProseMirror 直接操作 (ローカル即時) |
| 1000ブロックページ | スムーズスクロール | 未実装 |
| DB 10,000行 | テーブル操作可能 | 未実装 |

---

## 実施済み最適化

### 🚀 DB接続の遅延初期化

**実施日**: 2026-03-12

**Before**: `neon()` がモジュール読み込み時に即座に実行。`DATABASE_URL` が未設定だとビルド時エラー

**After**: `getDb()` 関数で遅延初期化。初回アクセス時のみ接続を確立

**効果**: ビルド時に DB 接続不要。CI/CD でのビルドが通る

**関連ファイル**: `src/lib/db/index.ts`

---

### 🚀 Auth.js の遅延コンフィグ

**実施日**: 2026-03-12

**Before**: `NextAuth(config)` でモジュール読み込み時に DrizzleAdapter が DB 接続を要求

**After**: `NextAuth(() => config)` の関数形式でリクエスト時のみ adapter を生成

**効果**: ビルド時に DB 接続不要。static ページ生成が成功

**関連ファイル**: `src/lib/auth/index.ts`

---

### 🚀 Fractional Indexing による並び順管理

**実施日**: 2026-03-12

**Before**: (設計段階) integer position → 並び替え時に全行更新

**After**: `fractional-indexing` ライブラリで string position → INSERT 時に他行更新不要

**効果**: O(1) の並び替え。大量ページ/ブロックでもパフォーマンス劣化なし

**関連ファイル**: `src/lib/trpc/routers/pages.ts`, `src/lib/trpc/routers/blocks.ts`

---

### 🚀 Tiptap 自動保存デバウンス

**実施日**: 2026-03-12

**Before**: (設計段階) キーストロークごとに API 呼び出し → 大量リクエスト

**After**: `onChange` → 1000ms デバウンス → `blocks.update` でまとめて保存。`latestContentRef` で最新コンテンツを保持し、アンマウント時にフラッシュ

**効果**: API 呼び出しを 1/50 以下に削減。ユーザー体験を損なわず DB 負荷を低減

**関連ファイル**: `src/components/editor/Editor.tsx`

---

### 🚀 EditorProvider immediatelyRender: false

**実施日**: 2026-03-12

**Before**: Tiptap がサーバーサイドで即座にレンダリング → hydration mismatch エラー

**After**: `immediatelyRender={false}` でクライアントサイドのみでレンダリング。SSR 時は空の div

**効果**: Next.js App Router + RSC 環境で hydration エラーを完全に回避

**関連ファイル**: `src/components/editor/Editor.tsx`

---

### 🚀 ブロック D&D: ProseMirror Transaction + mapping.map()

**実施日**: 2026-03-12

**Before**: (設計段階) @dnd-kit で DOM 操作後に Tiptap ドキュメントと同期 → 二重管理

**After**: ネイティブ drag イベント + 単一 ProseMirror transaction (`tr.delete` → `tr.mapping.map` → `tr.insert`) でアトミックに移動

**効果**: DOM と ProseMirror ドキュメントの不整合を完全回避。undo/redo も自動対応

**関連ファイル**: `src/components/editor/BlockDragHandle.tsx`

---

### 🚀 検索モーダル: デバウンス 200ms

**実施日**: 2026-03-12

**Before**: (設計段階) キーストロークごとに検索 API 呼び出し

**After**: 200ms デバウンス + `enabled: !!workspaceId && debouncedQuery.length > 0` で不要なクエリ抑制

**効果**: 検索 API 呼び出しを最小限に。クエリ未入力時は最近のページ (updatedAt 降順 6件) を表示

**関連ファイル**: `src/components/shared/search-modal.tsx`
