# アーキテクチャ

## 全体構成図

```
┌──────────────────────────────────────────────────┐
│  Client (Browser)                                │
│  Next.js App Router + React 19                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Sidebar   │ │ Editor   │ │ Database Views   │  │
│  │ (Zustand) │ │ (Tiptap) │ │ (Table/Board/..) │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│         │            │              │             │
│         └────────────┼──────────────┘             │
│                      │                            │
│              tRPC React Query                     │
│                      │                            │
└──────────────────────┼────────────────────────────┘
                       │ HTTP (fetch)
┌──────────────────────┼────────────────────────────┐
│  Server                                           │
│  ┌───────────────────┼──────────────────────────┐ │
│  │  tRPC v11 (fetchRequestHandler)              │ │
│  │  ├── workspace router                        │ │
│  │  ├── pages router                            │ │
│  │  └── blocks router                           │ │
│  └───────────────────┼──────────────────────────┘ │
│                      │                            │
│  ┌─────────────┐  ┌──┴───────────┐  ┌──────────┐ │
│  │ Auth.js v5  │  │ Drizzle ORM  │  │ Yjs      │ │
│  │ (JWT)       │  │ (neon-http)  │  │ (Future) │ │
│  └─────────────┘  └──────────────┘  └──────────┘ │
└───────────────────────┼───────────────────────────┘
                        │ WebSocket / HTTP
                 ┌──────┴──────┐
                 │ Neon        │
                 │ PostgreSQL  │
                 │ (Serverless)│
                 └─────────────┘
```

## 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.1.6 | App Router, RSC |
| React | 19.2.3 | UI |
| TypeScript | 5.x (strict) | 型安全 |
| Tailwind CSS | 4.2.1 | スタイリング (CSS変数ベースのテーマ) |
| Zustand | 5.x | グローバル状態 (サイドバー等) |
| Tiptap | 3.x | ブロックエディタ (ProseMirror) |
| @dnd-kit | 6.x/10.x | ドラッグ&ドロップ |
| Framer Motion | 12.x | アニメーション |
| Lucide React | 0.577 | アイコン |

### バックエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| tRPC | 11.12 | 型安全 RPC |
| Drizzle ORM | 0.45 | DB アクセス |
| Auth.js | 5.0-beta.30 | 認証 (GitHub/Google OAuth) |
| Zod | 4.3 | バリデーション |
| SuperJSON | 2.2 | シリアライゼーション |

### インフラ
| 技術 | 用途 |
|------|------|
| Neon | Serverless PostgreSQL |
| Vercel | フロントホスティング (予定) |

## ディレクトリ構造

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/login/              # ログインページ
│   ├── (workspace)/[workspaceId]/ # ワークスペースレイアウト
│   │   ├── [pageId]/             # ページエディタ
│   │   ├── layout.tsx            # Server: DB検証 + サイドバーレイアウト
│   │   └── workspace-layout.tsx  # Client: Sidebar + main
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js ルートハンドラ
│   │   └── trpc/[trpc]/          # tRPC fetchRequestHandler
│   ├── layout.tsx                # Root: Providers ラップ
│   └── page.tsx                  # トップ: WS作成 or リダイレクト
├── components/
│   ├── sidebar/                  # サイドバー (8コンポーネント)
│   ├── editor/                   # Tiptap ブロックエディタ
│   │   ├── Editor.tsx            # メイン: EditorProvider + 自動保存
│   │   ├── BlockDragHandle.tsx   # ⋮⋮ ドラッグ + ⊕ + マルチ選択
│   │   ├── extensions/           # Tiptap Extensions (13個)
│   │   │   ├── index.ts          # Extensions バンドル
│   │   │   ├── callout-extension.ts
│   │   │   ├── toggle-extension.ts
│   │   │   ├── divider-extension.ts
│   │   │   ├── slash-command.ts   # Suggestion API
│   │   │   └── block-color.ts    # グローバル blockColor 属性
│   │   ├── blocks/               # カスタム NodeView
│   │   │   ├── callout-view.tsx
│   │   │   └── toggle-view.tsx
│   │   └── menus/                # メニュー UI
│   │       ├── SlashMenu.tsx     # スラッシュコマンド (16種)
│   │       └── BlockContextMenu.tsx # 右クリックメニュー
│   ├── database/                 # DB ビュー (Phase 2)
│   ├── shared/                   # 共有コンポーネント
│   │   └── search-modal.tsx      # ⌘K 検索モーダル
│   └── ui/                       # 汎用 UI
├── lib/
│   ├── auth/                     # Auth.js 設定 (遅延adapter)
│   ├── db/
│   │   ├── schema.ts            # Drizzle スキーマ (12テーブル)
│   │   └── index.ts             # DB 接続 (遅延初期化)
│   └── trpc/
│       ├── init.ts              # tRPC context + procedures
│       ├── client.ts            # createTRPCReact
│       └── routers/             # workspace, pages, blocks
├── stores/                       # Zustand ストア
│   ├── sidebar-store.ts          # サイドバー開閉
│   └── search-store.ts           # 検索モーダル開閉
├── hooks/                        # カスタム Hooks
├── types/                        # 型定義
└── middleware.ts                  # 認証チェック
```

## DB 設計

### テーブル一覧 (12テーブル)

| テーブル | 説明 |
|---------|------|
| `workspaces` | ワークスペース |
| `users` | ユーザー (Auth.js 互換) |
| `accounts` | OAuth アカウント (Auth.js) |
| `verification_tokens` | メール検証トークン (Auth.js) |
| `workspace_members` | WS メンバーシップ + ロール |
| `pages` | ページ (page/database/database_row) |
| `blocks` | ブロック (23タイプ) |
| `database_properties` | DB プロパティ定義 |
| `database_cell_values` | DB セル値 (JSONB) |
| `database_views` | DB ビュー設定 |
| `comments` | コメント + インラインコメント |
| `page_versions` | ページバージョン履歴 |

### キーパターン

- **Fractional Indexing**: `position` カラム (text) で並び順管理。INSERT 時に他行の更新不要
- **Soft Delete**: pages の `isDeleted` + `deletedAt` でゴミ箱機能
- **Self Reference**: pages.parentId で無限ネスト
- **JSONB**: blocks.content (Tiptap JSON), blocks.props, db_properties.config

## データフロー

### 認証フロー
```
Browser → /login → signIn("github") → GitHub OAuth
→ callback → Auth.js → JWT → Cookie → middleware チェック
```

### ページ操作フロー
```
Client → trpc.pages.create.mutate()
→ tRPC server → protectedProcedure (session チェック)
→ workspaceProcedure (メンバーシップチェック)
→ Drizzle → Neon PostgreSQL
→ 結果 → React Query キャッシュ更新 → UI 再描画
```

## セキュリティ

- **認証**: Auth.js v5 JWT セッション
- **認可**: tRPC middleware で workspace メンバーシップ検証
- **入力検証**: Zod で全 tRPC エンドポイントにバリデーション
- **XSS**: Tiptap サニタイズ (Phase 1 で DOMPurify 追加予定)
- **CSRF**: Auth.js ビルトイン保護
