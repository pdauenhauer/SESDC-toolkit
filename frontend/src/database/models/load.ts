/**
 * Load model: a single load with seasonal 24-hour profiles, name, label, and optional nested loads.
 */

export type Season = "spring" | "summer" | "fall" | "winter";
export const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export type SeasonalProfiles = Record<Season, number[]>;

export type Load = {
  id: string;
  name: string;
  /** References id in loadLabels (e.g. "lighting", "building"). */
  labelId: string;
  /** Per-season 24h load profiles (kW) for hours 0-23. */
  seasonalProfiles: SeasonalProfiles;
  /** One level of nesting only; only when label canNest (e.g. building, business). */
  children?: Load[];
};

/** Default 24h profile: all zeros. */
export function defaultProfile(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

/** Default seasonal profiles: all zeros for every season. */
export function defaultSeasonalProfiles(): SeasonalProfiles {
  return {
    spring: defaultProfile(),
    summer: defaultProfile(),
    fall: defaultProfile(),
    winter: defaultProfile(),
  };
}

/**
 * Migrate a legacy load (single `profile` field) to seasonal profiles.
 * If the load already has `seasonalProfiles`, returns it unchanged.
 */
export function migrateLoad(raw: any): Load {
  if (raw.seasonalProfiles) {
    return {
      id: raw.id,
      name: raw.name,
      labelId: raw.labelId,
      seasonalProfiles: raw.seasonalProfiles,
      ...(raw.children?.length ? { children: raw.children.map(migrateLoad) } : {}),
    };
  }
  const profile: number[] = Array.isArray(raw.profile) ? raw.profile : defaultProfile();
  return {
    id: raw.id,
    name: raw.name,
    labelId: raw.labelId,
    seasonalProfiles: {
      spring: [...profile],
      summer: [...profile],
      fall: [...profile],
      winter: [...profile],
    },
    ...(raw.children?.length ? { children: raw.children.map(migrateLoad) } : {}),
  };
}
