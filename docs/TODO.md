# 今後のロードマップ

## Phase 1: コアエディタ（4週間）✅ 完了

## Phase 2: データベース（3週間）✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| テーブルビュー (13セルタイプ、フィルタ/ソート/グループ) | 🔴 HIGH | ✅ |
| ボードビュー (カンバン) | 🔴 HIGH | ✅ |
| カレンダービュー | 🟡 MEDIUM | ✅ |
| ギャラリービュー | 🟢 LOW | ✅ |
| セルの Optimistic Update | 🟡 MEDIUM | ✅ |
| SelectCell: 新オプション追加 | 🟡 MEDIUM | ✅ |
| 行の D&D 並替 | 🟡 MEDIUM | ✅ |
| プロパティ列の D&D 並替 | 🟡 MEDIUM | ✅ |

---

## Phase 3: リアルタイム + コラボ（3週間）✅ 完了

| タスク | 優先度 | 状態 |
|--------|--------|------|
| Yjs CRDT + y-websocket サーバー | 🔴 HIGH | ✅ |
| Tiptap Collaboration Extension | 🔴 HIGH | ✅ |
| ユーザーカーソル表示 | 🟡 MEDIUM | ✅ |
| Yjs 状態の DB 永続化 | 🔴 HIGH | ✅ |
| コメントシステム (スレッド + 解決) | 🟡 MEDIUM | ✅ |
| 5段階ロールベース権限管理 | 🔴 HIGH | ✅ |

---

## Phase 4: メディア + 拡張ビュー 🔲 未着手

| タスク | 優先度 | 工数 | 説明 |
|--------|--------|------|------|
| 画像ブロック (アップロード + URL) | 🔴 HIGH | 6h | S3/R2 連携、ドラッグ&ドロップ、リサイズ |
| ファイルブロック (アップロード + ダウンロード) | 🟡 MEDIUM | 4h | S3/R2 連携、プレビュー |
| 動画/音声ブロック | 🟢 LOW | 4h | embed + ネイティブプレイヤー |
| ブックマークブロック (OGP プレビュー) | 🟡 MEDIUM | 3h | URL メタデータ取得 |
| Embed ブロック (iframe) | 🟢 LOW | 2h | YouTube, Figma, etc. |
| FilesCell: S3 アップロード連携 | 🟡 MEDIUM | 4h | データベースのファイルカラム |
| タイムラインビュー | 🟢 LOW | 8h | date プロパティのガントチャート |
| チャートビュー | 🟢 LOW | 6h | 集計データの可視化 |
| Relation / Rollup / Formula | 🟡 MEDIUM | 8h | DB 間のリレーション |
| ページ共有設定 (個別権限) | 🟡 MEDIUM | 6h | ページ単位のアクセス制御 |
| @メンション (ユーザー/ページリンク) | 🟡 MEDIUM | 4h | Suggestion API で実装 |
| インラインコメント (テキスト選択 → コメント) | 🟡 MEDIUM | 4h | ProseMirror Decoration |

---

## Phase 5: 公開 + 高度な機能

| タスク | 優先度 | 工数 | 説明 |
|--------|--------|------|------|
| REST API 公開 | 🟡 MEDIUM | 8h | 外部連携用 API |
| Webhook | 🟢 LOW | 4h | ページ更新時の通知 |
| オフラインモード | 🟢 LOW | 8h | Service Worker + IndexedDB |
| テンプレート機能 | 🟡 MEDIUM | 4h | ページテンプレート |
| エクスポート (Markdown / PDF) | 🟡 MEDIUM | 4h | ページ単位のエクスポート |
| インポート (Markdown / Notion) | 🟢 LOW | 6h | 他ツールからの移行 |
| DB オートメーション | 🟢 LOW | 8h | 条件トリガー + アクション |

---

## 技術的改善 (Phase 問わず)

| タスク | 優先度 | 説明 |
|--------|--------|------|
| Vitest セットアップ | 🔴 HIGH | ユニットテスト基盤 |
| Playwright E2E | 🟡 MEDIUM | 主要フローの E2E テスト |
| ブロック仮想スクロール | 🟡 MEDIUM | 1000+ ブロックのパフォーマンス |
| DB 10,000行 サーバーサイドフィルタ | 🟡 MEDIUM | 大規模データベース対応 |
| Sentry モニタリング | 🟢 LOW | エラー監視 |
| Rate Limiting (Upstash) | 🟡 MEDIUM | API 保護 |
| DOMPurify (XSS 対策) | 🟡 MEDIUM | エディタ入力サニタイズ |
| Next.js 16 proxy 移行 | 🟡 MEDIUM | middleware deprecated 警告への対応 |
| y-websocket 本番ホスティング | 🔴 HIGH | Railway/Fly.io デプロイ |
| Yjs ガベージコレクション | 🟢 LOW | 大きな Y.Doc の mergeUpdates |

---

## 優先度マトリクス

```
           HIGH Impact
              │
    Phase 1 ✅│  Phase 4
    エディタ  │  メディア + 拡張
    Phase 2 ✅│
    テーブル  │
    Phase 3 ✅│
    コラボ    │
              │
LOW Effort ───┼─── HIGH Effort
              │
    技術改善   │  Phase 5
    テスト     │  公開 + 高度機能
              │
           LOW Impact
```
