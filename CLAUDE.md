# CLAUDE.md — Notion Clone Project

## プロジェクト概要
Notionを参考にした汎用ワークスペースアプリ「WorkSpace」の開発。
ブロックベースエディタ + データベース + リアルタイムコラボレーションを中核に、
プロジェクト管理チームが日常的に使えるプロダクトを構築する。

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript (strict mode)
- **スタイリング**: Tailwind CSS 3.4+ (カスタムテーマ)
- **状態管理**: Zustand (グローバル) + React Context (ローカル)
- **エディタ**: Tiptap v2 (ProseMirror ベース)
- **D&D**: @dnd-kit/core + @dnd-kit/sortable
- **アニメーション**: Framer Motion
- **アイコン**: Lucide React

### バックエンド
- **ランタイム**: Node.js 20+
- **API**: tRPC v11 (型安全 RPC)
- **DB**: PostgreSQL 16 + Drizzle ORM
- **認証**: Auth.js (NextAuth) v5
- **リアルタイム**: Yjs + y-websocket (CRDT)
- **検索**: PostgreSQL Full-text search (初期) → Meilisearch (将来)
- **ファイルストレージ**: S3 互換 (Cloudflare R2)
- **キャッシュ**: Upstash Redis

### インフラ
- **ホスティング**: Vercel (フロント) + Railway/Fly.io (WebSocket)
- **DB ホスティング**: Neon (Serverless PostgreSQL)
- **CI/CD**: GitHub Actions
- **モニタリング**: Sentry

## コーディング規約

### ファイル構成
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証ページ群
│   ├── (workspace)/       # メインワークスペース
│   │   ├── [workspaceId]/
│   │   │   ├── [pageId]/  # ページエディタ
│   │   │   └── layout.tsx # サイドバー含むレイアウト
│   │   └── layout.tsx
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # 汎用UIコンポーネント (shadcn/ui)
│   ├── editor/            # ブロックエディタ関連
│   │   ├── blocks/        # 各ブロックタイプ
│   │   ├── extensions/    # Tiptap extensions
│   │   ├── menus/         # スラッシュメニュー等
│   │   └── Editor.tsx
│   ├── sidebar/           # サイドバー関連
│   ├── database/          # データベースビュー
│   └── shared/            # 共有コンポーネント
├── lib/
│   ├── db/                # Drizzle スキーマ + クエリ
│   ├── trpc/              # tRPC ルーター定義
│   ├── auth/              # Auth.js 設定
│   ├── realtime/          # Yjs プロバイダ
│   └── utils/             # ユーティリティ
├── stores/                # Zustand ストア
├── hooks/                 # カスタム Hooks
├── types/                 # 型定義
└── styles/                # グローバルスタイル
```

### 命名規則
- **ファイル名**: kebab-case (`page-tree.tsx`)
- **コンポーネント**: PascalCase (`PageTree`)
- **関数/変数**: camelCase (`getPageChildren`)
- **定数**: UPPER_SNAKE_CASE (`MAX_NESTING_DEPTH`)
- **型/Interface**: PascalCase (`BlockType`, `PageNode`)
- **DB テーブル**: snake_case (`workspace_members`)
- **DB カラム**: camelCase (Drizzle ORM 対応)

### TypeScript ルール
- `any` 禁止。`unknown` + 型ガードを使う
- `as` キャスト最小化。ジェネリクスで解決
- すべての関数に戻り値の型アノテーション
- discriminated union で block type を管理

### コンポーネント設計
- Server Components をデフォルトに。`"use client"` は必要時のみ
- Props は interface で定義、export する
- 1ファイル1コンポーネント（小さいヘルパーは例外）
- ロジックは hooks に分離。コンポーネントは描画に集中

### Git コミット
```
feat: ブロックエディタにトグルリスト追加
fix: サイドバーのページツリー展開が保持されない問題
refactor: データベースビューの状態管理をZustandに移行
docs: CLAUDE.md にDB スキーマ設計方針追加
test: ブロック操作の単体テスト追加
```

## データモデル設計方針

### Block 構造
```typescript
interface Block {
  id: string;          // UUID v7 (時系列ソート可能)
  type: BlockType;     // discriminated union
  content: JSONContent; // Tiptap JSON (リッチテキスト)
  props: Record<string, unknown>; // ブロック固有プロパティ
  parentId: string | null;
  pageId: string;
  position: number;    // fractional indexing
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Page = Block の集合
- Page 自体もブロックの一種 (type: "page")
- 無限ネストの親子関係
- ページメタデータ (icon, cover, properties) は別テーブル

### Database = Page の集合
- Database は Page の特殊型
- Properties はスキーマとして定義
- 各 DB ページは properties の値を持つ

## パフォーマンス方針
- 初回ロードは 1.5 秒以内
- ブロック操作の応答は 50ms 以内 (optimistic update)
- 1000ブロックのページでもスムーズにスクロール (仮想化)
- DB 10,000行でもテーブルビューが実用的

## テスト方針
- ユニットテスト: Vitest (ブロック操作、データ変換)
- コンポーネントテスト: Testing Library (主要UI)
- E2E: Playwright (主要フロー)
- カバレッジ目標: 80% (コア機能)

## セキュリティ方針
- XSS: Tiptap のサニタイズに依存 + DOMPurify
- CSRF: Auth.js のビルトイン保護
- Rate Limiting: Upstash Redis
- Row Level Security: Drizzle + middleware
- 入力バリデーション: Zod (全APIエンドポイント)
