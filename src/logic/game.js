import { States, can } from './stateMachine.js';

function extractYear(str) {
  const t = (str ?? '').normalize('NFKC');
  const m = t.match(/(\d{4})/);
  return m ? m[1] : '';
}

export class Game {
  constructor(state, ui) {
    this.state = state;
    this.ui = ui;
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
  search(keyword, andCond = { field: 'none', value: '' }) {
    if (!can('search', this.state)) return null;
    const s = this.state;

    const norm = (keyword ?? '').normalize('NFKC').toLowerCase();
    s.usedWords.add(keyword);
    s.recentHits = [];

    for (const row of s.csvData) {
       // ① メイン（全列ゆるく検索）※空なら true で素通り
      const fields = Object.values(row);
      const mainHit = norm ? fields.some(f => f?.normalize('NFKC').toLowerCase().includes(norm)) : true;

      // ② AND 条件（none のときは true）
      let andHit = true;
      const f = andCond?.field || 'none';
      const v = (andCond?.value ?? '').normalize('NFKC').toLowerCase();
      if (f === 'name') {
        andHit = (row['機種名'] ?? '').normalize('NFKC').toLowerCase().includes(v);
      } else if (f === 'maker') {
        andHit = (row['メーカー'] ?? '').normalize('NFKC').toLowerCase().includes(v);
      } else if (f === 'year') {
        const y = extractYear(row['導入月']);
        andHit = !!v && y === v;  // v は 4桁年
      }

      const matched = mainHit && andHit;

      if (matched) s.recentHits.push(row['機種名']);
    }
    s.fsm = States.Searching;

    return String(s.recentHits.length).padStart(4, '0').split('');
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
      // 候補年（state.years が空ならCSVから生成）
      const pool = (s.years && s.years.length)
        ? s.years
        : Array.from(new Set(s.csvData.map(r => extractYear(r['導入月'])).filter(y => /^\d{4}$/.test(y))));
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
