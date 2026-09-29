// src/components/wizard/types.ts — project data model shared by the wizard, workbench and backend payload.

export interface CostData {
  capital: number;
  opPercent: number;
  opDollar: number;
  repPercent: number;
  repDollar: number;
  fuelPrice?: number; // Optional, only for generator
}

export interface SolarData {
  enabled: boolean;
  sizeKw: number;
  losses: { wire: number; mismatch: number; aging: number; dust: number; converter: number };
  costs: CostData;
  lifespan: number;
}

export interface BatteryData {
  enabled: boolean;
  type: string;
  storageKwh: number;
  chargeKw: number;
  costs: CostData;
  lifespan: number;
}

export interface WindData {
  enabled: boolean;
  nameplateKw: number;
  powerPerTurbineKw: number;
  speeds: { cutIn: number; rated: number; cutOut: number };
  costs: CostData;
  lifespan: number;
}

export interface GeneratorData {
  enabled: boolean;
  capacityKw: number;
  costs: CostData;
  lifespan: number;
}

/** Site location used to fetch the weather/resource dataset for the simulation. */
export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
}

/** Project-level economic assumptions (drive the 20-year financial model). */
export interface EconomicsData {
  inflationPct: number;     // annual inflation, percent (e.g. 3 = 3%)
  energyPrice: number;      // sale price of energy, $/kWh
  laborCost: number;        // recurring labor, $/yr
  landLeasingCost: number;  // recurring land lease, $/yr
  licensingCost: number;    // one-time licensing/permitting CAPEX, $
  otherCapex: number;       // other one-time CAPEX, $
}

/** Persisted Smart Load Profiler choices (optional). */
export interface LoadProfilerSettings {
  usagePattern?: "residential" | "commercial";
  pattern?: "residential" | "commercial";
  buildingSize?: "small" | "medium" | "large";
  baseLoadKw: number;
  /**
   * Raw per-hour load "shape" (24 values), independent of the base-load floor.
   * Effective hourly load = max(baseLoadKw, shape[h]). Storing the shape keeps
   * base-load changes reversible and preserves manual per-bar edits.
   */
  shape?: number[];
}

export interface ProjectData {
  name: string;
  solar: SolarData;
  battery: BatteryData;
  wind: WindData;
  generator: GeneratorData;
  location: LocationData;
  economics: EconomicsData;
  loads: number[];
  loadProfiler?: LoadProfilerSettings;
}