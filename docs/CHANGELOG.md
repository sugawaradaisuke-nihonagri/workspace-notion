# 開発履歴

## [0.1.0] - 2026-03-12 — Phase 0: プロジェクト初期化

### 🏗️ プロジェクトセットアップ
- Next.js 16 プロジェクト作成 (App Router, TypeScript, Tailwind CSS v4)
- pnpm パッケージマネージャ導入
- 30+ パッケージインストール (Drizzle, tRPC, Auth.js, Tiptap, dnd-kit, etc.)
- CLAUDE.md のディレクトリ構成に従った src/ 構造作成

### 🎨 デザインシステム
- DESIGN_SYSTEM.md のカラートークンを CSS 変数として `globals.css` に定義
- ダークテーマ (デフォルト) + ライトテーマ (`[data-theme="light"]`)
- Tailwind v4 `@theme inline` でカラー・Radius・フォントをマッピング

### 🗄️ データベース
- Drizzle ORM スキーマ定義 (12テーブル、5 enum)
- Neon PostgreSQL に `workspace` データベース作成
- `drizzle-kit push` でスキーマ反映
- `drizzle-kit generate` でマイグレーションファイル生成

### 🔐 認証
- Auth.js v5 (next-auth beta.30) セットアップ
- GitHub + Google OAuth プロバイダ
- Drizzle Adapter (accounts, verificationTokens テーブル)
- JWT セッション戦略 (userId をトークンに含める)
- middleware で認証チェック (未ログイン → /login リダイレクト)
- /login ページ (GitHub/Google ボタン)

### 🔌 API
- tRPC v11 セットアップ (fetchRequestHandler + SuperJSON)
- `protectedProcedure`: 認証チェック
- `workspaceProcedure`: 認証 + workspaceId + メンバーシップ検証
- workspace ルーター: create, get, update
- pages ルーター: list, get, create, update, delete, restore, reorder, search
- blocks ルーター: list, create, update, delete, reorder, bulkDelete
- 全エンドポイントに Zod バリデーション

### 🧭 サイドバー
- Sidebar コンポーネント (展開 260px / 折りたたみ 44px)
- Zustand ストアで開閉状態管理
- Framer Motion でアニメーション
- WorkspaceHeader (絵文字 + 名前 + « ボタン)
- SearchBar (⌘K ラベル)
- SectionLabel (セクション見出し)
- PageTree + PageTreeItem (再帰ツリー、depth paddingLeft)
- @dnd-kit でページ D&D 並替
- ホバーで ⋯ (メニュー) + (サブページ作成) ボタン
- CollapsedSidebar (アイコンのみ表示)
- TrashSection (ゴミ箱リンク)

### 🏠 ルーティング
- `/(workspace)/[workspaceId]/layout.tsx` — Server Component でDB検証
- `/(workspace)/[workspaceId]/[pageId]/page.tsx` — ページエディタ (プレースホルダ)
- トップページ: ワークスペース存在時はリダイレクト、なければ作成フォーム
- CreateWorkspaceForm を tRPC に接続

### 🧩 プロバイダー
- SessionProvider + trpc.Provider + QueryClientProvider をラップ
- 型拡張: next-auth.d.ts (Session に userId 追加)
