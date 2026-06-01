// src/components/ProjectWizard/constants.ts
import { ProjectData } from './types';

export const SOLAR_PRESETS = {
  standard: { losses: { wire: 2, mismatch: 5, aging: 0.5, dust: 3, converter: 4 }, costPerKw: 1000 },
  premium:  { losses: { wire: 1, mismatch: 2, aging: 0.3, dust: 1, converter: 2 }, costPerKw: 1500 },
};

type SolarLossesLike = {
  wire: number | string;
  mismatch: number | string;
  aging: number | string;
  dust: number | string;
  converter: number | string;
};

function n(v: number | string): number {
  return typeof v === 'number' ? v : Number(v);
}

/** For preset card selected state (losses may be edited as strings in advanced grid). */
export function isSolarPresetStandard(losses: SolarLossesLike): boolean {
  const s = SOLAR_PRESETS.standard.losses;
  return (
    n(losses.wire) === s.wire &&
    n(losses.mismatch) === s.mismatch &&
    n(losses.aging) === s.aging &&
    n(losses.dust) === s.dust &&
    n(losses.converter) === s.converter
  );
}

export function isSolarPresetPremium(losses: SolarLossesLike): boolean {
  const p = SOLAR_PRESETS.premium.losses;
  return (
    n(losses.wire) === p.wire &&
    n(losses.mismatch) === p.mismatch &&
    n(losses.aging) === p.aging &&
    n(losses.dust) === p.dust &&
    n(losses.converter) === p.converter
  );
}

export const BATTERY_PRESETS = {
  lithium: { type: 'Lithium-Ion', lifespan: 10, costPerKwh: 400 },
  lead:    { type: 'Lead-Acid',    lifespan: 5,  costPerKwh: 150 },
};

export const INITIAL_PROJECT_DATA: ProjectData = {
  name: '',
  solar: {
    enabled: false,
    sizeKw: 0,
    losses: { wire: 2, mismatch: 5, aging: 0.5, dust: 3, converter: 4 },
    costs: { capital: 0, opPercent: 1, opDollar: 0, repPercent: 0, repDollar: 0 },
    lifespan: 25
  },
  battery: {
    enabled: false,
    type: 'Lithium-Ion',
    storageKwh: 0,
    chargeKw: 0,
    costs: { capital: 0, opPercent: 1, opDollar: 0, repPercent: 0, repDollar: 0 },
    lifespan: 10
  },
  wind: {
    enabled: false,
    nameplateKw: 0,
    powerPerTurbineKw: 0,
    speeds: { cutIn: 3, rated: 12, cutOut: 25 },
    costs: { capital: 0, opPercent: 1, opDollar: 0, repPercent: 0, repDollar: 0 },
    lifespan: 20
  },
  generator: {
    enabled: false,
    capacityKw: 0,
    costs: { capital: 0, opPercent: 5, opDollar: 0, repPercent: 0, repDollar: 0, fuelPrice: 1.50 },
    lifespan: 15
  },
  loads: Array(24).fill(0),
  loadProfiler: { baseLoadKw: 0 }
};