/** Minimal numeric CSV parser for the simulation's "wide" output tables. */

export type NumericCsv = {
  headers: string[];
  /** Column name -> values. Non-numeric cells become NaN. */
  columns: Record<string, number[]>;
  rowCount: number;
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

export function parseNumericCsv(csvText: string): NumericCsv {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headers: [], columns: {}, rowCount: 0 };

  const headers = splitCsvLine(lines[0]);
  const columns: Record<string, number[]> = {};
  for (const h of headers) columns[h] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    headers.forEach((h, idx) => {
      const n = Number(cells[idx]);
      columns[h].push(Number.isFinite(n) ? n : NaN);
    });
  }

  return { headers, columns, rowCount: lines.length - 1 };
}

/** Sum a numeric column, ignoring NaN. */
export function sumColumn(values: number[] | undefined): number {
  if (!values) return 0;
  let total = 0;
  for (const v of values) if (Number.isFinite(v)) total += v;
  return total;
}

/** Last finite value in a column (e.g. final cumulative total), or 0. */
export function lastFinite(values: number[] | undefined): number {
  if (!values) return 0;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return 0;
}
