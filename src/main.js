import { bindUI, renderAll, setInteractivity } from './ui/ui.js';
import { createInitialState } from './store/state.js';
import { Game } from './logic/game.js';


import SearchWorker from './worker/search.worker.js?worker';

const state = createInitialState();
const ui = bindUI();
const game = new Game(state, ui);

(async function bootstrap() {
  try {
    const worker = new SearchWorker();
    game.setWorker(worker);

    // Redundant onmessage removed

    // We'll use addEventListener to allow Game class to attach its own listener too without overwriting this one.
    worker.addEventListener('message', (e) => {
      const { type, years, error } = e.data;
      if (type === 'init-complete') {
        state.years = years;
        if (typeof ui.populateYearOptions === 'function') {
          ui.populateYearOptions(years);
        }
        renderAll(state, ui);
        setInteractivity(ui, state, game);
      } else if (type === 'error') {
        ui.resultMessage.textContent = '初期化エラー: ' + error;
      }
    });

    worker.postMessage({ type: 'init', payload: { path: '/machinelist.csv' } });

  } catch (e) {
    console.error(e);
    ui.resultMessage.textContent = '起動エラーが発生しました。';
  }
})();
