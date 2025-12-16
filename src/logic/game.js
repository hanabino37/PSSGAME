import { States, can } from './stateMachine.js';
// import { extractYear } from '../utils/date.js'; // No longer needed directly here for search, but check use in revealIfAllOpened

export class Game {
  constructor(state, ui) {
    this.state = state;
    this.ui = ui;
    this.worker = null;
    this.pendingSearches = new Map();
  }

  setWorker(worker) {
    this.worker = worker;
    this.worker.addEventListener('message', (e) => {
      const { type, digits, recentHits, id, error } = e.data;
      if (type === 'search-result') {
        const resolve = this.pendingSearches.get(id);
        if (resolve) {
          // Update state
          this.state.recentHits = recentHits;
          this.state.fsm = States.Searching;
          // this.state.lastKeyword is set in search()
          if (this.state.lastKeyword) this.state.usedWords.add(this.state.lastKeyword);



          resolve(digits);
          this.pendingSearches.delete(id);
        }
      } else if (type === 'error') {
        console.error('Worker error:', error);
      }
    });
  }

  // ★ restrict を受け取る（デフォルト none）
  start({ players, mode, manualValue, randomMin, randomMax, restrict = 'none', exLockEnabled = false }) {
    if (!can('start', this.state)) return;
    const s = this.state;

    s.totalPlayers = Math.max(1, Math.min(8, Number(players) || 1));  // ★ 1〜8に制限
    s.restrict = restrict;   // ← ここで保存
    s.exLockEnabled = !!exLockEnabled;
    s.exLocked = false;
    s.exLockYear = '';

    if (mode === 'manual') {
      const v = Number(manualValue ?? 100);
      s.initialTarget = Math.max(100, Math.min(8192, v));
    } else {
      let min = Math.max(Number(randomMin ?? 100), 1);
      let max = Math.min(Number(randomMax ?? 1280), 8192);
      if (min > max) [min, max] = [max, min];
      s.initialTarget = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    s.remainingPoints = s.initialTarget;
    s.scores = Array(s.totalPlayers).fill(0);
    s.currentPlayer = 1;
    s.usedWords = new Set();
    s.isGameOver = false;
    s.recentHits = [];
    s.fsm = States.Idle;
  }

  /** 検索→ recentHits を更新（keyword ＋ AND 条件）し、4桁の数字配列を返す */
  async search(keyword, andCond = { field: 'none', value: '' }) {
    if (!can('search', this.state)) return null;

    // Store keyword temporarily to add to usedWords upon worker response (or just add here if we trust it)
    this.state.lastKeyword = keyword;

    return new Promise((resolve) => {
      const id = Math.random().toString(36).substr(2, 9);
      this.pendingSearches.set(id, resolve);
      this.worker.postMessage({
        type: 'search',
        payload: { keyword, andCond },
        id
      });
    });
  }

  /** 桁公開後、全桁開いていれば採点して結果オブジェクトを返す */
  revealIfAllOpened() {
    if (!can('reveal', this.state)) return null;
    const s = this.state;

    const digits = this.ui.getDigits();
    if (digits.some(d => d === '?')) return null;

    const gained = parseInt(digits.join(''), 10);
    const pi = s.currentPlayer - 1;



    if (gained === s.remainingPoints) {
      s.scores[pi] += 8192;
      s.isGameOver = true;
      s.fsm = States.GameOver;
      return { type: 'perfect', gained };
    }
    if (gained > s.remainingPoints) {
      s.scores[pi] = 0;
      s.isGameOver = true;
      s.fsm = States.GameOver;
      return { type: 'bust', gained };
    }

    s.scores[pi] += gained;        // ← 追加
    s.remainingPoints -= gained;
    // ★ EXロック判定：有効・未発動・残り9以下(>0)
    let exYear = null;
    if (s.exLockEnabled && !s.exLocked && s.remainingPoints > 0 && s.remainingPoints <= 9) {
      // 候補年（state.years は main.js で worker から受信済み）
      // Note: CSVData is no longer in state, so we RELY on state.years being populated.
      // If state.years is empty, we cannot engage Ex Lock or must handle it gracefully.
      const pool = s.years || [];

      if (pool.length) {
        exYear = pool[Math.floor(Math.random() * pool.length)];
        s.exLocked = true;
        s.exLockYear = exYear;
        s.restrict = 'year';   // 以降は導入年を強制
      }
    }
    s.fsm = States.Revealing;
    return { type: 'score', gained, remaining: s.remainingPoints, exLockYear: exYear };
  }

  nextPlayer() {
    if (!can('next', this.state)) return;
    const s = this.state;
    s.currentPlayer = (s.currentPlayer % s.totalPlayers) + 1;
    s.fsm = States.Idle;
  }
}
