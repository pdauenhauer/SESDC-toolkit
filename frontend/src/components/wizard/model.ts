import type { LucideIcon } from "lucide-preact";
import { Activity, ClipboardCheck, Coins, MapPin } from "lucide-preact";
import type { ProjectData } from "./types";
import { INITIAL_PROJECT_DATA } from "./constants";
import type { BuildingSize, LoadPattern } from "../../utils/loadProfiler";
import { normalizeNumbers } from "../../utils/normalize";
import { sum } from "../../utils/format";
import { SOURCE_META, num, type SourceId } from "../ui";

type Dict = Record<string, any>;

/** Wizard state. Numeric fields may hold raw strings while typing. */
export type WizardData = {
  name: string;
  description: string;
  location: { latitude: string | number; longitude: string | number; name: string };
  pattern: LoadPattern | null;
  size: BuildingSize | null;
  /** Hourly load (kW), 24 values. */
  shape: number[];
  solar: Dict;
  battery: Dict;
  wind: Dict;
  generator: Dict;
  economics: Dict;
};

export type StepId = "project" | "demand" | SourceId | "economics" | "review";

export type StepDef = { id: StepId; label: string; title: string; sub: string; Icon: LucideIcon };

// Demand comes before sources so their sizes can be suggested.
export const STEPS: StepDef[] = [
  { id: "project", label: "Project", Icon: MapPin, title: "Name your project", sub: "Tell us what you are designing and where it will be built." },
  { id: "demand", label: "Demand", Icon: Activity, title: "How much power is needed?", sub: "Build a typical 24-hour load profile for the site." },
  { id: "solar", label: "Solar", Icon: SOURCE_META.solar.Icon, title: "Solar array", sub: "Size the panels and set expected losses." },
  { id: "battery", label: "Battery", Icon: SOURCE_META.battery.Icon, title: "Battery storage", sub: "Store daytime energy for evenings and cloudy days." },
  { id: "wind", label: "Wind", Icon: SOURCE_META.wind.Icon, title: "Wind turbines", sub: "Add turbines if the site has steady wind." },
  { id: "generator", label: "Generator", Icon: SOURCE_META.generator.Icon, title: "Diesel generator", sub: "Backup power when renewables and storage run short." },
  { id: "economics", label: "Economics", Icon: Coins, title: "Economic assumptions", sub: "These drive the 20-year financial model." },
  { id: "review", label: "Review", Icon: ClipboardCheck, title: "Review and create", sub: "Check the setup. Everything can be changed later on the workbench." },
];

export const TIPS: Record<StepId, string> = {
  project: "The site coordinates choose the solar and wind weather data used in the simulation. Use decimal degrees; you can copy them from any map app.",
  demand: "Residential loads peak in the evening; commercial loads peak during the day. Remember loads that run around the clock, such as fridges, standby devices and networking.",
  solar: "System size is the rated power of the panel array. Losses from wiring, dust, panel mismatch, aging and the inverter reduce real output. The presets fill in typical values.",
  battery: "Capacity is how much energy the battery stores (kWh). Charge rate is how fast it can charge or discharge (kW). Lithium-ion lasts about 10 years, lead-acid about 5.",
  wind: "Nameplate is the combined rated power of all turbines. A turbine starts turning at the cut-in speed, reaches full output at the rated speed and shuts down above cut-out.",
  generator: "The generator covers demand that solar, wind and the battery cannot. Fuel price drives most of its running cost over 20 years.",
  economics: "Energy price is what customers pay per kWh and sets revenue. Labor and land lease recur every year; licensing and other CAPEX are paid once up front.",
  review: "Creating the project saves these settings and opens the workbench, where you can add individual buildings and appliances and run the simulation.",
};

/** Capital cost rates used to auto-fill capital from size (same as the old wizard). */
export const COST_RATES = { solarStd: 1000, solarPrem: 1500, lithium: 400, lead: 150, wind: 1200, gen: 500 };

export function initWizardData(): WizardData {
  const base = JSON.parse(JSON.stringify(INITIAL_PROJECT_DATA)) as ProjectData;
  return {
    name: "",
    description: "",
    location: { latitude: base.location.latitude, longitude: base.location.longitude, name: "" },
    pattern: null,
    size: null,
    shape: Array(24).fill(0),
    // Design defaults: solar and battery included, wind and generator skipped.
    solar: { ...base.solar, enabled: true },
    battery: { ...base.battery, enabled: true },
    wind: { ...base.wind, enabled: false },
    generator: { ...base.generator, enabled: false },
    economics: { ...base.economics },
  };
}

export const effectiveLoads = (d: WizardData): number[] => d.shape.map((v) => Math.max(0, num(v)));

/** Suggested sizes: solar = daily kWh ÷ (4.6 × 0.86); battery = kWh used 18:00–06:00; generator = peak × 1.25. */
export function suggestions(loads: number[]) {
  const daily = sum(loads);
  const night = sum(loads.filter((_, h) => h >= 18 || h < 6));
  const peak = Math.max(...loads, 0);
  return {
    solar: daily ? Math.ceil((daily / (4.6 * 0.86)) * 2) / 2 : 0,
    battery: night ? Math.ceil(night) : 0,
    generator: peak ? Math.ceil(peak * 1.25) : 0,
  };
}

/** Rail / summary detail for a source. */
export function sourceSummary(id: SourceId, s: Dict): string {
  if (!s.enabled) return "Skipped";
  if (id === "solar") return `${num(s.sizeKw)} kW`;
  if (id === "battery") return `${num(s.storageKwh)} kWh`;
  if (id === "wind") return `${num(s.nameplateKw)} kW`;
  return `${num(s.capacityKw)} kW`;
}

export function upfrontCost(d: WizardData): number {
  const src = (["solar", "battery", "wind", "generator"] as SourceId[]).reduce((t, id) => t + (d[id].enabled ? num(d[id].costs?.capital) : 0), 0);
  return src + num(d.economics.licensingCost) + num(d.economics.otherCapex);
}

/** Rough renewable kWh on an average day: solar kW × 4.6 × 0.86 + wind kW × 6. */
export function renewableDayKwh(d: WizardData): number {
  return (d.solar.enabled ? num(d.solar.sizeKw) * 4.6 * 0.86 : 0) + (d.wind.enabled ? num(d.wind.nameplateKw) * 6 : 0);
}

/** Convert wizard state to the ProjectData shape persisted by projectPatchFromWizardData. */
export function toProjectData(d: WizardData): ProjectData {
  // Only the numeric sections are normalized: free-text fields like the name
  // must stay strings even when they look numeric (e.g. a project named "2024").
  return {
    name: d.name.trim(),
    solar: normalizeNumbers(d.solar),
    battery: normalizeNumbers(d.battery),
    wind: normalizeNumbers(d.wind),
    generator: normalizeNumbers(d.generator),
    location: { latitude: num(d.location.latitude), longitude: num(d.location.longitude), name: d.location.name.trim() },
    economics: normalizeNumbers(d.economics),
    loads: effectiveLoads(d),
    // Firestore rejects undefined values, so optional keys are only set when chosen.
    loadProfiler: {
      shape: d.shape.map((v) => num(v)),
      ...(d.pattern ? { usagePattern: d.pattern, pattern: d.pattern } : {}),
      ...(d.size ? { buildingSize: d.size } : {}),
    },
  } as ProjectData;
}
