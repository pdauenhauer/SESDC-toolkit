/** Hourly-simulation time-series helpers shared by the Graphs tab. */

export type ParsedView = {
  x: number[]; // epoch seconds
  columns: Record<string, (number | null)[]>;
  names: string[];
};

export type Season = "all" | "summer" | "winter";
export type Resolution = "daily" | "hourly";

// Ordered month lists (0-indexed). Winter is Dec → Jan → Feb so the view reads
// continuously across the year-end instead of wrapping (Jan, Feb, … then Dec).
const SEASON_MONTHS: Record<Season, number[] | null> = {
  all: null,
  summer: [5, 6, 7],
  winter: [11, 0, 1],
};

export function filterBySeason(parsed: ParsedView, season: Season): ParsedView {
  const months = SEASON_MONTHS[season];
  if (!months) return parsed;
  const rowMonth = parsed.x.map((ts) => new Date(ts * 1000).getMonth());
  const keep: number[] = [];
  for (const m of months) {
    for (let i = 0; i < rowMonth.length; i += 1) if (rowMonth[i] === m) keep.push(i);
  }
  const columns: Record<string, (number | null)[]> = {};
  for (const n of parsed.names) columns[n] = keep.map((i) => parsed.columns[n][i]);
  return { x: keep.map((i) => parsed.x[i]), columns, names: parsed.names };
}

/** Average each column per calendar day (≈365 points). */
export function aggregateDaily(view: ParsedView): ParsedView {
  const groups = new Map<number, number[]>();
  const order: number[] = [];
  view.x.forEach((ts, i) => {
    const d = new Date(ts * 1000);
    const key = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(i);
  });
  const x: number[] = [];
  const columns: Record<string, (number | null)[]> = {};
  for (const n of view.names) columns[n] = [];
  for (const key of order) {
    const idxs = groups.get(key)!;
    x.push(view.x[idxs[0]]);
    for (const n of view.names) columns[n].push(average(idxs.map((i) => view.columns[n][i])));
  }
  return { x, columns, names: view.names };
}

/** Bucket-average every column together down to at most maxPoints rows. */
export function downsampleView(view: ParsedView, maxPoints: number): ParsedView {
  const n = view.x.length;
  if (n <= maxPoints) return view;
  const bucket = Math.ceil(n / maxPoints);
  const x: number[] = [];
  const columns: Record<string, (number | null)[]> = {};
  for (const name of view.names) columns[name] = [];
  for (let i = 0; i < n; i += bucket) {
    const end = Math.min(n, i + bucket);
    x.push(view.x[i]);
    for (const name of view.names) columns[name].push(average(view.columns[name].slice(i, end)));
  }
  return { x, columns, names: view.names };
}

function average(vals: (number | null)[]): number | null {
  let sum = 0;
  let count = 0;
  for (const v of vals) {
    if (v != null && Number.isFinite(v)) {
      sum += v;
      count += 1;
    }
  }
  return count ? sum / count : null;
}

const dayFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

/** "Jan 5" or, with the hour, "Jan 5, 08:00". */
export function dateLabel(ts: number, withHour: boolean): string {
  const d = new Date(ts * 1000);
  return withHour ? `${dayFmt.format(d)}, ${String(d.getHours()).padStart(2, "0")}:00` : dayFmt.format(d);
}

/** Month (rows) × hour (columns) average of one column — e.g. solar output. */
export function monthHourAverages(parsed: ParsedView, column: string): number[][] {
  const acc = Array.from({ length: 12 }, () => Array(24).fill(0) as number[]);
  const cnt = Array.from({ length: 12 }, () => Array(24).fill(0) as number[]);
  const col = parsed.columns[column];
  if (!col) return acc;
  parsed.x.forEach((ts, i) => {
    const v = col[i];
    if (v == null || !Number.isFinite(v)) return;
    const d = new Date(ts * 1000);
    acc[d.getMonth()][d.getHours()] += v;
    cnt[d.getMonth()][d.getHours()] += 1;
  });
  return acc.map((row, m) => row.map((v, h) => (cnt[m][h] ? v / cnt[m][h] : 0)));
}
