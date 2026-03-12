# WorkSpace — Notion-inspired Workspace App

## 📋 プロジェクト情報

| 項目 | 値 |
|------|-----|
| 名称 | WorkSpace |
| バージョン | 0.4.0 (Phase 3 完了: リアルタイムコラボレーション) |
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript (strict) |
| データベース | PostgreSQL 17 (Neon Serverless) |
| ORM | Drizzle ORM |
| 認証 | Auth.js v5 (NextAuth beta) |
| API | tRPC v11 |
| リアルタイム | Yjs CRDT + y-websocket |
| スタイリング | Tailwind CSS v4 |

## 🎯 アプリケーション概要

Notionを参考にした汎用ワークスペースアプリ。ブロックベースエディタ + データベース + リアルタイムコラボレーションを中核に、チームが日常的に使えるプロダクトを構築する。

### 主要機能

1. **ブロックベースエディタ** — Tiptap v3 による 23種類のブロックタイプ、スラッシュコマンド、D&D、コンテキストメニュー
2. **ページツリー** — 無限ネスト、D&D 並替、fractional indexing
3. **データベースビュー** — テーブル/ボード/カレンダー/ギャラリーの4ビュー、13種プロパティ、フィルタ/ソート/グループ
4. **リアルタイム同時編集** — Yjs CRDT + y-websocket、リモートカーソル表示、DB永続化
5. **コメントシステム** — スレッド型コメント、返信、解決/未解決管理
6. **5段階ロール権限管理** — owner/admin/editor/commenter/viewer
7. **検索** — ⌘K グローバル検索、デバウンス、キーボードナビゲーション

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

# 開発サーバー起動 (Next.js)
pnpm dev

# WebSocket サーバー起動 (別ターミナル)
pnpm ws:dev

# プロダクションビルド
pnpm build && pnpm start
```

## 🔑 環境変数

`.env.local` に以下を設定:

```
DATABASE_URL=              # Neon PostgreSQL 接続文字列
AUTH_SECRET=               # Auth.js 署名キー (openssl rand -base64 32)
AUTH_GITHUB_ID=            # GitHub OAuth Client ID
AUTH_GITHUB_SECRET=        # GitHub OAuth Client Secret
AUTH_GOOGLE_ID=            # Google OAuth Client ID (任意)
AUTH_GOOGLE_SECRET=        # Google OAuth Client Secret (任意)
NEXT_PUBLIC_WS_URL=        # WebSocket URL (開発: ws://localhost:4444)
```

## 📊 現在の状態

- **Phase 0**: ✅ 完了 — プロジェクト初期化、認証、DB、tRPC、サイドバー
- **Phase 1**: ✅ 完了 — Tiptap エディタ、スラッシュコマンド、D&D、SearchModal、PageHeader、Topbar
- **Phase 2**: ✅ 完了 — テーブル/ボード/カレンダー/ギャラリービュー、フィルタ/ソート/グループ、セルOptimistic Update
- **Phase 3**: ✅ 完了 — Yjs CRDT リアルタイム同時編集、コメントシステム、5段階権限管理
- **Phase 4-5**: 🔲 未着手

### 実装済みコンポーネント

- Auth.js v5 (GitHub + Google OAuth, JWT セッション)
- tRPC v11 (workspace / pages / blocks / dbProperties / dbRows / dbViews / comments ルーター)
- Drizzle ORM スキーマ (13テーブル: yjs_documents 追加)
- サイドバー (展開/折りたたみ、ページツリー、D&D)
- Tiptap ブロックエディタ (14 Extensions + Collaboration + CollaborationCursor)
- スラッシュコマンド (16 ブロックタイプ)
- ブロック D&D + コンテキストメニュー + マルチ選択
- PageHeader (カバー画像、絵文字ピッカー、タイトル編集)
- Topbar (パンくずリスト + コメントボタン + バッジ)
- データベース4ビュー (テーブル/ボード/カレンダー/ギャラリー)
- フィルタ/ソート/グループ + テーブルフッター集計
- Yjs + y-websocket リアルタイム同時編集
- リモートカーソル表示 (CollabPresenceBar)
- Yjs状態 DB永続化 (PostgreSQL bytea)
- コメントサイドバー (スレッド、返信、解決)
- 5段階ロールベース権限管理 (全ルーター適用)

## 📄 ライセンス

Private
