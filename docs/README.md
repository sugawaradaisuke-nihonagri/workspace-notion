# WorkSpace — Notion-inspired Workspace App

## 📋 プロジェクト情報

| 項目 | 値 |
|------|-----|
| 名称 | WorkSpace |
| バージョン | 0.3.0 (Phase 1 完了 + Phase 2 データベース) |
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

1. **ブロックベースエディタ** — Tiptap v2 による 23種類のブロックタイプ、スラッシュコマンド、D&D、コンテキストメニュー
2. **ページツリー** — 無限ネスト、D&D 並替、fractional indexing
3. **データベーステーブルビュー** — 13種プロパティ、インライン編集、フィルタ/ソート/グループ、列リサイズ、集計フッター
4. **ページ装飾** — カバー画像 (5グラデーション+URL)、絵文字ピッカー、パンくずTopbar
5. **検索** — ⌘K グローバル検索、デバウンス、キーボードナビゲーション
6. **リアルタイム同時編集** — Yjs CRDT (Phase 3)

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
- **Phase 1**: ✅ 完了 — Tiptap エディタ、スラッシュコマンド、D&D、SearchModal、PageHeader、Topbar、キーボードショートカット、Optimistic Updates
- **Phase 2**: 🟡 進行中 — データベーステーブルビュー実装済み (ボード/カレンダー/ギャラリーは未着手)
- **Phase 3-5**: 🔲 未着手

### 実装済みコンポーネント

- Auth.js v5 (GitHub + Google OAuth, JWT セッション)
- tRPC v11 (workspace / pages / blocks / dbProperties / dbRows / dbViews ルーター)
- Drizzle ORM スキーマ (12テーブル)
- サイドバー (展開/折りたたみ、ページツリー、D&D)
- ワークスペース作成フロー
- SearchModal (⌘K 検索、デバウンス、キーボードナビゲーション)
- Tiptap ブロックエディタ (14 Extensions、自動保存)
- スラッシュコマンド (16 ブロックタイプ、リアルタイムフィルタ)
- ブロック D&D (ドラッグハンドル、ドロップインジケーター)
- コンテキストメニュー (Turn Into、カラー、複製、移動)
- マルチ選択 (Shift+Click、一括削除)
- PageHeader (カバー画像、絵文字ピッカー、タイトル編集)
- Topbar (パンくずリスト、共有/プレゼンスプレースホルダー)
- キーボードショートカット (⌘D 複製、⌘⇧↑↓ 移動、Tab コードブロック)
- tRPC Optimistic Updates (pages.create/update/reorder)
- データベーステーブルビュー (13セルタイプ、フィルタ/ソート/グループ)
- データベースビュータブ切り替え
- 列ヘッダーメニュー (リネーム/非表示/削除)
- テーブルフッター集計 (count/sum/average/min/max)

## 📄 ライセンス

Private
