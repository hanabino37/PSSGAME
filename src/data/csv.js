import { parseCSV } from '../utils/csvParse.js';

export async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}
