import type { Load } from "../database/models/load";
import type { Project } from "../database/models/metadata";
import type { CostData } from "../components/wizard/types";
import { combined24hProfile } from "../utils/loadUtils";
import { auth } from "../utils/firebase/firebase-init";

const REGION = "us-central1";
const POST_FUNCTION = "run_simulation_post";
const STORED_FUNCTION = "get_stored_simulation";

function getProjectId(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID is not set");
  return projectId;
}

/**
 * Cloud Functions base URL. Set VITE_FUNCTIONS_BASE_URL to use the local
 * emulator, e.g. http://127.0.0.1:5001/<project-id>/us-central1
 */
function functionsBase(): string {
  const override = import.meta.env.VITE_FUNCTIONS_BASE_URL as string | undefined;
  return override ? override.replace(/\/+$/, "") : `https://${REGION}-${getProjectId()}.cloudfunctions.net`;
}

function getPostUrl(): string {
  return `${functionsBase()}/${POST_FUNCTION}`;
}

/**
 * The signed-in user's Firebase ID token as an Authorization header. The
 * functions act as the user in this token (any userId sent alongside must
 * match it). getIdToken() refreshes the token when it is close to expiring.
 */
async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to run or view simulations.");
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

/** CSV key for a simulated year (1-based). Year 1 is the original hourly table. */
export function hourlyYearKey(year: number): string {
  return year === 1 ? "hourly_simulation" : `hourly_year_${String(year).padStart(2, "0")}`;
}

/**
 * Fetch one year's hourly table from the last stored run. Years 2–20 are not
 * part of the normal bundle (they are large), so they are loaded on demand.
 */
export async function fetchSimulationYear(userId: string, projectId: string, year: number): Promise<string | null> {
  const key = hourlyYearKey(year);
  const url =
    `${functionsBase()}/${STORED_FUNCTION}?userId=${encodeURIComponent(userId)}` +
    `&projectId=${encodeURIComponent(projectId)}&keys=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "GET", headers: await authHeaders() });
  if (!res.ok) throw new Error(`Couldn't load year ${year} (${res.status})`);
  const data = await res.json();
  return (data?.csvBundle?.[key] as string | undefined) ?? null;
}

/** Fetch stored simulation CSVs for a project (GET); returns csvBundle for display on Data tab. */
export async function fetchStoredSimulation(
  userId: string,
  projectId: string
): Promise<SimulationResult> {
  const base = `${functionsBase()}/${STORED_FUNCTION}`;
  const url = `${base}?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`;
  const res = await fetch(url, { method: "GET", headers: await authHeaders() });
  const data = res.ok ? await res.json() : null;
  const csvBundle = (data?.csvBundle ?? {}) as SimulationResult;
  console.log("[Simulation GET stored] response", {
    ok: res.ok,
    status: res.status,
    url,
    csvKeys: Object.keys(csvBundle),
  });
  if (!res.ok) return {};
  return csvBundle;
}

export type SimulationResult = Record<string, string | null>;

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
  generatorFuelPrice?: number;
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
  generatorFuelPrice: 1.5,
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

/** Coerce a possibly-string/undefined value to a finite number, else `fallback`. */
function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Map wizard `CostData` to the backend's flat capex/opex/replacement triple. */
function costFields(costs: CostData | undefined) {
  return {
    capex: num(costs?.capital),
    opex: num(costs?.opDollar),
    replacement: num(costs?.repDollar),
  };
}

/**
 * Translate a stored project's system configuration (the same shape the wizard
 * writes to Firestore) into simulation-payload fields. Only sets a component's
 * parameters when that component is enabled; the `using*` flags always reflect
 * the project so a disabled/unconfigured component is correctly excluded.
 *
 * Unit conversions match what the backend formulas expect:
 *  - solar `sizeKw` and generator `capacityKw` are kW in the UI but the Python
 *    formulas treat the values as watts, so we multiply by 1000.
 *  - wind `namePlateCapacity` is a turbine *count* and `ratedPower` is watts per
 *    turbine in the backend, so we derive count = total / per-turbine kW.
 */
export function payloadFromProject(project: Project): Partial<SimulationPayload> {
  const out: Partial<SimulationPayload> = {};

  const solar = project.solar;
  out.usingSolarPanel = !!solar?.enabled;
  if (solar?.enabled) {
    const c = costFields(solar.costs);
    out.solarArraySize = num(solar.sizeKw) * 1000; // kW -> W nameplate
    out.wireLosses = num(solar.losses?.wire);
    out.moduleMismatch = num(solar.losses?.mismatch);
    out.moduleAging = num(solar.losses?.aging);
    out.dustDirt = num(solar.losses?.dust);
    out.converter = num(solar.losses?.converter);
    out.solarCapex = c.capex;
    out.solarOpex = c.opex;
    out.solarReplacement = c.replacement;
    out.solarLifespan = num(solar.lifespan);
  }

  const battery = project.battery;
  out.usingBattery = !!battery?.enabled;
  if (battery?.enabled) {
    const c = costFields(battery.costs);
    out.chargeCapacity = num(battery.chargeKw);
    out.maximumStorage = num(battery.storageKwh);
    // Backend compares against the literal "lithium-ion"; normalize "Lithium-Ion" etc.
    out.batteryType = (battery.type || "lithium-ion").toLowerCase().replace(/\s+/g, "-");
    out.batteryCapex = c.capex;
    out.batteryOpex = c.opex;
    out.batteryReplacement = c.replacement;
    out.batteryLifespan = num(battery.lifespan);
  }

  const wind = project.wind;
  out.usingWindTurbine = !!wind?.enabled;
  if (wind?.enabled) {
    const c = costFields(wind.costs);
    const perTurbineKw = num(wind.powerPerTurbineKw);
    const totalKw = num(wind.nameplateKw);
    const numTurbines =
      perTurbineKw > 0 ? Math.max(1, Math.round(totalKw / perTurbineKw)) : 1;
    out.namePlateCapacity = numTurbines;
    out.ratedPower = (perTurbineKw > 0 ? perTurbineKw : totalKw) * 1000; // kW -> W per turbine
    out.cutInSpeed = num(wind.speeds?.cutIn);
    out.ratedSpeed = num(wind.speeds?.rated);
    out.cutOutSpeed = num(wind.speeds?.cutOut);
    out.windCapex = c.capex;
    out.windOpex = c.opex;
    out.windReplacement = c.replacement;
    out.windLifespan = num(wind.lifespan);
  }

  const generator = project.generator;
  out.usingGenerator = !!generator?.enabled;
  if (generator?.enabled) {
    const c = costFields(generator.costs);
    out.generatorCapacity = num(generator.capacityKw) * 1000; // kW -> W
    out.generatorCapex = c.capex;
    out.generatorOpex = c.opex;
    out.generatorReplacement = c.replacement;
    out.generatorLifespan = num(generator.lifespan);
    out.generatorFuelPrice = num(generator.costs?.fuelPrice, 1.5);
  }

  // Site location (captured by the Economics & Location wizard step).
  const lat = num(project.location?.latitude, NaN);
  const lng = num(project.location?.longitude, NaN);
  if (Number.isFinite(lat)) out.latitude = lat;
  if (Number.isFinite(lng)) out.longitude = lng;

  // Project-level economic assumptions (drive the 20-year financial model).
  const eco = project.economics;
  if (eco) {
    out.inflation = num(eco.inflationPct, 3);
    out.energyPrice = num(eco.energyPrice, 0.15);
    out.laborCost = num(eco.laborCost);
    out.landLeasingCost = num(eco.landLeasingCost);
    out.licensingCost = num(eco.licensingCost);
    out.otherCapex = num(eco.otherCapex);
  }

  return out;
}

export function buildSimulationPayload(
  userId: string,
  projectId: string,
  workbenchLoads: Load[],
  project?: Project | null,
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
    generatorFuelPrice: DUMMY_DEFAULTS.generatorFuelPrice,
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

  // Layer order: dummy/base defaults → stored project config → explicit overrides.
  // `base` supplies safe fallbacks (loss %, wind speeds, location) so a partially
  // configured project still produces a valid request.
  const projectPayload = project ? payloadFromProject(project) : {};
  return { ...base, ...projectPayload, ...overrides };
}

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
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Simulation failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as SimulationPostResponse;
  console.log("[Simulation POST] response", {
    ok: res.ok,
    status: res.status,
    storagePath: json?.storagePath,
    csvKeys: json?.csvKeys,
    csvBundleKeys: json?.csvBundle ? Object.keys(json.csvBundle) : [],
    fullResponse: json,
  });
  if (json && typeof json.csvBundle === "object") {
    return json.csvBundle;
  }
  return json as unknown as SimulationResult;
}
