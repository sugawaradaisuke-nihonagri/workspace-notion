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
│    ┌─────────────────┤                            │
│    │ Yjs Provider    │                            │
│    │ (WebSocket)     │                            │
│    └────────┬────────┘                            │
└─────────────┼────────┼───────────────────────────┘
              │        │ HTTP (fetch)
              │  ┌─────┼────────────────────────────┐
              │  │  Server (Next.js)                 │
              │  │  ┌───────────────────────────────┐│
              │  │  │  tRPC v11 (fetchRequestHandler││
              │  │  │  ├── workspace router          ││
              │  │  │  ├── pages router              ││
              │  │  │  ├── blocks router             ││
              │  │  │  ├── dbProperties router       ││
              │  │  │  ├── dbRows router             ││
              │  │  │  ├── dbViews router            ││
              │  │  │  └── comments router           ││
              │  │  └──────────┬────────────────────┘│
              │  │             │                      │
              │  │  ┌──────────┴────┐  ┌───────────┐ │
              │  │  │ Drizzle ORM   │  │ Auth.js   │ │
              │  │  │ + verify-     │  │ v5 (JWT)  │ │
              │  │  │   access.ts   │  └───────────┘ │
              │  │  └──────────┬────┘                 │
              │  └─────────────┼──────────────────────┘
              │                │
     ┌────────┴────────┐      │
     │  y-websocket     │      │
     │  server (:4444)  │      │
     │  ┌────────────┐  │      │
     │  │ Room-based  │  │      │
     │  │ Y.Doc mgmt  │  │      │
     │  │ + DB persist│  │      │
     │  └──────┬─────┘  │      │
     └─────────┼────────┘      │
               │               │
        ┌──────┴───────────────┴──────┐
        │        Neon PostgreSQL       │
        │  pages, blocks, comments,    │
        │  yjs_documents (bytea), ...  │
        └──────────────────────────────┘
```

## 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 16.1.6 | App Router, RSC |
| React | 19.2.3 | UI |
| TypeScript | 5.x (strict) | 型安全 |
| Tailwind CSS | 4.x | スタイリング (CSS変数ベースのテーマ) |
| Zustand | 5.x | グローバル状態 (サイドバー等) |
| Tiptap | 3.x | ブロックエディタ (ProseMirror) |
| Yjs | 13.6 | CRDT リアルタイム同期 |
| y-websocket | 3.0 | WebSocket プロバイダ |
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

### リアルタイム
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Yjs | 13.6.29 | CRDT エンジン |
| y-websocket | 3.0.0 | WebSocket 同期 |
| y-prosemirror | 1.3.7 | ProseMirror ↔ Yjs ブリッジ |
| y-protocols | 1.0.7 | sync/awareness プロトコル |
| ws | 8.19 | Node.js WebSocket サーバー |

### インフラ
| 技術 | 用途 |
|------|------|
| Neon | Serverless PostgreSQL |
| Vercel | フロントホスティング (予定) |
| Railway/Fly.io | WebSocket サーバーホスティング (予定) |

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
│   │   ├── Editor.tsx            # メイン: EditorProvider + Yjs同期 + 自動保存
│   │   ├── PageHeader.tsx        # カバー画像 + 絵文字 + タイトル
│   │   ├── BlockDragHandle.tsx   # ⋮⋮ ドラッグ + ⊕ + マルチ選択
│   │   ├── CollabPresenceBar.tsx # リモートユーザーカーソル表示
│   │   ├── extensions/           # Tiptap Extensions (14 + 2 Collab)
│   │   │   ├── index.ts          # Extensions バンドル (CollabOptions 対応)
│   │   │   ├── callout-extension.ts
│   │   │   ├── toggle-extension.ts
│   │   │   ├── divider-extension.ts
│   │   │   ├── slash-command.ts
│   │   │   ├── block-color.ts
│   │   │   └── keyboard-shortcuts.ts
│   │   ├── blocks/               # カスタム NodeView
│   │   └── menus/                # メニュー UI
│   ├── database/                 # データベースビュー
│   │   ├── DatabaseView.tsx      # メイン: ビュータブ + コントロール + ビュー
│   │   ├── properties/           # セルエディタ (13タイプ)
│   │   ├── views/                # テーブル/ボード/カレンダー/ギャラリー
│   │   └── controls/             # フィルタ/ソート/グループ
│   ├── comments/                 # コメントシステム
│   │   ├── CommentSidebar.tsx    # 右サイドバー (320px)
│   │   └── CommentThread.tsx     # スレッド + 返信 + 解決
│   ├── shared/                   # 共有コンポーネント
│   │   ├── search-modal.tsx      # ⌘K 検索モーダル
│   │   └── Topbar.tsx            # パンくず + コメントボタン
│   └── ui/                       # 汎用 UI
├── lib/
│   ├── auth/                     # Auth.js 設定 (遅延adapter)
│   ├── db/
│   │   ├── schema.ts            # Drizzle スキーマ (13テーブル)
│   │   └── index.ts             # DB 接続 (遅延初期化)
│   ├── permissions.ts           # 5段階ロール階層 + 権限チェック
│   ├── realtime/                # Yjs リアルタイム
│   │   ├── use-yjs-provider.ts  # React Hook: Y.Doc + WebSocket管理
│   │   ├── cursor-colors.ts     # カーソル色 (8色)
│   │   └── index.ts
│   └── trpc/
│       ├── init.ts              # tRPC context + procedures
│       ├── client.ts            # createTRPCReact
│       ├── verify-access.ts     # 共有アクセス検証 (requirePageRole/requireDatabaseRole)
│       └── routers/
│           ├── index.ts         # appRouter 統合
│           ├── workspace.ts
│           ├── pages.ts
│           ├── blocks.ts
│           ├── comments.ts      # コメント CRUD + スレッド + 解決
│           ├── database-properties.ts
│           ├── database-rows.ts
│           └── database-views.ts
├── stores/                       # Zustand ストア
├── hooks/                        # カスタム Hooks
├── types/                        # 型定義
└── middleware.ts                  # 認証チェック

server/
└── ws.ts                         # y-websocket サーバー (port 4444)
```

## DB 設計

### テーブル一覧 (13テーブル)

| テーブル | 説明 |
|---------|------|
| `workspaces` | ワークスペース |
| `users` | ユーザー (Auth.js 互換) |
| `accounts` | OAuth アカウント (Auth.js) |
| `verification_tokens` | メール検証トークン (Auth.js) |
| `workspace_members` | WS メンバーシップ + 5段階ロール |
| `pages` | ページ (page/database/database_row) |
| `blocks` | ブロック (23タイプ) |
| `database_properties` | DB プロパティ定義 (22タイプ) |
| `database_cell_values` | DB セル値 (JSONB, EAV パターン) |
| `database_views` | DB ビュー設定 (7レイアウト) |
| `comments` | コメント + スレッド + インラインコメント |
| `yjs_documents` | Yjs CRDT バイナリ状態 (bytea) |
| `page_versions` | ページバージョン履歴 |

### ロールEnum (5段階)

```
owner(5) > admin(4) > editor(3) > commenter(2) > viewer(1)
```

| ロール | 権限 |
|--------|------|
| `owner` | 全権限 + ワークスペース削除 + メンバー管理 |
| `admin` | ページ/DB CRUD + メンバー招待/ロール変更 |
| `editor` | ページ/ブロック/DB CRUD + コメント |
| `commenter` | 閲覧 + コメント (編集不可) |
| `viewer` | 閲覧のみ |

### キーパターン

- **Fractional Indexing**: `position` カラム (text) で並び順管理。INSERT 時に他行の更新不要
- **Soft Delete**: pages の `isDeleted` + `deletedAt` でゴミ箱機能
- **Self Reference**: pages.parentId で無限ネスト
- **EAV パターン**: database_properties (列定義) + database_cell_values (セル値) で動的カラム
- **JSONB**: blocks.content (Tiptap JSON), blocks.props, db_properties.config, db_cell_values.value
- **bytea**: yjs_documents.state で Yjs CRDT バイナリ状態を永続化

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
→ requirePageRole (メンバーシップ + ロール検証)
→ Drizzle → Neon PostgreSQL
→ onSettled: invalidate → refetch → UI 同期
```

### リアルタイム同時編集フロー
```
Client A → Tiptap onChange
→ Yjs Y.Doc 更新 (ローカル)
→ y-websocket → WebSocket → server/ws.ts
→ Room 内の全クライアントにブロードキャスト
→ Client B の Y.Doc に自動マージ (CRDT)
→ Tiptap が差分を DOM に反映

永続化:
Y.Doc 更新 → 2秒デバウンス → yjs_documents テーブルに bytea として保存
サーバー再起動時 → yjs_documents から Y.Doc を復元
```

### コメントフロー
```
Client → CommentSidebar → Enter
→ trpc.comments.create (requirePageRole: commenter)
→ comments テーブルに INSERT (parentId でスレッド構造)
→ invalidate → コメント一覧再取得 → スレッド表示更新
```

## セキュリティ

- **認証**: Auth.js v5 JWT セッション
- **認可**: 5段階ロールベースアクセス制御 (verify-access.ts)
  - `requirePageRole`: ページ操作の最小ロール検証
  - `requireDatabaseRole`: データベース操作の最小ロール + type=database 検証
- **入力検証**: Zod で全 tRPC エンドポイントにバリデーション
- **XSS**: Tiptap サニタイズ (DOMPurify 追加予定)
- **CSRF**: Auth.js ビルトイン保護
- **DB 保護**: title プロパティ削除不可、最後のビュー削除不可

## リアルタイムアーキテクチャ

### y-websocket サーバー (server/ws.ts)

- **ポート**: 4444 (NEXT_PUBLIC_WS_URL で設定)
- **ルーム管理**: pageId ベースのルーム分離
- **DB永続化**: Yjs状態を PostgreSQL bytea に保存
  - ルーム作成時: yjs_documents から Y.Doc を復元
  - 更新時: 2秒デバウンスで yjs_documents に保存
- **同期プロトコル**: y-protocols sync step 1 + step 2 ハンドシェイク
- **Awareness**: ユーザー名、カーソル位置、色の共有
- **クリーンアップ**: 空ルームの30秒ごとのチェック + DB フラッシュ
- **Graceful shutdown**: SIGINT/SIGTERM で全ルームの状態をDBに保存してから終了
