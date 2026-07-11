# サントメ・プリンシペページのデバッグ

対象URLの末尾に `?debug=1` を付けると、画面右下にデバッグパネルが表示されます。

例：

`countries/sao-tome-and-principe.html?debug=1`

確認できる項目：

- ビルド識別子
- DOMContentLoaded到達
- 必須セクションの存在
- ヒーロー領域のopacity・サイズ
- CSS読み込み状態
- ページ全体の高さ
- 共有データ件数
- JavaScriptエラー・未処理Promise
- 読み込まれた関連リソース

直近ログは `sessionStorage.worldDoctorDebugLast` にも保存されます。
Chrome DevToolsのConsoleでは `[WorldDoctor:...]` で絞り込めます。
