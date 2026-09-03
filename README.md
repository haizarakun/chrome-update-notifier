# Chrome Update Notifier

Chromeの新バージョンを最小リソースで検知して通知する拡張機能（Manifest V3）。

## 特徴
- **軽量**: バックグラウンド常駐なし。1日1回のアラームで起動し、それ以外はService Workerは休止。バイナリ資産なし（アイコンはインラインdata URI）
- **予測ポーリング**: Chrome stableは**4週(28日)周期・火曜**リリース（v94/2021年以降、月末ではない）。直近リリース日から次回を予測し、**予測日の2日前〜検出まで**だけAPIを叩く。セキュリティ修正の取りこぼし防止に7日に1回だけ軽く確認
- 通信は Google公式 VersionHistory API（数百バイト）のみ、外部サーバー不要
- 新版検出で通知＋バッジ「!」→ クリックで `chrome://settings/help` を開くとChromeが更新DL→「再起動」で適用
- アイコンクリックで手動チェック（次回予測日も表示）

## インストール
1. このリポジトリをダウンロード（Code → Download ZIP）して解凍
2. `chrome://extensions` → 右上「デベロッパーモード」ON
3. 「パッケージ化されていない拡張機能を読み込む」→ 解凍したフォルダを選択

## セキュリティ
- 権限は `alarms` / `notifications` / `storage` と Google公式API 1ホストのみ。`tabs`・`<all_urls>`・content script なし → ページ内容に一切触れない
- 外部データ（バージョン文字列・日時）は正規表現で形式検証してから使用。通知文への文字列注入不可
- fetch は10秒タイムアウト・Cookie送信なし（`credentials: 'omit'`）、失敗時は静かに次回へ
- `eval` / リモートコード / 外部ライブラリ なし（MV3準拠）。`minimum_chrome_version: 116`

## テスト
```
npm test   # Node 22+, 依存ゼロ
```
バージョン比較・通知の重複抑止・予測ゲーティング・不正データ/オフライン耐性を検証。push毎にGitHub Actionsで自動実行。

## 制約
拡張機能APIではChrome本体の更新適用・再起動は実行できないため、通知＋更新ページ表示までです。

## License
MIT
