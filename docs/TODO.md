# 今後のロードマップ

## Phase 1: コアエディタ（4週間）

### Week 1: Tiptap セットアップ + 基本ブロック ✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| Tiptap EditorProvider + JSON 保存 | 🔴 HIGH | ✅ |
| Paragraph, Heading (H1-H3) Extension | 🔴 HIGH | ✅ |
| BulletList, OrderedList, TaskList | 🔴 HIGH | ✅ |
| Blockquote, HorizontalRule | 🟡 MEDIUM | ✅ |
| CodeBlock (シンタックスハイライト) | 🟡 MEDIUM | ✅ |
| Callout (emoji + content) | 🟡 MEDIUM | ✅ |
| Toggle (開閉状態管理) | 🟡 MEDIUM | ✅ |
| Autosave (debounce 1秒) | 🔴 HIGH | ✅ |

### Week 2: インラインフォーマット + スラッシュコマンド ✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| Bold, Italic, Underline, Strike | 🔴 HIGH | ✅ |
| Inline Code, Highlight, Link | 🔴 HIGH | ✅ |
| SlashCommand Extension (Suggestion API) | 🔴 HIGH | ✅ |
| SlashMenu UI (DESIGN_SYSTEM 5.3 準拠) | 🔴 HIGH | ✅ |
| 日本語フィルタ対応 | 🟡 MEDIUM | ✅ |

### Week 3: ブロック操作 ✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| BlockDragHandle (⋮⋮ ハンドル) | 🔴 HIGH | ✅ |
| ブロック D&D (ProseMirror Transaction) | 🔴 HIGH | ✅ |
| ドロップインジケーター (青線) | 🟡 MEDIUM | ✅ |
| ブロックコンテキストメニュー | 🟡 MEDIUM | ✅ |
| Turn into (タイプ変換) | 🟡 MEDIUM | ✅ |
| マルチ選択 (Shift+Click) | 🟢 LOW | ✅ |
| ブロックカラー (10色) | 🟡 MEDIUM | ✅ |

### Week 4: ページ装飾 + 仕上げ 🟡 進行中

| タスク | 優先度 | 状態 |
|--------|--------|------|
| 絵文字ピッカー (ページアイコン) | 🟡 MEDIUM | 🔲 |
| カバー画像 | 🟡 MEDIUM | 🔲 |
| トップバー (パンくず) | 🔴 HIGH | 🔲 |
| キーボードショートカット全般 | 🟡 MEDIUM | 🔲 |
| SearchModal (⌘K) | 🔴 HIGH | ✅ |
| Optimistic Update | 🔴 HIGH | 🔲 |

---

## Phase 2: データベース（3週間）

| タスク | 優先度 | 工数 |
|--------|--------|------|
| プロパティタイプ実装 (13種) | 🔴 HIGH | 8h |
| テーブルビュー | 🔴 HIGH | 8h |
| フィルタ / ソート / グルーピング | 🔴 HIGH | 6h |
| ボードビュー (カンバン) | 🔴 HIGH | 6h |
| カレンダービュー | 🟡 MEDIUM | 6h |
| ギャラリービュー | 🟢 LOW | 4h |
| Relation / Rollup / Formula | 🟡 MEDIUM | 8h |
| ビュー管理 (追加/切替/ロック) | 🟡 MEDIUM | 4h |

---

## Phase 3-5: 後続フェーズ

| Phase | 主要タスク | 優先度 |
|-------|-----------|--------|
| 3 | Yjs リアルタイム同時編集 | 🔴 HIGH |
| 3 | コメントシステム | 🟡 MEDIUM |
| 3 | 権限管理 (5段階) | 🔴 HIGH |
| 4 | メディアブロック (画像/動画/ファイル) | 🟡 MEDIUM |
| 4 | タイムライン / チャート | 🟢 LOW |
| 4 | DB オートメーション | 🟢 LOW |
| 5 | REST API 公開 | 🟡 MEDIUM |
| 5 | オフラインモード | 🟢 LOW |

---

## 技術的改善 (Phase 問わず)

| タスク | 優先度 | 説明 |
|--------|--------|------|
| Next.js 16 proxy 移行 | 🟡 MEDIUM | middleware deprecated 警告への対応 |
| Vitest セットアップ | 🔴 HIGH | ユニットテスト基盤 |
| Playwright E2E | 🟡 MEDIUM | 主要フローの E2E テスト |
| ブロック仮想スクロール | 🟡 MEDIUM | 1000+ ブロックのパフォーマンス |
| Sentry モニタリング | 🟢 LOW | エラー監視 |
| Rate Limiting (Upstash) | 🟡 MEDIUM | API 保護 |

---

## 優先度マトリクス

```
           HIGH Impact
              │
    Phase 1   │  Phase 3
    エディタ   │  リアルタイム
              │
LOW Effort ───┼─── HIGH Effort
              │
    技術改善   │  Phase 2
    テスト     │  データベース
              │
           LOW Impact
```
