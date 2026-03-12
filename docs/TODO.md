# 今後のロードマップ

## Phase 1: コアエディタ（4週間）✅ 完了

### Week 1-3: エディタ + スラッシュコマンド + D&D ✅ 完了
### Week 4: ページ装飾 + 仕上げ ✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| 絵文字ピッカー (ページアイコン) | 🟡 MEDIUM | ✅ |
| カバー画像 (5グラデーション + URL) | 🟡 MEDIUM | ✅ |
| トップバー (パンくずリスト) | 🔴 HIGH | ✅ |
| キーボードショートカット (⌘D, ⌘⇧↑↓, Tab) | 🟡 MEDIUM | ✅ |
| SearchModal (⌘K) | 🔴 HIGH | ✅ |
| Optimistic Update (pages.create/update/reorder) | 🔴 HIGH | ✅ |
| QueryClient デフォルト設定 | 🟡 MEDIUM | ✅ |

---

## Phase 2: データベース（3週間）🟡 進行中

### テーブルビュー ✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| tRPC ルーター: dbProperties (5 endpoints) | 🔴 HIGH | ✅ |
| tRPC ルーター: dbRows (4 endpoints) | 🔴 HIGH | ✅ |
| tRPC ルーター: dbViews (4 endpoints) | 🔴 HIGH | ✅ |
| プロパティエディタ (13 セルタイプ) | 🔴 HIGH | ✅ |
| テーブルビュー (ヘッダー/セル/フッター) | 🔴 HIGH | ✅ |
| 列リサイズ + Title列 freeze | 🟡 MEDIUM | ✅ |
| フィルタ/ソート/グループ UI | 🔴 HIGH | ✅ |
| テーブルフッター集計 | 🟡 MEDIUM | ✅ |
| ビュータブ切り替え | 🟡 MEDIUM | ✅ |
| 列ヘッダーメニュー (リネーム/非表示/削除) | 🟡 MEDIUM | ✅ |
| page-editor-view.tsx で database ルーティング | 🔴 HIGH | ✅ |
| 共有型定義 (src/types/database.ts) | 🟡 MEDIUM | ✅ |

### 残りのビュー 🔲 未着手

| タスク | 優先度 | 工数 |
|--------|--------|------|
| ボードビュー (カンバン) | 🔴 HIGH | 6h |
| カレンダービュー | 🟡 MEDIUM | 6h |
| ギャラリービュー | 🟢 LOW | 4h |
| Relation / Rollup / Formula | 🟡 MEDIUM | 8h |
| セルの Optimistic Update | 🟡 MEDIUM | 2h |
| SelectCell: プロパティ設定更新で新オプション追加 | 🟡 MEDIUM | 2h |
| FilesCell: S3 アップロード連携 | 🟢 LOW | 4h |
| 行の D&D 並替 | 🟡 MEDIUM | 3h |
| プロパティ列の D&D 並替 | 🟡 MEDIUM | 3h |

---

## Phase 3: リアルタイム + コラボ（3週間）

| タスク | 優先度 | 工数 |
|--------|--------|------|
| Yjs CRDT セットアップ | 🔴 HIGH | 8h |
| y-websocket サーバー | 🔴 HIGH | 4h |
| Tiptap Collaboration Extension | 🔴 HIGH | 6h |
| ユーザーカーソル表示 | 🟡 MEDIUM | 4h |
| コメントシステム | 🟡 MEDIUM | 6h |
| 権限管理 (5段階) | 🔴 HIGH | 8h |

---

## Phase 4-5: 拡張

| Phase | タスク | 優先度 |
|-------|--------|--------|
| 4 | メディアブロック (画像/動画/ファイル) | 🟡 MEDIUM |
| 4 | タイムライン / チャート ビュー | 🟢 LOW |
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
| DB 10,000行 サーバーサイドフィルタ | 🟡 MEDIUM | 大規模データベース対応 |
| Sentry モニタリング | 🟢 LOW | エラー監視 |
| Rate Limiting (Upstash) | 🟡 MEDIUM | API 保護 |
| DOMPurify (XSS 対策) | 🟡 MEDIUM | エディタ入力サニタイズ |

---

## 優先度マトリクス

```
           HIGH Impact
              │
    Phase 1 ✅│  Phase 3
    エディタ  │  リアルタイム
    Phase 2   │
    テーブル  │
              │
LOW Effort ───┼─── HIGH Effort
              │
    技術改善   │  Phase 2 残り
    テスト     │  ボード/カレンダー
              │
           LOW Impact
```
