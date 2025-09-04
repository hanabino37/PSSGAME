P.S.Search ESM Starter
=======================
1) このフォルダを VS Code で開く（[ファイル]→[フォルダーを開く]).
2) `machinelist.csv` をこのフォルダ直下に置く（サンプル同梱）。
3) 右下「Go Live」で起動。 http://127.0.0.1:5500/ で表示されます。

構成:
- index.html … ページ本体（script type='module' で src/main.js を読み込み）
- styles/main.css … 見た目
- src/... … ロジック・UI・CSV 読み込みなど
- assets/fonts … フォントを入れる場所（必要なら）

次のステップ:
- 既存の検索/リザルト/桁開示ロジックを src/logic/game.js と src/ui/ui.js に移植。
- CSV が大きい場合は Web Worker 化へ進める。
