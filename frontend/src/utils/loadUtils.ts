import type { Load, SeasonalProfiles } from "../database/models/load";
import { defaultSeasonalProfiles, SEASONS } from "../database/models/load";
import { getDefaultLabelId } from "../data/loadLabels";

export function createNewLoad(name?: string): Load {
  return {
    id: crypto.randomUUID(),
    name: name ?? "New Load",
    labelId: getDefaultLabelId(),
    seasonalProfiles: defaultSeasonalProfiles(),
  };
}

function cloneSeasonalProfiles(sp: SeasonalProfiles): SeasonalProfiles {
  return {
    spring: [...sp.spring],
    summer: [...sp.summer],
    fall: [...sp.fall],
    winter: [...sp.winter],
  };
}

function cloneLoad(load: Load): Load {
  return {
    ...load,
    seasonalProfiles: cloneSeasonalProfiles(load.seasonalProfiles),
    children: load.children?.map(cloneLoad),
  };
}

function updateInList(list: Load[], id: string, patch: Partial<Load> | null): Load[] {
  const out: Load[] = [];
  for (const load of list) {
    if (load.id === id) {
      if (patch === null) continue;
      out.push({ ...cloneLoad(load), ...patch });
    } else {
      out.push({
        ...cloneLoad(load),
        children: load.children ? updateInList(load.children, id, patch) : undefined,
      });
    }
  }
  return out;
}

function addChildToList(list: Load[], parentId: string, newLoad: Load): Load[] {
  return list.map((load) => {
    if (load.id !== parentId) {
      return {
        ...cloneLoad(load),
        children: load.children ? addChildToList(load.children, parentId, newLoad) : undefined,
      };
    }
    const children = [...(load.children ?? []), newLoad];
    return { ...cloneLoad(load), children };
  });
}

/** Update a load by id anywhere in the tree. Pass null as patch to remove. */
export function updateLoadInTree(roots: Load[], loadId: string, patch: Partial<Load> | null): Load[] {
  return updateInList(roots, loadId, patch);
}

/** Add a new load as child of parentId. */
export function addChildToLoad(roots: Load[], parentId: string, newLoad: Load): Load[] {
  return addChildToList(roots, parentId, newLoad);
}

/** Sum all load profiles per-season across the load tree. */
export function combinedSeasonalProfiles(loads: Load[]): SeasonalProfiles {
  const out = defaultSeasonalProfiles();
  function add(list: Load[]) {
    for (const load of list) {
      for (const season of SEASONS) {
        const p = load.seasonalProfiles?.[season] ?? [];
        for (let h = 0; h < 24 && h < p.length; h++) out[season][h] += p[h];
      }
      if (load.children?.length) add(load.children);
    }
  }
  add(loads);
  return out;
}

/** Backward-compat wrapper: returns the average across all 4 seasons. */
export function combined24hProfile(loads: Load[]): number[] {
  const seasonal = combinedSeasonalProfiles(loads);
  const out = Array.from({ length: 24 }, () => 0);
  for (const season of SEASONS) {
    for (let h = 0; h < 24; h++) out[h] += seasonal[season][h];
  }
  for (let h = 0; h < 24; h++) out[h] /= 4;
  return out;
}
