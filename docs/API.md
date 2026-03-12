# API 仕様書

## 概要

- **プロトコル**: tRPC v11 (型安全 RPC over HTTP)
- **エンドポイント**: `/api/trpc/[procedure]`
- **シリアライゼーション**: SuperJSON
- **認証**: Auth.js JWT セッション (Cookie)
- **WebSocket**: `ws://localhost:4444` (Yjs リアルタイム同期)

## 認証レベル

| レベル | 説明 |
|--------|------|
| `publicProcedure` | 認証不要 |
| `protectedProcedure` | ログイン必須 |
| `workspaceProcedure` | ログイン + workspaceId 必須 + メンバーシップ検証 |

## 認可 (ロールベースアクセス制御)

全ルーターで `verify-access.ts` の共有ヘルパーを使用:

| ヘルパー | 用途 |
|---------|------|
| `requirePageRole(db, pageId, userId, minRole)` | ページ操作の最小ロール検証 |
| `requireDatabaseRole(db, databaseId, userId, minRole)` | DB操作の最小ロール + type=database 検証 |

**ロール階層**: owner(5) > admin(4) > editor(3) > commenter(2) > viewer(1)

---

## healthCheck

```
publicProcedure.query
```

**レスポンス**: `{ status: "ok" }`

---

## workspace ルーター

### workspace.create

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| name | string (1-100) | ✅ | ワークスペース名 |
| icon | string | - | 絵文字アイコン (デフォルト: 📦) |

**処理**: ワークスペース作成 + 作成者を owner として追加

### workspace.get

```
protectedProcedure.query
```

**入力**: `{ workspaceId: uuid }`
**認可**: メンバーシップ検証
**レスポンス**: workspace + `role` フィールド

### workspace.update

```
protectedProcedure.mutation
```

**入力**: `{ workspaceId: uuid, name?: string, icon?: string }`
**認可**: owner または admin のみ

---

## pages ルーター

### pages.list

```
workspaceProcedure.query
```

**入力**: `{ workspaceId: uuid }`
**レスポンス**: `Page[]` — フラットリスト (position 順)

### pages.get

```
protectedProcedure.query
```

**入力**: `{ pageId: uuid }`
**認可**: `requirePageRole(viewer)`
**レスポンス**: `Page & { blocks: Block[] }`

### pages.create

```
workspaceProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| workspaceId | uuid | ✅ | |
| parentId | uuid \| null | - | 親ページ |
| title | string (max 500) | - | デフォルト: "Untitled" |
| icon | string | - | デフォルト: "📄" |
| type | "page" \| "database" \| "database_row" | - | デフォルト: "page" |

### pages.update

```
protectedProcedure.mutation
```

**入力**: `{ pageId, title?, icon?, coverUrl?, parentId?, position? }`
**認可**: `requirePageRole(editor)`

### pages.delete / pages.restore

```
protectedProcedure.mutation
```

**入力**: `{ pageId: uuid }`
**認可**: `requirePageRole(editor)`
**処理**: Soft delete (`isDeleted = true/false`)

### pages.reorder

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 説明 |
|-----------|-----|------|
| pageId | uuid | 移動するページ |
| afterPageId | uuid \| null | この後に配置 (null = 先頭) |
| parentId | uuid \| null | 新しい親 |

**認可**: `requirePageRole(editor)`

### pages.search

```
workspaceProcedure.query
```

**入力**: `{ workspaceId: uuid, query: string (1-200) }`
**レスポンス**: ILIKE 部分一致、最大20件

---

## blocks ルーター

### blocks.list

```
protectedProcedure.query — 入力: { pageId: uuid }
```
**認可**: `requirePageRole(viewer)`

### blocks.create

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| pageId | uuid | ✅ | |
| type | BlockType (23種) | - | デフォルト: "paragraph" |
| content | Record<string, unknown> | - | Tiptap JSONContent |
| props | Record<string, unknown> | - | ブロック固有プロパティ |
| parentId | uuid \| null | - | ネストブロック用 |
| afterBlockId | uuid \| null | - | この後に挿入 (null = 末尾) |

**認可**: `requirePageRole(editor)`

### blocks.update

```
protectedProcedure.mutation — 入力: { blockId, content?, props?, type? }
```
**認可**: `requirePageRole(editor)`

### blocks.delete

```
protectedProcedure.mutation — 入力: { blockId: uuid }
```
**認可**: `requirePageRole(editor)`

### blocks.reorder

```
protectedProcedure.mutation — 入力: { blockId, afterBlockId: uuid | null }
```
**認可**: `requirePageRole(editor)`

### blocks.bulkDelete

```
protectedProcedure.mutation — 入力: { blockIds: uuid[] } (1〜100件)
```
**認可**: `requirePageRole(editor)`

---

## comments ルーター

### comments.list

```
protectedProcedure.query — 入力: { pageId: uuid }
```

**認可**: `requirePageRole(viewer)`
**レスポンス**: `CommentThread[]` — トップレベルコメント + ネスト返信 (author 情報付き)

### comments.create

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| pageId | uuid | ✅ | |
| content | string (1-10000) | ✅ | コメント本文 |
| parentId | uuid \| null | - | 返信先 (null = トップレベル) |
| inlineRef | { blockId?, text?, from?, to? } \| null | - | インライン参照 |

**認可**: `requirePageRole(commenter)`

### comments.update

```
protectedProcedure.mutation — 入力: { commentId, content }
```

**認可**: 著者本人のみ

### comments.resolve

```
protectedProcedure.mutation — 入力: { commentId, isResolved: boolean }
```

**認可**: `requirePageRole(commenter)`

### comments.delete

```
protectedProcedure.mutation — 入力: { commentId: uuid }
```

**認可**: 著者本人のみ (返信もカスケード削除)

---

## dbProperties ルーター

### dbProperties.list

```
protectedProcedure.query — 入力: { databaseId: uuid }
```

**認可**: `requireDatabaseRole(viewer)` (type=database 検証含む)

### dbProperties.create

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| databaseId | uuid | ✅ | |
| name | string (1-200) | ✅ | プロパティ名 |
| type | PropertyType (22種) | ✅ | title/text/number/select/... |
| config | Record<string, unknown> | - | タイプ固有設定 (options等) |

**認可**: `requireDatabaseRole(editor)`

### dbProperties.update

```
protectedProcedure.mutation
```

**入力**: `{ propertyId, name?, config?, width? (50-800), isVisible? }`
**認可**: `requireDatabaseRole(editor)`

### dbProperties.delete

```
protectedProcedure.mutation — 入力: { propertyId: uuid }
```

**認可**: `requireDatabaseRole(editor)`
**制約**: title プロパティは削除不可 (BAD_REQUEST)

### dbProperties.reorder

```
protectedProcedure.mutation — 入力: { propertyId, afterPropertyId: uuid | null }
```
**認可**: `requireDatabaseRole(editor)`

---

## dbRows ルーター

### dbRows.list

```
protectedProcedure.query — 入力: { databaseId: uuid }
```

**認可**: `requireDatabaseRole(viewer)`
**レスポンス**: `{ rows: Page[], cells: CellValue[], properties: Property[] }`

### dbRows.create

```
protectedProcedure.mutation — 入力: { databaseId: uuid }
```
**認可**: `requireDatabaseRole(editor)`

### dbRows.updateCell

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| pageId | uuid | ✅ | 行ページID |
| propertyId | uuid | ✅ | プロパティID |
| value | unknown | ✅ | JSONB 値 |

**認可**: `requirePageRole(editor)`
**処理**: Upsert (既存セルがあれば update、なければ insert)

### dbRows.delete

```
protectedProcedure.mutation — 入力: { pageId: uuid }
```
**認可**: `requirePageRole(editor)`
**処理**: Soft delete

---

## dbViews ルーター

### dbViews.list

```
protectedProcedure.query — 入力: { databaseId: uuid }
```
**認可**: `requireDatabaseRole(viewer)`

### dbViews.create

```
protectedProcedure.mutation
```

**入力**:
| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| databaseId | uuid | ✅ | |
| name | string (1-200) | ✅ | ビュー名 |
| layout | ViewLayout | - | table/board/calendar/gallery/list/timeline/chart (デフォルト: table) |

**認可**: `requireDatabaseRole(editor)`

### dbViews.update

```
protectedProcedure.mutation
```

**入力**: `{ viewId, name?, layout?, filter?, sort?, groupBy?, visibleProperties?, isLocked? }`
**認可**: `requireDatabaseRole(editor)`

### dbViews.delete

```
protectedProcedure.mutation — 入力: { viewId: uuid }
```
**認可**: `requireDatabaseRole(editor)`
**制約**: 最後のビューは削除不可 (BAD_REQUEST)

---

## WebSocket API (y-websocket)

### 接続

```
ws://localhost:4444/{roomName}
```

- **roomName**: pageId (UUID) をルーム識別子として使用
- **プロトコル**: y-websocket v3 (y-protocols sync + awareness)

### ハンドシェイク

1. クライアント接続 → サーバーが sync step 1 + sync step 2 を送信
2. クライアントが sync step 1 で応答 → サーバーが差分 (sync step 2) を返送
3. 同期完了後、awareness 情報 (カーソル位置、ユーザー名、色) を交換

### 永続化

- Y.Doc 更新 → 2秒デバウンス → `yjs_documents` テーブルに bytea として保存
- サーバー再起動時 → DB から Y.Doc 状態を復元

---

## プロパティタイプ一覧 (22種)

```
title, text, number, select, multi_select, status,
date, person, files, checkbox, url, email, phone,
relation, rollup, formula,
created_time, created_by, last_edited_time, last_edited_by,
unique_id, button
```

## エラーレスポンス

| コード | 意味 |
|--------|------|
| UNAUTHORIZED | 未ログイン |
| FORBIDDEN | ワークスペース非メンバー / 権限不足 / Requires {role} role or higher |
| NOT_FOUND | リソースが存在しない |
| BAD_REQUEST | 入力バリデーションエラー / title 削除不可 / 最後のビュー削除不可 / Page is not a database |

## ブロックタイプ一覧 (23種)

```
paragraph, heading1, heading2, heading3,
todo, bullet, numbered, toggle,
quote, callout, divider, code,
image, video, audio, file, bookmark, embed,
table_simple, synced_block, column_layout,
child_page, child_database
```
