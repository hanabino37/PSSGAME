import { initSetupView, populateYearOptions } from './components/SetupView.js';
import { initGameView, getDigits, setDigitValue } from './components/GameView.js';
import { initResultView } from './components/ResultView.js';

export function bindUI() {
  const q = sel => document.querySelector(sel);
  const qa = sel => Array.from(document.querySelectorAll(sel));

  const ui = {
    // sections
    setupSection: q('#setupSection'),
    gameSection: q('#gameSection'),

    // setup
    playerCount: q('#playerCount'),
    targetMode: q('#targetMode'),
    targetValue: q('#targetValue'),
    randomMin: q('#randomMin'),
    randomMax: q('#randomMax'),
    startBtn: q('#startBtn'),
    randomRangeBox: q('#randomRangeBox'),
    restrictMode: q('#restrictMode'),
    yearBox: q('#yearBox'),         // （縛り=導入年の年セレクト）
    yearSelect: q('#yearSelect'),
    andBox: q('#andBox'),           // AND 条件 UI
    andField: q('#andField'),
    andValue: q('#andValue'),
    andYearSelect: q('#andYearSelect'),
    exLockMode: q('#exLockMode'),   // ★ EXロック ON/OFF

    // game
    scoreInfo: q('#scoreInfo'),
    playerScores: q('#playerScores'),
    keywordInput: q('#keywordInput'),
    searchButton: q('#searchButton'),
    digits: [q('#digit1'), q('#digit2'), q('#digit3'), q('#digit4')],
    revealButtons: qa('.reveal-btn'),
    resultMessage: q('#resultMessage'),
    nextPlayerButton: q('#nextPlayerButton'),
    showResultsButton: q('#showResultsButton'),
    restartButton: q('#restartButton'),
    resultList: q('#resultList'),
    usedWords: q('#usedWords'),
    filterChips: q('#filterChips'),

    // helpers
    setHidden(el, hidden) { if (!el) return; el.classList.toggle('hidden', !!hidden); },
    setDisabled(el, disabled) { el.disabled = !!disabled; },

    // Delegates to components
    setDigitValue(i, v) { setDigitValue(this, i, v); },
    getDigits() { return getDigits(this); },

    showMessage(html) { this.resultMessage.innerHTML = html; },

    // ★ 年セレクトに候補を流し込む
    populateYearOptions(years) {
      populateYearOptions(this, years);
    },
  };
  return ui;
}

export function setInteractivity(ui, state, game) {
  initSetupView(ui, state, game);
  initGameView(ui, state, game);
  initResultView(ui, state);
}

export function renderAll(state, ui) {
  ui.setHidden(ui.setupSection, false);
  ui.setHidden(ui.gameSection, true);
  if (state.scores.length) {
    ui.setHidden(ui.setupSection, true);
    ui.setHidden(ui.gameSection, false);
  }

  ui.scoreInfo.innerHTML = `残りポイント: <span class="score-value">${state.remainingPoints}</span> / <span class="highlight-target">${state.initialTarget}</span>`;

  ui.playerScores.innerHTML = '';
  state.scores.forEach((score, i) => {
    const div = document.createElement('div');
    if (i + 1 === state.currentPlayer && !state.isGameOver) {
      div.style.fontWeight = 'bold';
      div.style.color = 'blue';
    }
    div.innerHTML = `P${i + 1}: <span class="player-score-value">${score}</span>点`;
    ui.playerScores.appendChild(div);
  });
}
