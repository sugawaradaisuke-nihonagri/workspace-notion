# WorkSpace — Notion-inspired Workspace App

## 📋 プロジェクト情報

| 項目 | 値 |
|------|-----|
| 名称 | WorkSpace |
| バージョン | 0.1.0 (Phase 0 完了) |
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript (strict) |
| データベース | PostgreSQL 17 (Neon Serverless) |
| ORM | Drizzle ORM |
| 認証 | Auth.js v5 (NextAuth beta) |
| API | tRPC v11 |
| スタイリング | Tailwind CSS v4 |

## 🎯 アプリケーション概要

Notionを参考にした汎用ワークスペースアプリ。ブロックベースエディタ + データベース + リアルタイムコラボレーションを中核に、チームが日常的に使えるプロダクトを構築する。

### 主要機能

1. **ブロックベースエディタ** — Tiptap v2 による 23種類のブロックタイプ
2. **ページツリー** — 無限ネスト、D&D 並替、fractional indexing
3. **データベースビュー** — テーブル / ボード / カレンダー / ギャラリー
4. **リアルタイム同時編集** — Yjs CRDT (Phase 3)
5. **権限管理** — ワークスペース / ページレベルの5段階権限

## 📁 ドキュメント構成

| ファイル | 内容 |
|---------|------|
| `docs/README.md` | プロジェクト概要（このファイル） |
| `docs/ARCHITECTURE.md` | システム設計・ディレクトリ構造 |
| `docs/API.md` | tRPC エンドポイント仕様 |
| `docs/OPTIMIZATION.md` | パフォーマンス最適化記録 |
| `docs/DECISIONS.md` | 技術的意思決定の記録 |
| `docs/CHANGELOG.md` | 開発履歴 |
| `docs/TODO.md` | 今後のロードマップ |

## 🚀 クイックスタート

```bash
# 依存関係インストール
pnpm install

# DB スキーマ反映
pnpm drizzle-kit push

# 開発サーバー起動
pnpm dev

# プロダクションビルド
pnpm build && pnpm start
```

## 🔑 環境変数

`.env.local` に以下を設定:

```
DATABASE_URL=          # Neon PostgreSQL 接続文字列
AUTH_SECRET=           # Auth.js 署名キー (openssl rand -base64 32)
AUTH_GITHUB_ID=        # GitHub OAuth Client ID
AUTH_GITHUB_SECRET=    # GitHub OAuth Client Secret
AUTH_GOOGLE_ID=        # Google OAuth Client ID (任意)
AUTH_GOOGLE_SECRET=    # Google OAuth Client Secret (任意)
```

## 📊 現在の状態

- **Phase 0**: ✅ 完了 — プロジェクト初期化、認証、DB、tRPC、サイドバー
- **Phase 1**: 🔲 未着手 — コアエディタ（Tiptap セットアップ〜ブロック操作）
- **Phase 2-5**: 🔲 未着手

### 実装済みコンポーネント

- Auth.js v5 (GitHub + Google OAuth, JWT セッション)
- tRPC v11 (workspace / pages / blocks ルーター)
- Drizzle ORM スキーマ (12テーブル)
- サイドバー (展開/折りたたみ、ページツリー、D&D)
- ワークスペース作成フロー

## 📄 ライセンス

Private
