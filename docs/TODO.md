# 今後のロードマップ

## Phase 1: コアエディタ（4週間）

### Week 1: Tiptap セットアップ + 基本ブロック

| タスク | 優先度 | 工数 |
|--------|--------|------|
| Tiptap EditorProvider + JSON 保存 | 🔴 HIGH | 4h |
| Paragraph, Heading (H1-H3) Extension | 🔴 HIGH | 3h |
| BulletList, OrderedList, TaskList | 🔴 HIGH | 3h |
| Blockquote, HorizontalRule | 🟡 MEDIUM | 2h |
| CodeBlock (シンタックスハイライト) | 🟡 MEDIUM | 3h |
| Callout (emoji + content) | 🟡 MEDIUM | 2h |
| Toggle (開閉状態管理) | 🟡 MEDIUM | 3h |
| Autosave (debounce 1秒) | 🔴 HIGH | 2h |

### Week 2: インラインフォーマット + スラッシュコマンド

| タスク | 優先度 | 工数 |
|--------|--------|------|
| Bold, Italic, Underline, Strike | 🔴 HIGH | 2h |
| Inline Code, Highlight, Link | 🔴 HIGH | 3h |
| SlashCommand Extension (Suggestion API) | 🔴 HIGH | 6h |
| SlashMenu UI (DESIGN_SYSTEM 5.3 準拠) | 🔴 HIGH | 4h |
| 日本語フィルタ対応 | 🟡 MEDIUM | 2h |

### Week 3: ブロック操作

| タスク | 優先度 | 工数 |
|--------|--------|------|
| BlockDragHandle (⋮⋮ ハンドル) | 🔴 HIGH | 4h |
| @dnd-kit でブロック並替 | 🔴 HIGH | 4h |
| ドロップインジケーター (青線) | 🟡 MEDIUM | 2h |
| ブロックコンテキストメニュー | 🟡 MEDIUM | 4h |
| Turn into (タイプ変換) | 🟡 MEDIUM | 3h |
| マルチ選択 (Shift+Click) | 🟢 LOW | 4h |

### Week 4: ページ装飾 + 仕上げ

| タスク | 優先度 | 工数 |
|--------|--------|------|
| 絵文字ピッカー (ページアイコン) | 🟡 MEDIUM | 3h |
| カバー画像 | 🟡 MEDIUM | 3h |
| トップバー (パンくず) | 🔴 HIGH | 3h |
| キーボードショートカット全般 | 🟡 MEDIUM | 4h |
| SearchModal (⌘K) | 🔴 HIGH | 4h |
| Optimistic Update | 🔴 HIGH | 3h |

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
