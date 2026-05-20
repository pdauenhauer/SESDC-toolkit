import type { ProjectData, LoadProfilerSettings } from "../components/ProjectWizard/types";
import type { Project } from "./models/metadata";
import type { Load } from "./models/load";
import { createNewLoad, combined24hProfile } from "../utils/loadUtils";

/** Single root load used as canonical24 h site demand for workbench + simulation. */
export function hourlyProfileToSiteLoads(hourlyKw: number[]): Load[] {
  const load = createNewLoad("Site demand");
  load.profile = hourlyKw.map((v) => Math.max(0, Number(v) || 0));
  return [load];
}

/** Fields written to Firestore when the wizard completes — no `wizardConfig` blob. */
export function projectPatchFromWizardData(data: ProjectData): Partial<Project> {
  const patch: Partial<Project> = {
    name: data.name,
    solar: data.solar,
    battery: data.battery,
    wind: data.wind,
    generator: data.generator,
    loads: hourlyProfileToSiteLoads(data.loads)
  };
  patch.loadProfiler = { baseLoadKw: 0, ...data.loadProfiler };
  return patch;
}

function hourlyFromLoadTree(loads: unknown): number[] | null {
  if (!Array.isArray(loads) || loads.length === 0) return null;
  try {
    const combined = combined24hProfile(loads as Load[]);
    if (combined.length === 24 && combined.some((n) => n > 0)) return combined;
  } catch {
    /* ignore */
  }
  return null;
}

/** Legacy: wizard stored a flat `ProjectData`-shaped object under `wizardConfig`. */
function legacyWizardConfig(p: Project): Partial<ProjectData> | null {
  const w = p.wizardConfig;
  if (!w || typeof w !== "object") return null;
  const o = w as Record<string, unknown>;
  if (typeof o.name !== "string" && !o.solar && !o.loads) return null;
  return w as Partial<ProjectData>;
}

/**
 * Build wizard initial state from a Firestore project (unified fields or legacy `wizardConfig`).
 */
export function projectToWizardInitialData(project: Project): Partial<ProjectData> {
  const legacy = legacyWizardConfig(project);
  const hourlyFromTree = hourlyFromLoadTree(project.loads as unknown);

  const loads =
    hourlyFromTree ??
    (Array.isArray(legacy?.loads) && (legacy!.loads as number[]).length === 24
      ? [...(legacy!.loads as number[])]
      : Array(24).fill(0));

  const loadProfiler: LoadProfilerSettings | undefined =
    (project.loadProfiler as LoadProfilerSettings | undefined) ?? legacy?.loadProfiler;

  return {
    name: typeof project.name === "string" ? project.name : legacy?.name ?? "",
    solar: (project.solar as ProjectData["solar"]) ?? legacy?.solar,
    battery: (project.battery as ProjectData["battery"]) ?? legacy?.battery,
    wind: (project.wind as ProjectData["wind"]) ?? legacy?.wind,
    generator: (project.generator as ProjectData["generator"]) ?? legacy?.generator,
    loads,
    loadProfiler
  };
}
