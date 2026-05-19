export type ParsedCsvTimeseries = {
  x: number[]; // epoch seconds
  columns: Record<string, (number | null)[]>;
  names: string[];
};

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvRows(csvText: string): CsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });

    return row;
  });
}

function parseDatetimeToEpochSeconds(s: string): number {
  const parts = String(s).trim().split(" ");
  if (parts.length < 2) return 0;
  const [datePart, timePart] = parts;
  const [m, d, y] = datePart.split("/").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Math.floor(dt.getTime() / 1000);
}

function toNullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDatetimeWideCsv(csvText: string): ParsedCsvTimeseries {
  const rows = parseCsvRows(csvText);
  if (!rows.length) return { x: [], columns: {}, names: [] };

  const headers = Object.keys(rows[0]);
  if (!headers.includes("Datetime")) throw new Error(`CSV missing required column "Datetime"`);

  const names = headers.filter((h) => h !== "Datetime");
  const x = new Array<number>(rows.length);
  const columns: Record<string, (number | null)[]> = {};
  for (const n of names) columns[n] = new Array(rows.length);

  rows.forEach((row: CsvRow, i: number) => {
    x[i] = parseDatetimeToEpochSeconds(row["Datetime"]);
    for (const n of names) columns[n][i] = toNullableNum(row[n]);
  });

  return { x, columns, names };
}
