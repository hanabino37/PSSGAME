import { bindUI, renderAll, setInteractivity } from './ui/ui.js';
import { createInitialState } from './store/state.js';
import { Game } from './logic/game.js';
import { loadCSV } from './data/csv.js';
import { extractYear } from './utils/date.js';

const state = createInitialState();
const ui = bindUI();
const game = new Game(state, ui);

(async function bootstrap() {
  try {
    state.csvData = await loadCSV('./machinelist.csv');

    // ★ 年一覧を生成（ユニーク → 数値降順）
    const years = Array.from(
      new Set(
        state.csvData
          .map(r => extractYear(r['導入月']))
          .filter(y => /^\d{4}$/.test(y))
      )
    ).sort((a, b) => Number(b) - Number(a));

    // ★ UI に年候補を渡す（セレクトを生成）
    if (typeof ui.populateYearOptions === 'function') {
      state.years = years;        // ★ ここを追加
      ui.populateYearOptions(years);
    }

    renderAll(state, ui);
    setInteractivity(ui, state, game);
  } catch (e) {
    console.error(e);
    ui.resultMessage.textContent = 'CSVファイルの読み込みに失敗しました。';
  }
})();
