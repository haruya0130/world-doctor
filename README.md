# world-doctor

世界地図から国を選んで、その国の博士になれる学習サイトです。

## 公開サイト

GitHub Pages: `https://haruya0130.github.io/world-doctor/`

## 構成

- `index.html`：195か国の検索・大陸フィルター・進捗表示
- `data/countries-1.js`〜`countries-4b.js`：195か国の日本語名、英語名、国コード、slug、大陸、公開状態
- `css/`：トップページと国ページの共通スタイル
- `js/`：カード生成、検索、アニメーション、localStorage進捗管理
- `countries/`：195か国それぞれのHTMLページ

サントメ・プリンシペを最初の本格的な博士コースとして実装しています。
