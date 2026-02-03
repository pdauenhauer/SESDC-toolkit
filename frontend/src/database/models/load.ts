/**
 * Load model: a single load with 24-hour profile, name, label, and optional nested loads.
 */

export type Load = {
  id: string;
  name: string;
  /** References id in loadLabels (e.g. "lighting", "building"). */
  labelId: string;
  /** 24 values: hourly load (e.g. kW or normalized 0–1) for hours 0–23. */
  profile: number[];
  /** One level of nesting only; only when label canNest (e.g. building, business). */
  children?: Load[];
};

/** Default 24h profile: zeros or a simple placeholder curve. */
export function defaultProfile(): number[] {
  return Array.from({ length: 24 }, (_, i) => {
    // Slight daytime bump for demo
    if (i >= 7 && i <= 22) return 0.3 + 0.2 * Math.sin((i - 14) / 4);
    return 0.1;
  });
}
