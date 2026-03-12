# パフォーマンス最適化記録

## 目標値

| 指標 | 目標 | 現在 |
|------|------|------|
| 初回ロード (LCP) | < 1.5秒 | 未計測 |
| ブロック操作応答 | < 50ms | 未実装 |
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
