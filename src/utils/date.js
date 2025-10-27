export function extractYear(value) {
  const normalized = String(value ?? '').normalize('NFKC');
  const match = normalized.match(/(\d{4})/);
  return match ? match[1] : '';
}
