# WorkSpace — Notion-inspired Workspace App

## 📋 プロジェクト情報

| 項目 | 値 |
|------|-----|
| 名称 | WorkSpace |
| バージョン | 0.6.0 (Phase 4 完了: メディア + 拡張ビュー + DB リレーション) |
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript (strict) |
| データベース | PostgreSQL 17 (Neon Serverless) |
| テーブル数 | 14 (page_shares 追加) |
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
3. **データベースビュー** — テーブル/ボード/カレンダー/ギャラリー/タイムライン/チャートの6ビュー、16種プロパティ、フィルタ/ソート/グループ
4. **リアルタイム同時編集** — Yjs CRDT + y-websocket、リモートカーソル表示、DB永続化
5. **メディアブロック** — 画像(リサイズ/D&D)/動画/音声/ファイル/ブックマーク/埋め込み(YouTube, Figma等)
6. **@メンション** — ユーザー/ページリンクをインラインで参照、Suggestion API ドロップダウン
7. **インラインコメント** — テキスト選択→コメント追加、ProseMirror Decoration ハイライト
8. **コメントシステム** — スレッド型コメント、返信、解決/未解決管理
9. **5段階ロール権限管理** — owner/admin/editor/commenter/viewer + ページ単位共有
10. **検索** — ⌘K グローバル検索、デバウンス、キーボードナビゲーション
11. **DB リレーション** — Relation/Rollup/Formula セル、DB間リレーション + 集計 + 数式

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
STORAGE_BACKEND=           # "s3" で S3/R2 を使用 (未設定=ローカル)
S3_ENDPOINT=               # S3 互換エンドポイント (Cloudflare R2 等)
S3_BUCKET=                 # バケット名
S3_ACCESS_KEY_ID=          # アクセスキー
S3_SECRET_ACCESS_KEY=      # シークレットキー
S3_REGION=                 # リージョン (デフォルト: auto)
S3_PUBLIC_URL=             # パブリック URL (省略時: https://{bucket}.s3.amazonaws.com)
```

## 📊 現在の状態

- **Phase 0**: ✅ 完了 — プロジェクト初期化、認証、DB、tRPC、サイドバー
- **Phase 1**: ✅ 完了 — Tiptap エディタ、スラッシュコマンド、D&D、SearchModal、PageHeader、Topbar
- **Phase 2**: ✅ 完了 — テーブル/ボード/カレンダー/ギャラリービュー、フィルタ/ソート/グループ、セルOptimistic Update
- **Phase 3**: ✅ 完了 — Yjs CRDT リアルタイム同時編集、コメントシステム、5段階権限管理
- **Phase 4**: ✅ 完了 — メディアブロック、@メンション、インラインコメント、ページ共有、DB リレーション、タイムライン/チャート
- **Phase 5**: 🔲 未着手

### 実装済みコンポーネント

- Auth.js v5 (GitHub + Google OAuth, JWT セッション)
- tRPC v11 (workspace / pages / blocks / dbProperties / dbRows / dbViews / comments / pageShares ルーター)
- Drizzle ORM スキーマ (14テーブル: page_shares 追加)
- サイドバー (展開/折りたたみ、ページツリー、D&D)
- Tiptap ブロックエディタ (18 Extensions + Collaboration + CollaborationCursor)
- スラッシュコマンド (18 ブロックタイプ: メンション含む)
- ブロック D&D + コンテキストメニュー + マルチ選択
- PageHeader (カバー画像、絵文字ピッカー、タイトル編集)
- Topbar (パンくずリスト + コメントボタン + バッジ)
- データベース6ビュー (テーブル/ボード/カレンダー/ギャラリー/タイムライン/チャート)
- フィルタ/ソート/グループ + テーブルフッター集計
- Yjs + y-websocket リアルタイム同時編集
- リモートカーソル表示 (CollabPresenceBar)
- Yjs状態 DB永続化 (PostgreSQL bytea)
- コメントサイドバー (スレッド、返信、解決、インラインコメント)
- 5段階ロールベース権限管理 (全ルーター適用)
- 画像ブロック (アップロード/URL/リサイズ/D&D)
- メディアブロック (動画/音声/ファイル/ブックマーク/埋め込み)
- ファイルストレージ抽象化 (ローカル + S3/R2)
- @メンション (ユーザー/ページリンク)
- インラインコメント (ProseMirror Decoration ハイライト)
- ページ共有設定 (ShareModal + resolveEffectiveRole)
- DB リレーション (Relation/Rollup/Formula セル)
- FilesCell (S3 アップロード + FileItem メタデータ)
- タイムラインビュー (ガントチャート、日/週/月スケール)
- チャートビュー (棒/円/折れ線、ゼロ依存SVG/CSS)

## 📄 ライセンス

Private
