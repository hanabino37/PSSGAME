
import { parseCSV } from '../utils/csvParse.js';
import { extractYear } from '../utils/date.js';

let csvData = [];

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    if (type === 'init') {
        try {
            const res = await fetch(payload.path);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            csvData = parseCSV(text);




            // Create years list for main thread (for Setup and ExLock)
            const years = Array.from(
                new Set(
                    csvData
                        .map(r => extractYear(r['導入月']))
                        .filter(y => /^\d{4}$/.test(y))
                )
            ).sort((a, b) => Number(b) - Number(a));

            self.postMessage({ type: 'init-complete', years });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    } else if (type === 'search') {
        if (!csvData.length) {
            self.postMessage({ type: 'search-result', digits: null, recentHits: [], id });
            return;
        }

        const { keyword, andCond } = payload;
        const norm = (keyword ?? '').normalize('NFKC').toLowerCase();
        const recentHits = [];

        for (const row of csvData) {
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

            if (matched) recentHits.push({ name: row['機種名'], maker: row['メーカー'] });
        }



        const digits = String(recentHits.length).padStart(4, '0').split('');
        self.postMessage({ type: 'search-result', digits, recentHits, id });
    }
};
