
import { States } from '../../logic/stateMachine.js';
import { renderAll } from '../ui.js';
import { endRound, showResults } from './ResultView.js';
import { findWinner } from './ResultView.js';

/* ------------------ chips helpers ------------------ */
function setFilterChips(ui, chips) {
    if (!ui.filterChips) return;
    if (!chips || !chips.length) {
        ui.filterChips.innerHTML = '';
        ui.filterChips.classList.add('hidden');
        return;
    }
    const html = chips.map(c => `<span class="chip ${c.variant || ''}">${c.text}</span>`).join('');
    ui.filterChips.innerHTML = html;
    ui.filterChips.classList.remove('hidden');
}

export function updateFilterChips(ui, state, andField = 'none', andValue = '') {
    const chips = [];
    // 縛りチップ（EXロック中は注記）
    if (state.restrict && state.restrict !== 'none') {
        const label = state.restrict === 'year' ? '導入年'
            : state.restrict === 'maker' ? 'メーカー' : '機種名';
        let val = '';
        if (state.restrict === 'year') val = ui.yearSelect?.value || '';
        else val = ui.andValue?.value?.trim() || '';
        const text = `縛り: ${label}${val ? (label === '導入年' ? `=${val}年` : `=${val}`) : ''}${state.exLocked ? '（EXロック）' : ''}`;
        chips.push({ text, variant: 'lock' });
    }
    // ANDチップ（縛りと同項目なら省略）
    if (andField && andField !== 'none' && andField !== state.restrict) {
        const label = andField === 'year' ? '導入年'
            : andField === 'maker' ? 'メーカー' : '機種名';
        const text = `AND: ${label}${andValue ? (label === '導入年' ? `=${andValue}年` : `=${andValue}`) : ''}`;
        chips.push({ text, variant: 'and' });
    }
    setFilterChips(ui, chips);
}

/* ------------------ digits helpers ------------------ */
export function setDigitValue(ui, i, v) {
    const box = ui.digits[i];

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
}

export function getDigits(ui) {
    // 未公開は'?'、公開済みはdata.valueを返す
    return ui.digits.map(box => box.classList.contains('opened')
        ? (box.dataset.value || '?')
        : '?'
    );
}

/* ------------------ Game View Init ------------------ */
export function initGameView(ui, state, game) {

    // 検索
    ui.searchButton.addEventListener('click', async () => {
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

        // Disable button to prevent double submit
        ui.searchButton.disabled = true;
        try {
            const digits = await game.search(keyword, { field: andField, value: andValue });

            ui.searchButton.disabled = false;

            if (!digits) return;

            // 履歴（検索成功時のみ追加）
            const li = document.createElement('li');
            const andLabel = andField === 'none' ? '' :
                andField === 'year' ? ` / AND: ${andValue}年` :
                    andField === 'maker' ? ` / AND: メーカー=${andValue}` :
                        ` / AND: 機種名=${andValue}`;
            li.textContent = keyword ? `${keyword}${andLabel}` : andLabel.replace(/^ \/\s*/, '');
            ui.usedWords.appendChild(li);

            // UI更新
            updateFilterChips(ui, state, andField, andValue);

            digits.forEach((d, i) => setDigitValue(ui, i, d));
            ui.resultList.classList.add('hidden');
            ui.showMessage('');
        } catch (e) {
            console.error(e);
            ui.searchButton.disabled = false;
            ui.showMessage('検索中にエラーが発生しました');
        }
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
            ui.showMessage(`完全勝利！P${state.currentPlayer}のスコアは${state.scores[state.currentPlayer - 1]}点です！`);
            endRound(ui, state);
        } else if (res.type === 'bust') {
            ui.resultMessage.classList.add('game-over', 'over-score');
            const { winnerIndex, winnerScore } = findWinner(state);
            ui.showMessage(`パンク！ゲーム終了となりプレイヤー${winnerIndex + 1}が${winnerScore}点で勝利！`);
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
                ui.showMessage(`パンク！ゲーム終了となりプレイヤー${winnerIndex + 1}が${winnerScore}点で勝利！`);
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
            box.classList.remove('covered', 'opened');   // カバーOFF
            const span = box.querySelector('.digit-value');
            if (span) span.textContent = '?';           // 表示は「?」に戻す
        });

        ui.resultMessage.classList.remove('game-over', 'over-score');
        ui.resultMessage.textContent = '';
        ui.resultList.classList.add('hidden');
        // 次手番の操作を有効化
        ui.searchButton.disabled = false;
        ui.revealButtons.forEach(b => b.disabled = false);
        renderAll(state, ui);
    });

    // ★ タイトルへ戻る（完全初期化）
    // Note: logic is complex enough to potentially warrant its own function or stay here.
    // Given user request to split by responsibility, this belongs to GameView or SetupView but since it resets EVERYTHING, it touches both.
    // I will implement it here as it is triggered from Game Section.
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

        // Trigger change event for SetupView logic listeners if needed, or manually call helpers
        // But since we are in GameView, we might not have access to SetupView helpers directly unless imported.
        // However, event listeners are already attached. Dispatching events might be cleaner.
        ui.targetMode?.dispatchEvent(new Event('change'));

        if (ui.restrictMode) { ui.restrictMode.value = 'none'; ui.restrictMode.disabled = false; }
        if (ui.yearSelect) { ui.yearSelect.value = ''; ui.yearSelect.disabled = false; }
        if (ui.andField) { ui.andField.disabled = false; ui.andField.value = 'none'; }
        if (ui.andValue) ui.andValue.value = '';
        if (ui.andYearSelect) ui.andYearSelect.value = '';
        if (ui.exLockMode) ui.exLockMode.value = 'off';

        ui.restrictMode?.dispatchEvent(new Event('change'));
        ui.andField?.dispatchEvent(new Event('change'));

        if (ui.keywordInput) ui.keywordInput.value = '';
        if (ui.usedWords) ui.usedWords.innerHTML = '';
        ui.digits.forEach(box => {
            box.dataset.value = '';
            box.classList.remove('covered', 'opened');
            const span = box.querySelector('.digit-value');
            if (span) span.textContent = '?';
        });
        ui.resultMessage.classList.remove('game-over', 'over-score');
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
