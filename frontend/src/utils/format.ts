/** Display formatters matching the redesign's conventions. */

/** One decimal, grouped: 31.4, 1,204.0 */
export const f1 = (v: number): string =>
  (Math.round(v * 10) / 10).toLocaleString("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Two decimals, ungrouped: 3.20 */
export const f2 = (v: number): string => (Math.round(v * 100) / 100).toFixed(2);

/** Energy: 850 kWh / 12.4 MWh */
export const fEnergy = (kwh: number): string =>
  Math.abs(kwh) >= 1000 ? `${(kwh / 1000).toFixed(1)} MWh` : `${Math.round(kwh)} kWh`;

/** Compact money with a true minus sign: $950 / $12.4k / −$1.20M */
export const fMoney = (v: number): string => {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}k`;
  return `${s}$${Math.round(a)}`;
};

/** Full money, grouped: $12,400 / $1.20M (used for up-front cost estimates). */
export const fMoneyFull = (v: number): string =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v).toLocaleString("en")}`;

/** "HH:00" for an hour index. */
export const hourLabel = (h: number): string => `${String(h).padStart(2, "0")}:00`;

/** Sum of numeric-ish values. */
export const sum = (a: ArrayLike<number | string>): number => {
  let t = 0;
  for (let i = 0; i < a.length; i += 1) t += Number(a[i]) || 0;
  return t;
};
