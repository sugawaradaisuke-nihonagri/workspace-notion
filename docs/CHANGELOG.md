# 開発履歴

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
- `FilesCell`: アップロードプレースホルダー (Phase 3 で S3 連携)

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
  - プロパティ選択 + オペレーター (equals/contains/is_empty/is_not_empty) + 値入力
  - 複数条件対応、条件バッジ表示
- `SortBar.tsx`: ソート条件追加UI
  - プロパティ選択 + 昇順/降順トグル
  - 複数ソートキー対応
- `GroupBar.tsx`: グループ化UI
  - select/multi_select/status/person/checkbox/date のグループ化対応

### 🔧 統合
- `DatabaseView.tsx`: ビュータブ + コントロール + ビューコンテンツの統合コンポーネント
- `page-editor-view.tsx`: `page.type === "database"` で Editor → DatabaseView に分岐
- 共有型定義: `src/types/database.ts` (PropertyType, CellValue, FilterCondition, SortRule 等)
- `globals.css`: テーブル/sticky/date input/select/active state スタイル追加

---

## [0.2.1] - 2026-03-12 — Phase 1 仕上げ

### 📐 ページ装飾
- `PageHeader.tsx`: カバー画像 (5種グラデーション + URL入力)
- 絵文字ピッカー: `@emoji-mart/react` lazy loading
- タイトル編集: contentEditable div + 500ms デバウンス → pages.update
- メタ情報: 最終更新日時表示
- Enter キーで Tiptap エディタにフォーカス移動

### 🧭 Topbar
- `Topbar.tsx`: パンくずリスト (parentId 走査)
- 各パンくず要素はクリックで遷移 (最後のページ以外)
- 右側: ユーザーアイコン (プレゼンスプレースホルダー)、共有ボタン、⋯メニュー

### ⌨️ キーボードショートカット
- `keyboard-shortcuts.ts`: Tiptap Extension
- ⌘D (Ctrl+D): ブロック複製 (getJSON → insertContentAt)
- ⌘⇧↑ / ⌘⇧↓: ブロック上下移動 (ProseMirror transaction)
- Tab: コードブロック内で2スペース挿入、リストではネスト

### ⚡ Optimistic Updates
- `pages.update` (PageHeader): pages.get + pages.list キャッシュを即座更新
- `pages.create` (Sidebar/PageTreeItem): 仮UUID プレースホルダー追加
- `pages.reorder` (PageTree): 配列内要素移動
- 全ての optimistic update に onError ロールバック付き
- QueryClient デフォルト: staleTime 30s, mutation retry off

---

## [0.2.0] - 2026-03-12 — Phase 1: コアエディタ (Week 1-3)

### ✏️ Tiptap ブロックエディタ (Week 1)
- EditorProvider パターンで editor インスタンスを Context 共有
- StarterKit (Paragraph, Heading H1-H3, BulletList, OrderedList, Blockquote)
- カスタム Extension: CalloutExtension (emoji + inline content, ReactNodeView)
- カスタム Extension: ToggleExtension (開閉状態管理, block+ content)
- カスタム Extension: DividerExtension (hr atom ノード)
- CodeBlockLowlight (lowlight + 40+ 言語シンタックスハイライト)
- TaskList + TaskItem (nested チェックボックス)
- Underline, Highlight (multicolor), Link (autolink)
- Placeholder Extension ("「/」でコマンド入力…")
- 自動保存: onChange → debounce 1000ms → blocks.update
- EditorContent: maxWidth 860px, px 52px, DESIGN_SYSTEM タイポグラフィ準拠
- `immediatelyRender={false}` で SSR hydration mismatch 回避
- `@tiptap/core`, `@tiptap/pm`, `lowlight` をパッケージ追加

### ⚡ スラッシュコマンド (Week 2)
- SlashCommandExtension (@tiptap/suggestion, char: "/")
- SlashMenu UI: 300px幅, カテゴリ別グルーピング (基本/メディア/高度)
- 16種ブロックタイプ: テキスト, H1-H3, Todo, 箇条書き, 番号付き, トグル, 引用, 区切り線, コールアウト, コード, 画像, ブックマーク, テーブル, 子ページ
- リアルタイムフィルタ (日本語 label + 英語 alias + description)
- ↑↓ キーでハイライト移動, Enter で選択, ESC で閉じる
- ReactRenderer + document.body.appendChild でポータルマウント

### 🔀 ブロック D&D + コンテキストメニュー (Week 3)
- BlockDragHandle: 各ブロック左に ⋮⋮ ドラッグハンドル + ⊕ 挿入ボタン
- hover 時に opacity 0→0.6 でハンドル表示
- ネイティブ HTML5 drag + ProseMirror Transaction でブロック並替
- ドロップインジケーター (border-top: 2px solid accent-blue)
- ドラッグ中ブロック: opacity 0.3
- BlockContextMenu: ⋮⋮ クリックで表示 (220px, DESIGN_SYSTEM 5.4 準拠)
  - 🗑️ 削除 / 📋 複製 / ↻ Turn Into (10種) / ↑↓ 移動 / 🎨 カラー (10色) / 🔗 リンクコピー
- Turn Into サブメニュー: H1-H3, Text, Todo, Bullet, Numbered, Quote, Callout, Code
- BlockColorExtension: addGlobalAttributes で9ノードタイプに blockColor 追加
- カラーサブメニュー: 10色 + デフォルト (CSS 変数で背景色適用)
- Shift+Click マルチ選択 → ProseMirror TextSelection → Delete/Backspace で一括削除
- 選択ブロック背景ハイライト (accent-blue-bg)

### 🔍 SearchModal (Week 4 一部)
- Zustand search-store (isOpen, open, close, toggle)
- ⌘K / Ctrl+K グローバルショートカット
- オーバーレイ: bg-black/40 + backdrop-filter blur(6px)
- モーダル: 540px幅, top 14vh, rounded-14px, shadow-xl
- 検索入力: デバウンス 200ms → trpc.pages.search
- 最近のページ: updatedAt 降順 6件 (クエリ未入力時)
- キーボードナビゲーション: ↑↓ 選択, Enter 遷移, ESC 閉じる
- サイドバー SearchBar クリック連携

### 🎨 エディタスタイル
- ProseMirror / Tiptap 全ブロックの CSS (globals.css)
- H1: 30px/bold, H2: 23px/semibold, H3: 18px/semibold
- Paragraph: 15px, line-height 1.7
- TaskItem: checkbox + line-through on check
- Blockquote: 3px border-left, italic
- CodeBlock: #1a1a1a bg, lowlight 構文カラー
- ブロックハンドル, ドロップインジケーター, マルチ選択ハイライトの CSS

---

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
