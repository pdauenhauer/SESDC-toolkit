import type { Load } from "../database/models/load";
import { combined24hProfile } from "../utils/loadUtils";

const REGION = "us-central1";
const POST_FUNCTION = "run_simulation_post";
const METADATA_FUNCTION = "simulation_metadata_get";

function getPostUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID is not set");
  return `https://${REGION}-${projectId}.cloudfunctions.net/${POST_FUNCTION}`;
}

export function getMetadataUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID is not set");
  return `https://${REGION}-${projectId}.cloudfunctions.net/${METADATA_FUNCTION}`;
}

export type SimulationPayload = {
  userId: string;
  projectId: string;
  latitude: number;
  longitude: number;
  loadInputs: number[];
  usingSolarPanel: boolean;
  usingWindTurbine: boolean;
  usingGenerator: boolean;
  usingBattery: boolean;
  wireLosses?: number;
  moduleMismatch?: number;
  moduleAging?: number;
  dustDirt?: number;
  converter?: number;
  solarArraySize?: number;
  solarCapex?: number;
  solarOpex?: number;
  solarLifespan?: number;
  solarReplacement?: number;
  namePlateCapacity?: number;
  ratedPower?: number;
  cutInSpeed?: number;
  ratedSpeed?: number;
  cutOutSpeed?: number;
  windCapex?: number;
  windOpex?: number;
  windLifespan?: number;
  windReplacement?: number;
  generatorCapacity?: number;
  generatorCapex?: number;
  generatorOpex?: number;
  generatorLifespan?: number;
  generatorReplacement?: number;
  chargeCapacity?: number;
  maximumStorage?: number;
  batteryType?: string;
  batteryCapex?: number;
  batteryOpex?: number;
  batteryLifespan?: number;
  batteryReplacement?: number;
  inflation?: number;
  laborCost?: number;
  landLeasingCost?: number;
  licensingCost?: number;
  otherCapex?: number;
  energyPrice?: number;
};

/** Meteosat Prime Meridian coverage (Europe/Africa). Backend uses nsrdb-msg-v1-0-0. */
const DUMMY_DEFAULTS = {
  latitude: 48.86,
  longitude: 2.35,
  usingSolarPanel: true,
  usingWindTurbine: false,
  usingGenerator: true,
  usingBattery: true,
  wireLosses: 10,
  moduleMismatch: 10,
  moduleAging: 8,
  dustDirt: 11,
  converter: 5,
  solarArraySize: 5000,
  solarCapex: 8000,
  solarOpex: 300,
  solarLifespan: 10,
  solarReplacement: 4000,
  namePlateCapacity: 2,
  ratedPower: 2500,
  cutInSpeed: 3,
  ratedSpeed: 12,
  cutOutSpeed: 25,
  windCapex: 12000,
  windOpex: 400,
  windLifespan: 10,
  windReplacement: 6000,
  generatorCapacity: 10000,
  generatorCapex: 5000,
  generatorOpex: 200,
  generatorLifespan: 10,
  generatorReplacement: 2500,
  chargeCapacity: 50,
  maximumStorage: 200,
  batteryType: "lithium-ion",
  batteryCapex: 1000,
  batteryOpex: 50,
  batteryLifespan: 10,
  batteryReplacement: 500,
  inflation: 3,
  laborCost: 0,
  landLeasingCost: 0,
  licensingCost: 0,
  otherCapex: 0,
  energyPrice: 0.15,
} as const;

export function buildSimulationPayload(
  userId: string,
  projectId: string,
  workbenchLoads: Load[],
  overrides?: Partial<SimulationPayload>
): SimulationPayload {
  const loadInputs = combined24hProfile(workbenchLoads);
  const hasLoad = loadInputs.some((v) => v !== 0);
  if (!hasLoad) {
    const defaultDaily = [
      0, 0, 0, 0, 0, 2, 4, 6, 8, 10, 12, 12, 10, 10, 12, 14, 12, 10, 8, 6, 4, 2, 0, 0,
    ];
    for (let i = 0; i < 24; i++) loadInputs[i] = defaultDaily[i];
  }

  const base: SimulationPayload = {
    userId,
    projectId,
    latitude: DUMMY_DEFAULTS.latitude,
    longitude: DUMMY_DEFAULTS.longitude,
    loadInputs,
    usingSolarPanel: DUMMY_DEFAULTS.usingSolarPanel,
    usingWindTurbine: DUMMY_DEFAULTS.usingWindTurbine,
    usingGenerator: DUMMY_DEFAULTS.usingGenerator,
    usingBattery: DUMMY_DEFAULTS.usingBattery,
    wireLosses: DUMMY_DEFAULTS.wireLosses,
    moduleMismatch: DUMMY_DEFAULTS.moduleMismatch,
    moduleAging: DUMMY_DEFAULTS.moduleAging,
    dustDirt: DUMMY_DEFAULTS.dustDirt,
    converter: DUMMY_DEFAULTS.converter,
    solarArraySize: DUMMY_DEFAULTS.solarArraySize,
    solarCapex: DUMMY_DEFAULTS.solarCapex,
    solarOpex: DUMMY_DEFAULTS.solarOpex,
    solarLifespan: DUMMY_DEFAULTS.solarLifespan,
    solarReplacement: DUMMY_DEFAULTS.solarReplacement,
    namePlateCapacity: DUMMY_DEFAULTS.namePlateCapacity,
    ratedPower: DUMMY_DEFAULTS.ratedPower,
    cutInSpeed: DUMMY_DEFAULTS.cutInSpeed,
    ratedSpeed: DUMMY_DEFAULTS.ratedSpeed,
    cutOutSpeed: DUMMY_DEFAULTS.cutOutSpeed,
    windCapex: DUMMY_DEFAULTS.windCapex,
    windOpex: DUMMY_DEFAULTS.windOpex,
    windLifespan: DUMMY_DEFAULTS.windLifespan,
    windReplacement: DUMMY_DEFAULTS.windReplacement,
    generatorCapacity: DUMMY_DEFAULTS.generatorCapacity,
    generatorCapex: DUMMY_DEFAULTS.generatorCapex,
    generatorOpex: DUMMY_DEFAULTS.generatorOpex,
    generatorLifespan: DUMMY_DEFAULTS.generatorLifespan,
    generatorReplacement: DUMMY_DEFAULTS.generatorReplacement,
    chargeCapacity: DUMMY_DEFAULTS.chargeCapacity,
    maximumStorage: DUMMY_DEFAULTS.maximumStorage,
    batteryType: DUMMY_DEFAULTS.batteryType,
    batteryCapex: DUMMY_DEFAULTS.batteryCapex,
    batteryOpex: DUMMY_DEFAULTS.batteryOpex,
    batteryLifespan: DUMMY_DEFAULTS.batteryLifespan,
    batteryReplacement: DUMMY_DEFAULTS.batteryReplacement,
    inflation: DUMMY_DEFAULTS.inflation,
    laborCost: DUMMY_DEFAULTS.laborCost,
    landLeasingCost: DUMMY_DEFAULTS.landLeasingCost,
    licensingCost: DUMMY_DEFAULTS.licensingCost,
    otherCapex: DUMMY_DEFAULTS.otherCapex,
    energyPrice: DUMMY_DEFAULTS.energyPrice,
  };

  if (overrides) {
    return { ...base, ...overrides };
  }
  return base;
}

export type SimulationResult = Record<string, string | null>;

export type SimulationPostResponse = {
  storagePath?: string | null;
  csvKeys?: string[];
  csvBundle: SimulationResult;
};

export async function runSimulation(
  payload: SimulationPayload
): Promise<SimulationResult> {
  const url = getPostUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Simulation failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as SimulationPostResponse;
  if (json && typeof json.csvBundle === "object") {
    return json.csvBundle;
  }
  return json as unknown as SimulationResult;
}
