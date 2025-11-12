import { States } from '../logic/stateMachine.js';

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
    setHidden(el, hidden){ if (!el) return; el.classList.toggle('hidden', !!hidden); },
    setDisabled(el, disabled){ el.disabled = !!disabled; },

      setDigitValue(i, v){
        const box = this.digits[i];

        // ① アニメを無効化した状態で即座にカバーを閉じる
        box.classList.add('no-anim');
        box.classList.add('covered');
        box.classList.remove('opened');   // 未公開状態に戻す

        // ② 値をセット（覆いの下にあるため即時反映でも見えない）
        box.dataset.value = v;
        const span = box.querySelector('.digit-value');
        if (span) span.textContent = v;

        // ③ レイアウト確定後にアニメ有効化。Safari 等でのチラ見え防止
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            box.classList.remove('no-anim');
          });
        });
      },

   getDigits(){
     // 未公開は'?'、公開済みはdata.valueを返す
     return this.digits.map(box => box.classList.contains('opened')
       ? (box.dataset.value || '?')
       : '?'
     );
   },

    showMessage(html){ this.resultMessage.innerHTML = html; },

    // ★ 年セレクトに候補を流し込む
    populateYearOptions(years){
      const html = '<option value="">年を選択</option>' +
        years.map(y => `<option value="${y}">${y}年</option>`).join('');
      if (this.yearSelect) this.yearSelect.innerHTML = html;        // 縛り=導入年 用
      if (this.andYearSelect) this.andYearSelect.innerHTML = html;  // AND=導入年 用
    },
  };
  return ui;
}

export function setInteractivity(ui, state, game) {
  /* ------------------ chips helpers ------------------ */
  function setFilterChips(ui, chips){
    if(!ui.filterChips) return;
    if(!chips || !chips.length){
      ui.filterChips.innerHTML = '';
      ui.filterChips.classList.add('hidden');
      return;
    }
    const html = chips.map(c => `<span class="chip ${c.variant || ''}">${c.text}</span>`).join('');
    ui.filterChips.innerHTML = html;
    ui.filterChips.classList.remove('hidden');
  }
  function updateFilterChips(ui, state, andField='none', andValue=''){
    const chips = [];
    // 縛りチップ（EXロック中は注記）
    if(state.restrict && state.restrict !== 'none'){
      const label = state.restrict === 'year' ? '導入年'
                  : state.restrict === 'maker' ? 'メーカー' : '機種名';
      let val = '';
      if(state.restrict === 'year') val = ui.yearSelect?.value || '';
      else                          val = ui.andValue?.value?.trim() || '';
      const text = `縛り: ${label}${val ? (label==='導入年' ? `=${val}年` : `=${val}`) : ''}${state.exLocked ? '（EXロック）' : ''}`;
      chips.push({ text, variant: 'lock' });
    }
    // ANDチップ（縛りと同項目なら省略）
    if(andField && andField !== 'none' && andField !== state.restrict){
      const label = andField === 'year' ? '導入年'
                  : andField === 'maker' ? 'メーカー' : '機種名';
      const text = `AND: ${label}${andValue ? (label==='導入年' ? `=${andValue}年` : `=${andValue}`) : ''}`;
      chips.push({ text, variant: 'and' });
    }
    setFilterChips(ui, chips);
  }

  /* ------------------ setup UI ------------------ */
  // 目的値モード
  const applyTargetModeUI = () => {
    const manual = ui.targetMode.value === 'manual';
    ui.targetValue.classList.toggle('hidden', !manual);
    ui.randomRangeBox.style.display = manual ? 'none' : 'block';
  };
  ui.targetMode.addEventListener('change', applyTargetModeUI);
  applyTargetModeUI();

  // AND UI 切替
  function applyAndUI() {
    const f = ui.andField?.value || 'none';
    if (!ui.andBox) return;
    const isYearAnd = f === 'year';
    ui.setHidden(ui.andYearSelect, !isYearAnd);
    ui.setHidden(ui.andValue, isYearAnd || f === 'none');
    if (f === 'name') ui.andValue.placeholder = '機種名を入力';
    if (f === 'maker') ui.andValue.placeholder = 'メーカー名を入力';
  }
  ui.andField?.addEventListener('change', applyAndUI);

  // 縛りUI（導入年のときだけ年セレクトを表示）
  const applyRestrictUI = () => {
    const isYear = ui.restrictMode?.value === 'year';
    ui.setHidden(ui.yearBox, !isYear);

    // 入力欄は常に使える。年縛り時はヒントだけ変更
    if (ui.keywordInput) {
      ui.keywordInput.placeholder = isYear
        ? '導入年を選ぶか、4桁の年を入力'
        : '検索ワードを入力';
    }

    // 縛りがある場合、AND フィールドを強制設定・ロック
    const r = ui.restrictMode?.value || 'none';
    if (ui.andField) {
      ui.andField.value = r === 'none' ? 'none' : r;
      ui.andField.disabled = r !== 'none';
    }
    applyAndUI();
  };

  if (ui.restrictMode) {
    ui.restrictMode.addEventListener('change', () => {
      applyRestrictUI();
      // ゲーム中ならチップも即更新
      if (state.scores.length) {
        let andField = ui.andField?.value || 'none';
        if (ui.restrictMode?.value && ui.restrictMode.value !== 'none') {
          andField = ui.restrictMode.value;
        }
        let andValue = '';
        if (andField === 'year') {
          andValue = (ui.restrictMode?.value === 'year')
            ? (ui.yearSelect?.value || '')
            : (ui.andYearSelect?.value || '');
        } else if (andField === 'name' || andField === 'maker') {
          andValue = ui.andValue?.value.trim() || '';
        }
        updateFilterChips(ui, state, andField, andValue);
      }
    });
    applyRestrictUI();
  }
  applyAndUI();

  /* ------------------ game flow ------------------ */
  // ゲーム開始
  ui.startBtn.addEventListener('click', () => {
    game.start({
      players: parseInt(ui.playerCount.value, 10),
      mode: ui.targetMode.value,
      manualValue: ui.targetValue.value,
      randomMin: ui.randomMin.value,
      randomMax: ui.randomMax.value,
      restrict: ui.restrictMode?.value ?? 'none',
      exLockEnabled: ui.exLockMode?.value === 'on',   // ★ EXロック設定
    });

    // 画面初期化
    ui.keywordInput.disabled = false;
    ui.usedWords.innerHTML = '';
    ui.keywordInput.value = '';
    ui.yearSelect?.removeAttribute('disabled');
    ui.digits.forEach(box => {
      box.dataset.value = '';
      box.classList.remove('covered','opened');       // カバーOFF
      const span = box.querySelector('.digit-value');
      if (span) span.textContent = '?';              // ？に戻す
   });
    ui.resultMessage.classList.remove('game-over', 'over-score');
    ui.resultMessage.textContent = '';
    ui.resultList.classList.add('hidden');
    // ラウンド開始なので各ボタンを有効化
    ui.searchButton.disabled = false;
    ui.nextPlayerButton.disabled = false;
    ui.revealButtons.forEach(b => b.disabled = false);

    renderAll(state, ui);

    // 縛りONなら開始直後からチップ表示
    let initAndField = ui.andField?.value || 'none';
    if (ui.restrictMode?.value && ui.restrictMode.value !== 'none') {
      initAndField = ui.restrictMode.value;
    }
    let initAndValue = '';
    if (initAndField === 'year') {
      initAndValue = (ui.restrictMode?.value === 'year')
        ? (ui.yearSelect?.value || '')
        : (ui.andYearSelect?.value || '');
    } else if (initAndField === 'name' || initAndField === 'maker') {
      initAndValue = ui.andValue?.value.trim() || '';
    }
    updateFilterChips(ui, state, initAndField, initAndValue);
  });

  // 検索
  ui.searchButton.addEventListener('click', () => {
    const keyword = ui.keywordInput.value.trim();
    if (!keyword && (ui.restrictMode?.value === 'none')) {
      ui.showMessage('検索ワードを入力してください');
      return;
    }

    // AND 条件（縛りがあればそれを強制）
    let andField = ui.andField?.value || 'none';
    if (ui.restrictMode?.value && ui.restrictMode.value !== 'none') {
      andField = ui.restrictMode.value;
    }
    let andValue = '';
    if (andField === 'year') {
      const y = (ui.restrictMode?.value === 'year')
        ? (ui.yearSelect?.value || '')
        : (ui.andYearSelect?.value || '');
      if (!y) { ui.showMessage('導入年を選択してください'); return; }
      andValue = y;
    } else if (andField === 'name' || andField === 'maker') {
      andValue = ui.andValue?.value.trim() || '';
      if (!andValue) {
        ui.showMessage(andField === 'name' ? '機種名を入力してください' : 'メーカー名を入力してください');
        return;
      }
    }

    const numberOnly = /^[0-9０-９]+$/;
    if (numberOnly.test(keyword) && keyword.length <= 2) {
      ui.showMessage('リトライ！数字のみの場合は3文字以上で');
      ui.keywordInput.value = '';
      return;
    }

    const digits = game.search(keyword, { field: andField, value: andValue });
    if (!digits) return;

    // 履歴（検索成功時のみ追加）
    const li = document.createElement('li');
    const andLabel = andField === 'none' ? '' :
      andField === 'year'  ? ` / AND: ${andValue}年` :
      andField === 'maker' ? ` / AND: メーカー=${andValue}` :
      ` / AND: 機種名=${andValue}`;
    li.textContent = keyword ? `${keyword}${andLabel}` : andLabel.replace(/^ \/\s*/, '');
    ui.usedWords.appendChild(li);

    // UI更新
    updateFilterChips(ui, state, andField, andValue);

    digits.forEach((d, i) => ui.setDigitValue(i, d));
    ui.resultList.classList.add('hidden');
    ui.showMessage('');
  });

  // 桁公開
  ui.revealButtons.forEach(btn => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.digit) - 1;
    const box = ui.digits[i];
     // まだ検索していない（値がない）場合は何もしない
    if (!box.dataset.value) return;
    if (box.classList.contains('opened')) return;
    box.classList.add('opened');        // 黒塗りを下にスライド（CSSがアニメ）

    const res = game.revealIfAllOpened();
    if (!res) return;

    if (res.type === 'perfect') {
      ui.resultMessage.classList.add('game-over');
      ui.showMessage(`完全勝利！P${state.currentPlayer}のスコアは${state.scores[state.currentPlayer-1]}点です！`);
      endRound(ui, state);
    } else if (res.type === 'bust') {
      ui.resultMessage.classList.add('game-over','over-score');
      const { winnerIndex, winnerScore } = findWinner(state);
      ui.showMessage(`パンク！ゲーム終了となりプレイヤー${winnerIndex+1}が${winnerScore}点で勝利！`);
      endRound(ui, state);
    } else if (res.type === 'score') {
      // ★ EXロックが発動したら UI を強制更新
      if (res.exLockYear) {
        ui.restrictMode.value = 'year';
        ui.restrictMode.dispatchEvent(new Event('change')); // 年セレクト表示など反映
        ui.restrictMode.disabled = true; // 以降、縛りは変更不可
        if (ui.yearSelect) {
          ui.yearSelect.value = res.exLockYear;
          ui.yearSelect.disabled = true;
        }
        updateFilterChips(ui, state, 'year', res.exLockYear);
        ui.showMessage(`<strong style="color:#1d4ed8;">EXロック発動！</strong> 導入年=${res.exLockYear}年`);
      } else {
        ui.showMessage(`<strong style="color:red;">${res.gained}点</strong>獲得！（残り${res.remaining}）`);
      }

      if (res.remaining <= 0) {
        state.isGameOver = true;
        const { winnerIndex, winnerScore } = findWinner(state);
        ui.showMessage(`パンク！ゲーム終了となりプレイヤー${winnerIndex+1}が${winnerScore}点で勝利！`);
        endRound(ui, state);
      }
    }
    renderAll(state, ui);
  }));

  ui.nextPlayerButton.addEventListener('click', () => {
    if (state.isGameOver) return;
    game.nextPlayer();
    ui.keywordInput.value = '';
    ui.digits.forEach(box => {
      box.dataset.value = '';
      box.classList.remove('covered','opened');   // カバーOFF
      const span = box.querySelector('.digit-value');
      if (span) span.textContent = '?';           // 表示は「?」に戻す
    });

    ui.resultMessage.classList.remove('game-over','over-score');
    ui.resultMessage.textContent = '';
    ui.resultList.classList.add('hidden');
    // 次手番の操作を有効化
    ui.searchButton.disabled = false;
    ui.revealButtons.forEach(b => b.disabled = false);
    renderAll(state, ui);
  });

  ui.showResultsButton.addEventListener('click', () => showResults(state, ui));
// ★ タイトルへ戻る（完全初期化）
  ui.restartButton.addEventListener('click', () => {
    // 1) state を初期化（CSV/years は保持）
    state.usedWords = new Set();
    state.scores = [];
    state.totalPlayers = 2;
    state.currentPlayer = 1;
    state.initialTarget = 100;
    state.remainingPoints = 100;
    state.isGameOver = false;
    state.recentHits = [];
    state.fsm = States.Idle;
    state.restrict = 'none';
    if ('exLockEnabled' in state) state.exLockEnabled = false;
    if ('exLocked' in state) state.exLocked = false;
    if ('exLockYear' in state) state.exLockYear = '';

    // 2) UI の選択肢・表示を初期化
    if (ui.playerCount) ui.playerCount.value = '2';
    if (ui.targetMode) ui.targetMode.value = 'random';
    if (ui.targetValue) ui.targetValue.value = '100';
    if (ui.randomMin) ui.randomMin.value = '100';
    if (ui.randomMax) ui.randomMax.value = '999';
    applyTargetModeUI();

    if (ui.restrictMode) { ui.restrictMode.value = 'none'; ui.restrictMode.disabled = false; }
    if (ui.yearSelect) { ui.yearSelect.value = ''; ui.yearSelect.disabled = false; }
    if (ui.andField) { ui.andField.disabled = false; ui.andField.value = 'none'; }
    if (ui.andValue) ui.andValue.value = '';
    if (ui.andYearSelect) ui.andYearSelect.value = '';
    if (ui.exLockMode) ui.exLockMode.value = 'off';
    applyRestrictUI();
    applyAndUI();

    if (ui.keywordInput) ui.keywordInput.value = '';
    if (ui.usedWords) ui.usedWords.innerHTML = '';
    ui.digits.forEach(box => {
      box.dataset.value = '';
      box.classList.remove('covered','opened');
      const span = box.querySelector('.digit-value');
      if (span) span.textContent = '?';
    });
    ui.resultMessage.classList.remove('game-over','over-score');
    ui.resultMessage.textContent = '';
    if (ui.resultList) { ui.resultList.classList.add('hidden'); ui.resultList.innerHTML = ''; }
    setFilterChips(ui, []);

    // 3) 画面遷移
    ui.gameSection.classList.add('hidden');
    ui.setupSection.classList.remove('hidden');

    // 4) 最後に render
    renderAll(state, ui);
  });
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
    div.innerHTML = `P${i+1}: <span class="player-score-value">${score}</span>点`;
    ui.playerScores.appendChild(div);
  });
}

function endRound(ui, state) {
  ui.nextPlayerButton.disabled = true;
  ui.searchButton.disabled = true;
  ui.revealButtons.forEach(b => b.disabled = true);
  showResults(state, ui);
}
function findWinner(state) {
  const max = Math.max(...state.scores);
  const idx = state.scores.findIndex(s => s === max);
  return { winnerIndex: idx, winnerScore: max };
}
function showResults(state, ui) {
  const keywordInput = ui.keywordInput.value.trim();
  const norm = keywordInput.normalize('NFKC').toLowerCase();
  const div = ui.resultList;

  if (state.recentHits.length === 0 && keywordInput !== '') {
    div.innerHTML = `<strong>HIT!</strong><ul><li>検索ワード「${keywordInput}」に一致する結果はありませんでした。</li></ul>`;
    div.classList.remove('hidden');
    return;
  }
  if (state.recentHits.length === 0 && keywordInput === '') {
    div.innerHTML = `<strong>HIT!</strong><ul><li>検索ワードを入力して検索してください。</li></ul>`;
    div.classList.remove('hidden');
    return;
  }

  const htmlList = state.recentHits.slice(0, 30).map(name => {
    const row = state.csvData.find(r => r['機種名'] === name);
    const maker = row?.['メーカー'] || '';
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hi = txt => norm ? txt.replace(new RegExp(esc(norm), 'gi'), m => `<span style="color:green;font-weight:bold;">${m}</span>`) : txt;
    return `<li>${hi(name)}, ${hi(maker)}</li>`;
  }).join('');

  div.innerHTML = `<strong>HIT!</strong><ul>${htmlList}</ul>`;
  div.classList.remove('hidden');
}
