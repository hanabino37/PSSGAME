
export function findWinner(state) {
    const max = Math.max(...state.scores);
    const idx = state.scores.findIndex(s => s === max);
    return { winnerIndex: idx, winnerScore: max };
}

export function endRound(ui, state) {
    ui.nextPlayerButton.disabled = true;
    ui.searchButton.disabled = true;
    ui.revealButtons.forEach(b => b.disabled = true);
    showResults(ui, state);
}

export function showResults(ui, state) {
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

    const htmlList = state.recentHits.slice(0, 30).map(hit => {
        // hit is now { name, maker } object from worker
        const name = hit.name || '';
        const maker = hit.maker || '';
        const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hi = txt => norm ? txt.replace(new RegExp(esc(norm), 'gi'), m => `<span style="color:green;font-weight:bold;">${m}</span>`) : txt;
        return `<li>${hi(name)}, ${hi(maker)}</li>`;
    }).join('');

    div.innerHTML = `<strong>HIT!</strong><ul>${htmlList}</ul>`;
    div.classList.remove('hidden');
}

export function initResultView(ui, state) {
    ui.showResultsButton.addEventListener('click', () => showResults(ui, state));
}
