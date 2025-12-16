import { bindUI, renderAll, setInteractivity } from './ui/ui.js';
import { createInitialState } from './store/state.js';
import { Game } from './logic/game.js';


// import SearchWorker from './worker/search.worker.js?worker'; // Removed in favor of URL constructor

const state = createInitialState();
const ui = bindUI();
const game = new Game(state, ui);

(async function bootstrap() {
  try {
    // Fix: Use standard Worker constructor with standard URL resolution for relative paths
    const worker = new Worker(new URL('./worker/search.worker.js', import.meta.url), { type: 'module' });
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

    // Fix: Use BASE_URL for correct CSV path in subdirectory deployments
    const csvPath = (import.meta.env.BASE_URL || '/') + 'machinelist.csv';
    // Ensure no double slash if BASE_URL ends with /
    const sanitizedPath = csvPath.replace('//', '/');

    worker.postMessage({ type: 'init', payload: { path: sanitizedPath } });

  } catch (e) {
    console.error(e);
    ui.resultMessage.textContent = '起動エラーが発生しました。';
  }
})();
