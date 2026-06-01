import type { Load } from "../database/models/load";
import { defaultProfile } from "../database/models/load";
import { getDefaultLabelId } from "../data/loadLabels";

export function createNewLoad(name?: string): Load {
  return {
    id: crypto.randomUUID(),
    name: name ?? "New Load",
    labelId: getDefaultLabelId(),
    profile: defaultProfile(),
  };
}

function cloneLoad(load: Load): Load {
  return {
    ...load,
    profile: [...load.profile],
    children: load.children?.map(cloneLoad),
  };
}

function updateInList(list: Load[], id: string, patch: Partial<Load> | null): Load[] {
  const out: Load[] = [];
  for (const load of list) {
    if (load.id === id) {
      if (patch === null) continue; // remove
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

export function combined24hProfile(loads: Load[]): number[] {
  const out = Array.from({ length: 24 }, () => 0);
  function add(list: Load[]) {
    for (const load of list) {
      const p = load.profile ?? [];
      for (let h = 0; h < 24 && h < p.length; h++) out[h] += p[h];
      if (load.children?.length) add(load.children);
    }
  }
  add(loads);
  return out;
}
