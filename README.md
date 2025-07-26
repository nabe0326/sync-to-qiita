# microCMS to Qiita 自動同期システム

microCMSで管理している記事を自動的にQiitaに同期するシステムです。

## 🚀 特徴

- microCMSの記事を自動的にQiitaに同期
- HTML → Markdown 自動変換
- 重複投稿を防ぐ履歴管理
- GitHub Actions による自動実行
- エラー時の自動Issue作成

## 📋 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な値を設定してください：

```bash
cp .env.example .env
```

#### 必要な環境変数

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `MICROCMS_DOMAIN` | microCMSのドメイン | 管理画面のURLから |
| `MICROCMS_API_KEY` | microCMS APIキー | 設定 → APIキー |
| `QIITA_ACCESS_TOKEN` | Qiitaアクセストークン | Qiita設定 → アプリケーション |
| `ORIGINAL_SITE_URL` | 元サイトのURL（任意） | バックリンク用 |

### 3. GitHub Secrets の設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を設定：

- `MICROCMS_DOMAIN`
- `MICROCMS_API_KEY`
- `QIITA_ACCESS_TOKEN`
- `ORIGINAL_SITE_URL` (任意)

## 🔧 使用方法

### ローカルでの実行

```bash
npm run sync
```

### GitHub Actions での自動実行

- 毎日日本時間 9:00 に自動実行
- 手動実行: Actions タブから "Sync microCMS to Qiita" を実行

## 📁 ディレクトリ構成

```
sync-to-qiita/
├── .github/
│   └── workflows/
│       └── sync-to-qiita.yml    # GitHub Actions設定
├── scripts/
│   ├── sync-microcms-to-qiita.js # メイン同期スクリプト
│   └── utils/
│       └── html-to-markdown.js   # HTML→Markdown変換
├── .env.example                  # 環境変数テンプレート
├── .gitignore                    # Git除外設定
├── package.json                  # 依存関係定義
├── README.md                     # このファイル
├── sync-history.json            # 同期履歴（自動生成）
└── docs/
    └── document.md              # 要件定義書
```

## ⚙️ 同期ロジック

1. microCMS API から公開済み記事を取得
2. 同期履歴と比較して新規・更新対象を判定
3. HTML を Markdown に変換
4. Qiita に投稿・更新
5. 同期履歴を更新

## 🏷️ タグとカテゴリの処理

- microCMS の `category` と `tags` を Qiita のタグとして使用
- Qiita の制限（最大5個）に合わせて自動調整
- 重複タグは自動で除去

## 🔄 更新検知

記事の更新は以下の優先順位で判定：
1. `updatedAt`
2. `revisedAt`
3. `publishedAt`

## 📝 制約事項

- Qiita API: 1時間あたり1000リクエスト
- 1回の実行で最大50記事まで処理
- Qiitaのタグ制限: 1記事5個まで
- 公開済み記事のみ同期（下書きは除外）

## 🚨 エラーハンドリング

- 個別記事のエラーは他の記事に影響しない
- エラー時は自動でGitHub Issueを作成
- 詳細なログを出力

## 📄 ライセンス

MIT License
