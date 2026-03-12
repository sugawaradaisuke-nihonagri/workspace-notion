# API 仕様書

## 概要

- **プロトコル**: tRPC v11 (型安全 RPC over HTTP)
- **エンドポイント**: `/api/trpc/[procedure]`
- **シリアライゼーション**: SuperJSON
- **認証**: Auth.js JWT セッション (Cookie)

## 認証レベル

| レベル | 説明 |
|--------|------|
| `publicProcedure` | 認証不要 |
| `protectedProcedure` | ログイン必須 |
| `workspaceProcedure` | ログイン + workspaceId 必須 + メンバーシップ検証 |

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

**レスポンス**: workspace オブジェクト

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

**レスポンス**: `Page[]` — フラットリスト (position 順)。クライアント側で parentId を使いツリー構築

### pages.get

```
protectedProcedure.query
```

**入力**: `{ pageId: uuid }`

**レスポンス**: `Page & { blocks: Block[] }` — ブロックは position 順

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

**処理**: fractional-indexing で position を自動生成 (同じ親の末尾に追加)

### pages.update

```
protectedProcedure.mutation
```

**入力**: `{ pageId, title?, icon?, coverUrl?, parentId?, position? }`

### pages.delete

```
protectedProcedure.mutation
```

**入力**: `{ pageId: uuid }`

**処理**: Soft delete (`isDeleted = true`, `deletedAt = now()`)

### pages.restore

```
protectedProcedure.mutation
```

**入力**: `{ pageId: uuid }`

**処理**: `isDeleted = false`, `deletedAt = null`

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

**処理**: fractional-indexing で新しい position を計算

### pages.search

```
workspaceProcedure.query
```

**入力**: `{ workspaceId: uuid, query: string (1-200) }`

**レスポンス**: `{ id, title, icon, parentId, type, updatedAt }[]` — ILIKE 部分一致、最大20件

---

## blocks ルーター

### blocks.list

```
protectedProcedure.query
```

**入力**: `{ pageId: uuid }`

**レスポンス**: `Block[]` — position 順

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

### blocks.update

```
protectedProcedure.mutation
```

**入力**: `{ blockId: uuid, content?, props?, type? }`

### blocks.delete

```
protectedProcedure.mutation
```

**入力**: `{ blockId: uuid }`

### blocks.reorder

```
protectedProcedure.mutation
```

**入力**: `{ blockId: uuid, afterBlockId: uuid | null }`

### blocks.bulkDelete

```
protectedProcedure.mutation
```

**入力**: `{ blockIds: uuid[] }` — 1〜100件

---

## エラーレスポンス

| コード | 意味 |
|--------|------|
| UNAUTHORIZED | 未ログイン |
| FORBIDDEN | ワークスペース非メンバー / 権限不足 |
| NOT_FOUND | リソースが存在しない |
| BAD_REQUEST | 入力バリデーションエラー |

## ブロックタイプ一覧

```
paragraph, heading1, heading2, heading3,
todo, bullet, numbered, toggle,
quote, callout, divider, code,
image, video, audio, file, bookmark, embed,
table_simple, synced_block, column_layout,
child_page, child_database
```
