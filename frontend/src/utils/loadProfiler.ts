/** Normalized 0–1 daily shape (peak = 1) for scaling. */

export type LoadPattern = 'residential' | 'commercial';
export type BuildingSize = 'small' | 'medium' | 'large';

const RESIDENTIAL_SHAPE = [
  0.2, 0.2, 0.2, 0.2, 0.3, 0.4, 0.6, 0.6, 0.5, 0.4, 0.4, 0.4, 0.4, 0.4, 0.5, 0.6, 0.8, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.3
];

const COMMERCIAL_SHAPE = [
  0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1
];

/** Peak kW used to scale the shape (approximate nameplate before base load is added). */
export const BUILDING_SIZE_PEAK_KW: Record<LoadPattern, Record<BuildingSize, number>> = {
  residential: { small: 1, medium: 4, large: 12 },
  commercial: { small: 1, medium: 4, large: 12 }
};

export const BUILDING_SIZE_COPY: Record<
  LoadPattern,
  Record<BuildingSize, { title: string; sub: string }>
> = {
  residential: {
    small: {
      title: 'Small',
      sub: '~0.5–1 kW. Basic shelter with 1-2 LED lights, phone charging, and a small fan.'
    },
    medium: {
      title: 'Medium',
      sub: '~2–5 kW. Communal building with a small medical fridge, multiple fans, basic appliances, and water purification.'
    },
    large: {
      title: 'Large',
      sub: '~5–15+ kW. Village infrastructure such as a schoolhouse, community center, agricultural water pump, and light machinery.'
    }
  },
  commercial: {
    small: {
      title: 'Small',
      sub: '~0.5–1 kW. Basic shelter with 1-2 LED lights, phone charging, and a small fan.'
    },
    medium: {
      title: 'Medium',
      sub: '~2–5 kW. Communal building with a small medical fridge, multiple fans, basic appliances, and water purification.'
    },
    large: {
      title: 'Large',
      sub: '~5–15+ kW. Village infrastructure such as a schoolhouse, community center, agricultural water pump, and light machinery.'
    }
  }
};

export function normalizedShape(pattern: LoadPattern): number[] {
  return pattern === 'residential' ? [...RESIDENTIAL_SHAPE] : [...COMMERCIAL_SHAPE];
}

/** Hourly kW: base + rounded(shape * peak). */
export function buildHourlyLoads(pattern: LoadPattern, size: BuildingSize, baseLoadKw: number): number[] {
  const peak = BUILDING_SIZE_PEAK_KW[pattern][size];
  const shape = normalizedShape(pattern);
  return shape.map((v) => Math.max(0, baseLoadKw + Math.round(v * peak)));
}
