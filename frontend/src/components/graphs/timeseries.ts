/** Hourly-simulation time-series helpers shared by the Graphs tab. */

export type ParsedView = {
  x: number[]; // epoch seconds
  columns: Record<string, (number | null)[]>;
  names: string[];
};

export type Season = "all" | "summer" | "winter";
export type Resolution = "daily" | "hourly";
/** Hourly views are sliced to one day or one week at a time. */
export type SliceWindow = "day" | "week";
export const WINDOW_DAYS: Record<SliceWindow, number> = { day: 1, week: 7 };

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

/** Row index where each calendar day starts (local time), in order. */
export function dayStarts(parsed: ParsedView): number[] {
  const out: number[] = [];
  let prev = -1;
  parsed.x.forEach((ts, i) => {
    const d = new Date(ts * 1000);
    const key = d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
    if (key !== prev) out.push(i);
    prev = key;
  });
  return out;
}

/** The hourly rows for `count` days starting at day index `startDay`. */
export function sliceDays(parsed: ParsedView, starts: number[], startDay: number, count: number): ParsedView {
  const from = starts[startDay] ?? 0;
  const to = starts[startDay + count] ?? parsed.x.length;
  const columns: Record<string, (number | null)[]> = {};
  for (const n of parsed.names) columns[n] = parsed.columns[n].slice(from, to);
  return { x: parsed.x.slice(from, to), columns, names: parsed.names };
}

/** "2026-03-04" for a date input, in local time. */
export function isoDay(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type DayProfile = {
  /** Average kW by hour of day (24 values). Supply series are what served the load. */
  load: number[];
  solar: number[];
  wind: number[];
  generator: number[];
  battery: number[];
  unmet: number[];
  days: number;
};

/**
 * Average hour-of-day profile over the given months (null = all), splitting each
 * hour's load into what served it. Solar and wind serve first (shared pro rata).
 *
 * Current results report battery discharge, diesel and unmet load per hour, so
 * those are used directly. Results from before the 20-year dispatch had no
 * discharge column and only reported unmet load when a battery was simulated;
 * for those the split is derived (generator, then battery, remainder unmet).
 */
export function averageDayProfile(parsed: ParsedView, months: number[] | null): DayProfile {
  const keys = ["load", "solar", "wind", "generator", "battery", "unmet"] as const;
  const acc = Object.fromEntries(keys.map((k) => [k, Array(24).fill(0) as number[]])) as Record<(typeof keys)[number], number[]>;
  const cnt = Array(24).fill(0) as number[];
  const col = (n: string) => parsed.columns[n] ?? [];
  const [L, S, W, G, U, SOC, B] = [
    "load_kW",
    "solar_kW",
    "wind_kW",
    "diesel_kW",
    "load_not_serviced_kW",
    "battery_soc_kWh",
    "battery_discharge_kW",
  ].map(col);
  const direct = parsed.names.includes("battery_discharge_kW");
  const hasBattery = SOC.some((v) => (v ?? 0) > 0);
  const daySet = new Set<string>();
  const allow = months ? new Set(months) : null;

  parsed.x.forEach((ts, i) => {
    const d = new Date(ts * 1000);
    if (allow && !allow.has(d.getMonth())) return;
    const h = d.getHours();
    const load = Math.max(0, L[i] ?? 0);
    const s = Math.max(0, S[i] ?? 0);
    const w = Math.max(0, W[i] ?? 0);
    const renew = s + w;
    const used = Math.min(load, renew);
    let gen: number;
    let battery: number;
    let unmet: number;
    if (direct) {
      battery = Math.max(0, B[i] ?? 0);
      gen = Math.max(0, G[i] ?? 0);
      unmet = Math.max(0, U[i] ?? 0);
    } else {
      gen = Math.min(Math.max(0, G[i] ?? 0), load - used);
      const left = load - used - gen;
      unmet = hasBattery ? Math.min(left, Math.max(0, U[i] ?? 0)) : left;
      battery = hasBattery ? left - unmet : 0;
    }
    acc.load[h] += load;
    acc.solar[h] += renew > 0 ? used * (s / renew) : 0;
    acc.wind[h] += renew > 0 ? used * (w / renew) : 0;
    acc.generator[h] += gen;
    acc.battery[h] += battery;
    acc.unmet[h] += unmet;
    cnt[h] += 1;
    daySet.add(`${d.getMonth()}-${d.getDate()}`);
  });
  const avg = (a: number[]) => a.map((v, h) => (cnt[h] ? v / cnt[h] : 0));
  return {
    load: avg(acc.load),
    solar: avg(acc.solar),
    wind: avg(acc.wind),
    generator: avg(acc.generator),
    battery: avg(acc.battery),
    unmet: avg(acc.unmet),
    days: daySet.size,
  };
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
  return monthHourAveragesOf(parsed, parsed.columns[column] ?? null);
}

/** Average of `values` for each month (rows) and hour of day (columns). */
export function monthHourAveragesOf(parsed: ParsedView, values: (number | null)[] | null): number[][] {
  const acc = Array.from({ length: 12 }, () => Array(24).fill(0) as number[]);
  const cnt = Array.from({ length: 12 }, () => Array(24).fill(0) as number[]);
  if (!values) return acc;
  parsed.x.forEach((ts, i) => {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) return;
    const d = new Date(ts * 1000);
    acc[d.getMonth()][d.getHours()] += v;
    cnt[d.getMonth()][d.getHours()] += 1;
  });
  return acc.map((row, m) => row.map((v, h) => (cnt[m][h] ? v / cnt[m][h] : 0)));
}

/** One row per calendar day (in order) with that day's 24 hourly values; missing hours are null. */
export type DayHourGrid = { days: number[]; cells: (number | null)[][] };

export function dayHourGrid(parsed: ParsedView, values: (number | null)[] | null): DayHourGrid {
  const days: number[] = [];
  const cells: (number | null)[][] = [];
  if (!values) return { days, cells };
  let lastKey = "";
  parsed.x.forEach((ts, i) => {
    const d = new Date(ts * 1000);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== lastKey) {
      lastKey = key;
      days.push(ts);
      cells.push(Array(24).fill(null));
    }
    const v = values[i];
    if (v != null && Number.isFinite(v)) cells[cells.length - 1][d.getHours()] = v;
  });
  return { days, cells };
}
