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
│  │  ├── blocks router                           │ │
│  │  ├── dbProperties router                     │ │
│  │  ├── dbRows router                           │ │
│  │  └── dbViews router                          │ │
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
| emoji-mart | 1.x | 絵文字ピッカー (lazy loaded) |

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
│   │   ├── [pageId]/             # ページエディタ / データベースビュー
│   │   │   ├── page.tsx          # Server: params 展開
│   │   │   └── page-editor-view.tsx # Client: Editor or DatabaseView ルーティング
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
│   │   ├── PageHeader.tsx        # カバー画像 + 絵文字 + タイトル
│   │   ├── BlockDragHandle.tsx   # ⋮⋮ ドラッグ + ⊕ + マルチ選択
│   │   ├── extensions/           # Tiptap Extensions (14個)
│   │   │   ├── index.ts          # Extensions バンドル
│   │   │   ├── callout-extension.ts
│   │   │   ├── toggle-extension.ts
│   │   │   ├── divider-extension.ts
│   │   │   ├── slash-command.ts   # Suggestion API
│   │   │   ├── block-color.ts    # グローバル blockColor 属性
│   │   │   └── keyboard-shortcuts.ts # ⌘D, ⌘⇧↑↓, Tab
│   │   ├── blocks/               # カスタム NodeView
│   │   │   ├── callout-view.tsx
│   │   │   └── toggle-view.tsx
│   │   └── menus/                # メニュー UI
│   │       ├── SlashMenu.tsx     # スラッシュコマンド (16種)
│   │       └── BlockContextMenu.tsx # 右クリックメニュー
│   ├── database/                 # データベースビュー
│   │   ├── DatabaseView.tsx      # メイン: ビュータブ + コントロール + ビュー
│   │   ├── properties/           # セルエディタ (13タイプ)
│   │   │   ├── PropertyEditor.tsx # ディスパッチャー
│   │   │   ├── TitleCell.tsx, TextCell.tsx, NumberCell.tsx
│   │   │   ├── CheckboxCell.tsx, SelectCell.tsx, MultiSelectCell.tsx
│   │   │   ├── StatusCell.tsx, DateCell.tsx, PersonCell.tsx
│   │   │   ├── URLCell.tsx, EmailCell.tsx, PhoneCell.tsx
│   │   │   └── FilesCell.tsx
│   │   ├── views/                # ビューコンポーネント
│   │   │   ├── TableView.tsx     # テーブルビュー (メイン)
│   │   │   ├── ColumnHeaderMenu.tsx # 列ヘッダーメニュー
│   │   │   └── TableFooter.tsx   # 集計フッター
│   │   └── controls/             # フィルタ/ソート/グループ
│   │       ├── FilterBar.tsx
│   │       ├── SortBar.tsx
│   │       └── GroupBar.tsx
│   ├── shared/                   # 共有コンポーネント
│   │   ├── search-modal.tsx      # ⌘K 検索モーダル
│   │   └── Topbar.tsx            # パンくず + アクション
│   └── ui/                       # 汎用 UI
├── lib/
│   ├── auth/                     # Auth.js 設定 (遅延adapter)
│   ├── db/
│   │   ├── schema.ts            # Drizzle スキーマ (12テーブル)
│   │   └── index.ts             # DB 接続 (遅延初期化)
│   └── trpc/
│       ├── init.ts              # tRPC context + procedures
│       ├── client.ts            # createTRPCReact
│       └── routers/
│           ├── index.ts         # appRouter 統合
│           ├── workspace.ts
│           ├── pages.ts
│           ├── blocks.ts
│           ├── database-properties.ts  # プロパティ CRUD
│           ├── database-rows.ts        # 行 CRUD + セル upsert
│           └── database-views.ts       # ビュー CRUD
├── stores/                       # Zustand ストア
│   ├── sidebar-store.ts          # サイドバー開閉
│   └── search-store.ts           # 検索モーダル開閉
├── hooks/                        # カスタム Hooks
├── types/
│   ├── database.ts              # DB プロパティ型、セル値型、フィルタ/ソート型
│   ├── index.ts
│   └── next-auth.d.ts
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
| `database_properties` | DB プロパティ定義 (22タイプ) |
| `database_cell_values` | DB セル値 (JSONB, EAV パターン) |
| `database_views` | DB ビュー設定 (7レイアウト) |
| `comments` | コメント + インラインコメント |
| `page_versions` | ページバージョン履歴 |

### キーパターン

- **Fractional Indexing**: `position` カラム (text) で並び順管理。INSERT 時に他行の更新不要
- **Soft Delete**: pages の `isDeleted` + `deletedAt` でゴミ箱機能
- **Self Reference**: pages.parentId で無限ネスト
- **EAV パターン**: database_properties (列定義) + database_cell_values (セル値) で動的カラム
- **JSONB**: blocks.content (Tiptap JSON), blocks.props, db_properties.config, db_cell_values.value

### データベース行モデル

```
pages (type: "database")        ← データベース本体
  └── pages (type: "database_row", databaseId: parent.id)  ← 各行
        └── database_cell_values (pageId: row.id, propertyId: prop.id)  ← セル値
```

## データフロー

### 認証フロー
```
Browser → /login → signIn("github") → GitHub OAuth
→ callback → Auth.js → JWT → Cookie → middleware チェック
```

### ページ操作フロー
```
Client → trpc.pages.create.mutate()
→ onMutate: optimistic update (cache.setData)
→ tRPC server → protectedProcedure (session チェック)
→ workspaceProcedure (メンバーシップチェック)
→ Drizzle → Neon PostgreSQL
→ onSettled: invalidate → refetch → UI 同期
```

### データベースセル更新フロー
```
Client → PropertyEditor onChange
→ trpc.dbRows.updateCell.mutate({ pageId, propertyId, value })
→ Server: upsert (既存なら update、なければ insert)
→ onSettled: invalidate dbRows.list → テーブル再描画
```

## セキュリティ

- **認証**: Auth.js v5 JWT セッション
- **認可**: tRPC middleware で workspace メンバーシップ検証
- **入力検証**: Zod で全 tRPC エンドポイントにバリデーション
- **XSS**: Tiptap サニタイズ (Phase 1 で DOMPurify 追加予定)
- **CSRF**: Auth.js ビルトイン保護
- **DB 保護**: title プロパティ削除不可、最後のビュー削除不可
