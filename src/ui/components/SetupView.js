
import { renderAll } from '../ui.js';
import { updateFilterChips } from './GameView.js';

export function populateYearOptions(ui, years) {
  const html = '<option value="">年を選択</option>' +
    years.map(y => `<option value="${y}">${y}年</option>`).join('');
  if (ui.yearSelect) ui.yearSelect.innerHTML = html;
  if (ui.andYearSelect) ui.andYearSelect.innerHTML = html;
}

export function initSetupView(ui, state, game) {
  /* ------------------ setup UI ------------------ */
  
  // 目的値モード
  const applyTargetModeUI = () => {
    const manual = ui.targetMode.value === 'manual';
    ui.targetValue.classList.toggle('hidden', !manual);
    ui.randomRangeBox.style.display = manual ? 'none' : 'block';
  };
  if (ui.targetMode) {
    ui.targetMode.addEventListener('change', applyTargetModeUI);
    // Initial call checks value
    applyTargetModeUI();
  }

  // AND UI 切替
  function applyAndUI() {
    const f = ui.andField?.value || 'none';
    if (!ui.andBox) return;
    const isYearAnd = f === 'year';
    ui.setHidden(ui.andYearSelect, !isYearAnd);
    ui.setHidden(ui.andValue, isYearAnd || f === 'none');
    if (f === 'name' && ui.andValue) ui.andValue.placeholder = '機種名を入力';
    if (f === 'maker' && ui.andValue) ui.andValue.placeholder = 'メーカー名を入力';
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

    /* ------------------ game flow start ------------------ */
  // ゲーム開始
  ui.startBtn?.addEventListener('click', () => {
    game.start({
      players: parseInt(ui.playerCount.value, 10),
      mode: ui.targetMode.value,
      manualValue: ui.targetValue.value,
      randomMin: ui.randomMin.value,
      randomMax: ui.randomMax.value,
      restrict: ui.restrictMode?.value ?? 'none',
      exLockEnabled: ui.exLockMode?.value === 'on',
    });

    // 画面初期化
    if(ui.keywordInput) {
        ui.keywordInput.disabled = false;
        ui.keywordInput.value = '';
    }
    if(ui.usedWords) ui.usedWords.innerHTML = '';
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
}
