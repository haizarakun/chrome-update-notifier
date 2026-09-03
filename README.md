# Chrome Update Notifier

[![test](https://github.com/haizarakun/chrome-update-notifier/actions/workflows/test.yml/badge.svg)](https://github.com/haizarakun/chrome-update-notifier/actions)

Chromeの新バージョンを最小リソースで検知して通知する拡張機能（Manifest V3）。

## ☕ 支援のお願い

**Chrome ウェブストアへの出店には登録料（$5）が必要です。**
ストア公開を実現するため、開発費・出店代のご支援をいただけると助かります。

👉 **https://buymeacoffee.com/akunJP**

ご支援いただいた分は、ウェブストア登録料と今後の開発に使わせていただきます。よろしくお願いします。

## 特徴
- **軽量**: バックグラウンド常駐なし。1日1回のアラームで起動し、それ以外はService Workerは休止。依存パッケージゼロ、アイコン込みで約20KB
- **予測ポーリング**: Chrome stableは**4週(28日)周期・火曜**リリース（v94/2021年以降、月末ではない）。直近リリース日から次回を予測し、**予測日の2日前〜検出まで**だけAPIを叩く。セキュリティ修正の取りこぼし防止に7日に1回だけ軽く確認
- 通信は Google公式 VersionHistory API と GitHub API（各数百バイト）のみ、外部サーバー不要
- 新版検出で通知＋バッジ「!」→ クリックで `chrome://settings/help` を開くとChromeが更新DL→「再起動」で適用
- アイコンクリックで手動チェック（次回予測日も表示）
- **自己更新通知**: この拡張の新リリースをGitHub Releasesで確認（Chrome版確認と同じタイミングのみ＝追加負荷なし）。通知の「更新」で最新リリースページを開く、「拒否（拡張を削除）」でこの拡張をアンインストール

### 削除が確実に動く三段フォールバック
「拒否（拡張を削除）」を押すと、以下の順で必ずどれかが実行されます。

1. `chrome.management.uninstallSelf({ showConfirmDialog: true })` — 確認ダイアログ付きで削除
2. 失敗した場合 `uninstallSelf({})` — ダイアログなしで削除
3. それも不可なら `chrome://extensions/?id=<この拡張のID>` を自動で開き、手動削除を案内

ユーザーが確認ダイアログで「キャンセル」を選んだ場合は、そこで処理を終了します（勝手に削除しません）。

## インストール
1. [Releases](https://github.com/haizarakun/chrome-update-notifier/releases/latest) から Source code (zip) をダウンロードして解凍
2. `chrome://extensions` → 右上「デベロッパーモード」ON
3. 「パッケージ化されていない拡張機能を読み込む」→ 解凍したフォルダを選択

## セキュリティ
- 権限は `alarms` / `notifications` / `storage` / `management`（自分自身の削除にのみ使用）と Google公式API・GitHub API の2ホストのみ。`tabs`・`<all_urls>`・content script なし → ページ内容に一切触れない
- 外部データ（バージョン文字列・タグ名・日時）は正規表現で形式検証してから使用。通知文への文字列注入不可
- fetch は10秒タイムアウト・Cookie送信なし（`credentials: 'omit'`）、失敗時は静かに次回へ
- `eval` / リモートコード / 外部ライブラリ なし（MV3準拠）。`minimum_chrome_version: 116`

## テスト
```
npm test   # Node 22+, 依存ゼロ
```
バージョン比較・通知の重複抑止・予測ゲーティング・自己更新・削除の三段フォールバック・不正データ/オフライン耐性の7件を検証。push毎にGitHub Actionsで自動実行。

## 制約
- 拡張機能APIではChrome本体の更新適用・再起動は実行できないため、通知＋更新ページ表示までです
- Chrome Web Store外の拡張は自動インストール不可のため、自己更新も通知＋ダウンロードページ表示まで（解凍したフォルダを上書き→ `chrome://extensions` で再読み込み）

## ライセンス

**ソース公開ライセンス（閲覧のみ） / Source-Available License (View Only)**

ソースコードは**閲覧・学習の目的でのみ**公開しています。
複製・改変・再配布・フォークの公開・商用非商用を問わない利用は、著作権者の事前の許諾なしには許可されません。
詳細は [LICENSE](LICENSE) をご覧ください。

© 2026 haizarakun. All rights reserved.
