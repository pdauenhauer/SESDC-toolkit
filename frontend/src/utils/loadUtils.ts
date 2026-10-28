import type { Load } from "../database/models/load";
import { defaultProfile } from "../database/models/load";
import { getDefaultLabelId } from "../data/loadLabels";

// Tree edits (move/remove/add child) live in components/workbench/model.ts.

export function createNewLoad(name?: string): Load {
  return {
    id: crypto.randomUUID(),
    name: name ?? "New Load",
    labelId: getDefaultLabelId(),
    profile: defaultProfile(),
  };
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
