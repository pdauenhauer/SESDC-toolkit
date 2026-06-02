/**
 * Load model: a single load with 24-hour profile, name, label, and optional nested loads.
 */

import type { LoadBlock } from '../../utils/loadBlocks';

export type Load = {
  id: string;
  name: string;
  /** References id in loadLabels (e.g. "lighting", "building"). */
  labelId: string;
  /** 24 values: hourly load (e.g. kW or normalized 0–1) for hours 0–23. */
  profile: number[];
  /** Block-based time slots from which profile is derived. Persisted for re-editing. */
  blocks?: LoadBlock[];
  /** One level of nesting only; only when label canNest (e.g. building, business). */
  children?: Load[];
};

/** Default 24h profile: all zeros (no default inputs). */
export function defaultProfile(): number[] {
  return Array.from({ length: 24 }, () => 0);
}