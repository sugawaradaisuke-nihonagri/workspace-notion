# 開発履歴

## [0.5.0] - 2026-03-13 — Phase 4: メディア + 拡張機能 (進行中)

### 💬 インラインコメント (未コミット)
- `InlineCommentExtension`: ProseMirror Plugin + Decoration でテキスト範囲ハイライト
- `InlineCommentPopover.tsx`: テキスト選択時のフローティング「コメント追加」ボタン
- `InlineCommentBridge.tsx`: EditorProvider 内ブリッジ — `useCurrentEditor()` でエディタインスタンスに接続
- `use-inline-comments.ts` hook: サーバーのコメントデータを ProseMirror Decoration に変換
- `CommentThread.tsx`: インライン参照テキストバッジ (`InlineRefBadge`) 追加
- `.inline-comment-highlight` CSS: 黄色半透明ハイライト + 下線

### @ メンション (`7e58982`)
- `@tiptap/extension-mention` 導入: `@` トリガーで Suggestion ドロップダウン表示
- `MentionExtension` + `createMentionExtension()` ファクトリ: ワークスペース固有データ注入
- `MentionMenu.tsx`: ユーザー (アバター表示) + ページ (アイコン表示) の2カテゴリドロップダウン
- `workspace.members` tRPC クエリ追加: ワークスペースメンバー一覧取得 (users JOIN)
- `use-mention-items.ts` hook: メンバー + ページを MentionItem[] に変換、クエリフィルタリング
- `Editor.tsx`: `workspaceId` prop 追加、`getMentionItems` を Extensions に注入
- `.mention` CSS チップスタイル: 青色半透明背景 + インライン表示
- スラッシュコマンドに `/メンション` エントリ追加

### 🖼️ メディアブロック (`9730977`)
- **ファイルストレージ抽象化** (`src/lib/storage.ts`):
  - `uploadFile()`: MIME タイプ検証 (18種) + 10MB 上限
  - 開発: `public/uploads/` にローカル保存
  - 本番: `STORAGE_BACKEND=s3` で S3/R2 に保存 (動的インポート)
- **Upload API** (`src/app/api/upload/route.ts`): POST, FormData, 認証チェック
- **ImageBlockExtension** (`image-extension.ts`):
  - `atom: true, draggable: true`, 属性: src, alt, caption, width, uploading
  - `ImageView.tsx`: D&D アップロード、URL 入力、右端リサイズハンドル (100-860px)、キャプション編集
- **MediaBlockExtension** (`media-block-extension.ts`):
  - 5種メディア: video, audio, file, bookmark, embed
  - `MediaBlockView.tsx`: 種類別の空状態 + ロード状態 UI
  - `toEmbedUrl()`: YouTube/Vimeo/Figma/CodePen の URL 変換
- スラッシュコマンドに5種メディア追加 (動画/音声/ファイル/ブックマーク/埋め込み)
- `.gitignore`: `/public/uploads` 追加

---

## [0.4.0] - 2026-03-12 — Phase 3: リアルタイムコラボレーション

### 🔐 5段階ロールベース権限管理 (`d40fa57`)
- `permissions.ts`: owner(5) > admin(4) > editor(3) > commenter(2) > viewer(1) の階層
- `verify-access.ts`: 共有の `requirePageRole` / `requireDatabaseRole` ヘルパー
- 全6ルーター (blocks, comments, pages, database-properties, database-rows, database-views) のインラインアクセスチェックを置き換え
- ~260行の重複コード削減
- `roleEnum` を `["owner", "admin", "editor", "commenter", "viewer"]` に更新
- DB マイグレーション: 既存の `member` → `editor`, `guest` → `viewer` に移行

### 💬 コメントシステム (`b86fb1c`)
- `commentsRouter`: list (スレッド構造), create (返信), update (著者のみ), resolve (解決/未解決), delete (カスケード)
- `CommentSidebar.tsx`: 右サイドバー (320px幅), 新規コメント入力, スレッド一覧
- `CommentThread.tsx`: アバター, 著者名, 相対時刻, 返信, 解決トグル, 編集/削除メニュー
- `Topbar.tsx`: コメントボタン + 未解決件数バッジ追加
- `page-editor-view.tsx`: コメントサイドバー統合

### 💾 Yjs 状態の DB 永続化 (`5b6d776`)
- `yjs_documents` テーブル追加 (pageId PK, state bytea, updatedAt)
- `server/ws.ts` を完全書き換え: Room作成時にDBから Y.Doc を復元
- 2秒デバウンスで `encodeStateAsUpdate()` → DB保存
- Graceful shutdown: SIGINT/SIGTERM で全ルームの状態をDBにフラッシュ
- 空ルーム30秒ごとのクリーンアップ

### 🔄 リアルタイム同時編集基盤 (`6bca8a8`)
- **y-websocket サーバー** (`server/ws.ts`): ポート4444, Room-based Y.Doc管理
- **Yjs プロバイダ Hook** (`use-yjs-provider.ts`): Y.Doc + WebSocketProvider ライフサイクル管理
- **カーソル色** (`cursor-colors.ts`): 8色のカラーパレット (ユーザーIDハッシュで割り当て)
- **Tiptap Collaboration拡張**: `getEditorExtensions()` にCollabOptions対応追加
  - コラボモード時: StarterKit History無効化, Collaboration + CollaborationCursor 追加
- **Editor.tsx 大幅書き換え**: デュアルモード (コラボ/フォールバック), Y.Doc コンテンツブリッジ
- **CollabPresenceBar.tsx**: リモートユーザーの色付きドット + 名前表示
- **globals.css**: コラボカーソルのキャレット + ラベルスタイル追加
- 依存関係追加: yjs, y-websocket, y-prosemirror, y-protocols, lib0, ws, @tiptap/extension-collaboration, @tiptap/extension-collaboration-cursor

---

## [0.3.1] - 2026-03-12 — Phase 2 仕上げ + バグ修正

### 🐛 バグ修正 (`3291a5d`)
- **タイトル入力 RTL 問題**: contentEditable div に `dir="ltr"` 追加。Unicode Bidirectional Algorithm の CJK 誤検出を回避
- **+ボタンホバー消失**: `mouseleave` で `e.relatedTarget` をチェックし、ハンドルボタンへの移動時に状態クリアを防止

### 🗄️ Phase 2 残りの機能 (`47d8c2d`)
- セル Optimistic Update
- SelectCell: プロパティ設定更新で新オプション追加
- 行の D&D 並替
- プロパティ列の D&D 並替

### 📊 ビュー追加 (`1d8360e`)
- ボードビュー (カンバン): select/status/person/checkbox でグループ化、カード D&D
- カレンダービュー: date プロパティで月間表示、前月/翌月ナビゲーション
- ギャラリービュー: カード型グリッド表示、カバー画像/アイコン/タイトル/3プロパティ
- ビュー管理: ビュータブ切り替え + 新規ビュー作成

---

## [0.3.0] - 2026-03-12 — Phase 2: データベーステーブルビュー

### 🗄️ tRPC ルーター (3つ追加)
- `dbProperties` ルーター: list, create, update, delete, reorder
  - databaseId がデータベース型ページであることを検証
  - title プロパティは削除不可
  - fractional-indexing で列順序管理
- `dbRows` ルーター: list, create, updateCell, delete
  - list: 全行+全セル+全プロパティを一括返却
  - create: database_row 型ページを作成
  - updateCell: upsert パターン (既存あれば update、なければ insert)
  - delete: soft delete
- `dbViews` ルーター: list, create, update, delete
  - filter/sort/groupBy/visibleProperties を JSONB で保存
  - 最後のビュー削除不可

### 📝 プロパティエディタ (13セルタイプ)
- `PropertyEditor.tsx`: type に応じたセルコンポーネント分岐
- `TitleCell`: ページタイトル編集 (blur で保存)
- `TextCell`: テキスト入力
- `NumberCell`: 数値入力 (右寄せ、スピナー非表示)
- `CheckboxCell`: チェックボックス (accent-blue)
- `SelectCell`: タグ選択 (検索、新規作成、クリア、9色)
- `MultiSelectCell`: 複数タグ選択 (選択/解除、×ボタン)
- `StatusCell`: 3グループ (Not started / In progress / Done) + ドット表示
- `DateCell`: 開始日/終了日/クリア (date input)
- `PersonCell`: ワークスペースメンバー選択
- `URLCell`: URL入力 + 外部リンクアイコン
- `EmailCell`: メール入力 + mailto リンク
- `PhoneCell`: 電話番号入力 + tel リンク
- `FilesCell`: アップロードプレースホルダー (S3 連携予定)

### 📊 テーブルビュー
- `TableView.tsx`: メインテーブルコンポーネント
  - 列ヘッダー: プロパティ名 + ソートアイコン + リサイズハンドル
  - セルのインライン編集 (クリックで PropertyEditor 表示)
  - Title 列の sticky freeze (box-shadow 付き)
  - 列リサイズ (mousedown→mousemove→mouseup + DB 幅保存)
  - 新規行追加ボタン (最下部)
  - 新規列追加ボタン (右端)
  - クライアントサイド フィルタ/ソート (useMemo)
- `ColumnHeaderMenu.tsx`: 列ヘッダーメニュー
  - プロパティタイプ表示、リネーム、非表示、削除
- `TableFooter.tsx`: 集計フッター
  - count, count_values, sum, average, min, max, percent_empty, percent_not_empty
  - プロパティごとに集計タイプ選択ドロップダウン

### 🔍 フィルタ/ソート/グループ
- `FilterBar.tsx`: フィルター条件追加UI
- `SortBar.tsx`: ソート条件追加UI
- `GroupBar.tsx`: グループ化UI

### 🔧 統合
- `DatabaseView.tsx`: ビュータブ + コントロール + ビューコンテンツの統合コンポーネント
- `page-editor-view.tsx`: `page.type === "database"` で Editor → DatabaseView に分岐
- 共有型定義: `src/types/database.ts`
- `globals.css`: テーブル/sticky/date input/select/active state スタイル追加

---

## [0.2.1] - 2026-03-12 — Phase 1 仕上げ

### 📐 ページ装飾
- `PageHeader.tsx`: カバー画像 (5種グラデーション + URL入力)
- 絵文字ピッカー: `@emoji-mart/react` lazy loading
- タイトル編集: contentEditable div + 500ms デバウンス → pages.update
- Enter キーで Tiptap エディタにフォーカス移動

### 🧭 Topbar
- `Topbar.tsx`: パンくずリスト (parentId 走査)
- 右側: ユーザーアイコン、共有ボタン、⋯メニュー

### ⌨️ キーボードショートカット
- ⌘D (Ctrl+D): ブロック複製
- ⌘⇧↑ / ⌘⇧↓: ブロック上下移動
- Tab: コードブロック内で2スペース挿入、リストではネスト

### ⚡ Optimistic Updates
- `pages.update` / `pages.create` / `pages.reorder` に適用
- 全ての optimistic update に onError ロールバック付き
- QueryClient デフォルト: staleTime 30s, mutation retry off

---

## [0.2.0] - 2026-03-12 — Phase 1: コアエディタ (Week 1-3)

### ✏️ Tiptap ブロックエディタ (Week 1)
- EditorProvider パターン
- StarterKit + カスタム Extension (Callout, Toggle, Divider)
- CodeBlockLowlight (40+ 言語)
- 自動保存: onChange → debounce 1000ms → blocks.update

### ⚡ スラッシュコマンド (Week 2)
- SlashCommandExtension (@tiptap/suggestion)
- 16種ブロックタイプ、リアルタイムフィルタ

### 🔀 ブロック D&D + コンテキストメニュー (Week 3)
- BlockDragHandle + ネイティブ drag + ProseMirror Transaction
- BlockContextMenu: Turn Into, カラー, 複製, 移動
- Shift+Click マルチ選択 + 一括削除

### 🔍 SearchModal
- ⌘K グローバル検索、デバウンス 200ms

---

## [0.1.0] - 2026-03-12 — Phase 0: プロジェクト初期化

### 🏗️ プロジェクトセットアップ
- Next.js 16 + TypeScript + Tailwind CSS v4
- Drizzle ORM スキーマ (12テーブル)
- Auth.js v5 (GitHub + Google OAuth)
- tRPC v11 (workspace / pages / blocks ルーター)
- サイドバー (展開/折りたたみ、ページツリー、D&D)
- ルーティング + プロバイダー
