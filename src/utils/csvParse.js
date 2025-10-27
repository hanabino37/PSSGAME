function tokenizeCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          currentValue += '"';
          i += 1; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if (char === '\n') {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    if (char === '\r') {
      if (next === '\n') {
        i += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows.filter(row => row.some(value => value.trim().length));
}

export function parseCSV(text) {
  if (!text) return [];

  const sanitizedText = text.length > 0 && text.charCodeAt(0) === 0xfeff
    ? text.slice(1)
    : text;

  const rows = tokenizeCSV(sanitizedText);
  if (!rows.length) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(h => h.trim());

  return dataRows.map(values => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}
