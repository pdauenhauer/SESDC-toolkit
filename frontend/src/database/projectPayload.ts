import type { ProjectData } from "../components/wizard/types";
import type { Project } from "./models/metadata";
import type { Load } from "./models/load";
import { createNewLoad } from "../utils/loadUtils";

/**
 * Single root load used as the canonical 24 h site demand for workbench +
 * simulation. `labelId` sets the load's type (defaults to the appliance
 * default); pass a nestable type (e.g. "business"/"building") so the site can
 * be broken down into child loads.
 */
export function hourlyProfileToSiteLoads(hourlyKw: number[], labelId?: string): Load[] {
  const load = createNewLoad("Site demand");
  if (labelId) load.labelId = labelId;
  load.profile = hourlyKw.map((v) => Math.max(0, Number(v) || 0));
  return [load];
}

/** Pick the site-demand container type from the wizard's usage pattern. */
function siteLoadLabelId(data: ProjectData): string {
  const pattern = data.loadProfiler?.usagePattern ?? data.loadProfiler?.pattern;
  // Residential → Building (home); commercial or unspecified → Business.
  return pattern === "residential" ? "building" : "business";
}

/** Fields written to Firestore when the wizard completes — no `wizardConfig` blob. */
export function projectPatchFromWizardData(data: ProjectData): Partial<Project> {
  const patch: Partial<Project> = {
    name: data.name,
    solar: data.solar,
    battery: data.battery,
    wind: data.wind,
    generator: data.generator,
    location: data.location,
    economics: data.economics,
    loads: hourlyProfileToSiteLoads(data.loads, siteLoadLabelId(data))
  };
  patch.loadProfiler = { ...data.loadProfiler };
  return patch;
}
