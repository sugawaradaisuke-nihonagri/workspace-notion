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
