import type { Load } from "../../database/models/load";
import type { Project } from "../../database/models/metadata";
import type { SourceId } from "../ui";
import { getLoadLabelById } from "../../data/loadLabels";
import { INITIAL_PROJECT_DATA } from "../wizard/constants";
import { num, SOURCE_IDS } from "../ui";

export const zeros = (): number[] => Array(24).fill(0);

const clean24 = (p: unknown): number[] =>
  Array.isArray(p) && p.length === 24 ? p.map((v) => num(v)) : zeros();

export const isNestable = (l: Load): boolean => getLoadLabelById(l.labelId)?.canNest ?? false;

/** A load's 24h profile as it contributes to demand: own profile + its children's. */
export function effectiveProfile(l: Load): number[] {
  const own = clean24(l.profile);
  if (!l.children?.length) return own;
  return own.map((p, i) => p + l.children!.reduce((s, c) => s + num(c.profile?.[i]), 0));
}

export function totalProfile(loads: Load[]): number[] {
  const out = zeros();
  for (const l of loads) effectiveProfile(l).forEach((v, i) => (out[i] += v));
  return out;
}

/** Appliance-level count: children of groups, plus standalone loads. */
export function leafCount(loads: Load[]): number {
  return loads.reduce((s, l) => s + (isNestable(l) ? l.children?.length ?? 0 : 1), 0);
}

export function removeLoad(loads: Load[], id: string): Load[] {
  return loads
    .filter((l) => l.id !== id)
    .map((l) => (l.children?.some((c) => c.id === id) ? { ...l, children: l.children.filter((c) => c.id !== id) } : l));
}

export function addChildLoad(loads: Load[], parentId: string, child: Load): Load[] {
  return loads.map((l) => (l.id === parentId ? { ...l, children: [...(l.children ?? []), child] } : l));
}

/** Find a load and its parent (one level of nesting). */
export function findWithParent(loads: Load[], id: string): { load: Load | null; parent: Load | null } {
  for (const l of loads) {
    if (l.id === id) return { load: l, parent: null };
    for (const c of l.children ?? []) if (c.id === id) return { load: c, parent: l };
  }
  return { load: null, parent: null };
}

/**
 * Apply a profiler save. Keeps the load in place when its parent is unchanged;
 * otherwise moves it ("none" = top level / Standalone). `newParentId`
 * undefined means "don't reparent" (used for buildings, which stay top-level).
 */
export function saveLoadEdit(
  loads: Load[],
  id: string,
  patch: Pick<Load, "name" | "labelId" | "profile"> & Pick<Partial<Load>, "tags">,
  newParentId?: string
): Load[] {
  const { load, parent } = findWithParent(loads, id);
  if (!load) return loads;
  const updated: Load = { ...load, ...patch };
  if (patch.tags && !patch.tags.length) delete updated.tags;
  const currentParentId = parent ? parent.id : "none";
  if (newParentId === undefined || newParentId === currentParentId) {
    return loads.map((l) => {
      if (l.id === id) return updated;
      if (l.children?.some((c) => c.id === id)) return { ...l, children: l.children.map((c) => (c.id === id ? updated : c)) };
      return l;
    });
  }
  const without = removeLoad(loads, id);
  return newParentId === "none" ? [...without, updated] : addChildLoad(without, newParentId, updated);
}

/** Every tag used on any load, in first-seen order (case-insensitive dedupe). */
export function projectTags(loads: Load[]): string[] {
  const out: string[] = [];
  const visit = (l: Load) => {
    for (const t of l.tags ?? []) if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    l.children?.forEach(visit);
  };
  loads.forEach(visit);
  return out;
}

/* ---------- Supply ---------- */

type AnySource = { enabled?: boolean } & Record<string, unknown>;

/** Source config from the project, falling back to wizard defaults. */
export function sourceConfig(project: Project | null, id: SourceId): AnySource {
  const fallback = INITIAL_PROJECT_DATA[id] as unknown as AnySource;
  const saved = (project?.[id] as AnySource | undefined) ?? undefined;
  return saved ? { ...fallback, ...saved } : fallback;
}

export function sourceDetail(id: SourceId, s: AnySource): string {
  if (!s.enabled) return "Off";
  if (id === "solar") return `${num(s.sizeKw)} kW array`;
  if (id === "battery") return `${num(s.storageKwh)} kWh · ${String(s.type ?? "Lithium-Ion")}`;
  if (id === "wind") return num(s.nameplateKw) ? `${num(s.nameplateKw)} kW nameplate` : "Not sized yet";
  return `${num(s.capacityKw)} kW diesel`;
}

/** Generator output after engine/alternator/transmission/converter losses (matches backend `diesel_losses`). */
const GENERATOR_DERATE = 0.85 * 0.9 * 0.95 * 0.98;
/** Clear-day solar shape, 06:00–18:00, normalized to sum to 1. */
const SOLAR_SHAPE = (() => {
  const raw = Array.from({ length: 24 }, (_, h) => Math.max(0, Math.sin((Math.PI * (h - 6)) / 12)));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
})();

export type DayDispatch = {
  /** Per-hour kW, 24 values each. Supply series are what actually served the load. */
  hours: { load: number[]; solar: number[]; wind: number[]; generator: number[]; battery: number[]; unmet: number[] };
  /** Daily kWh. `excess` is renewable energy the battery couldn't store. */
  totals: { load: number; solar: number; wind: number; generator: number; battery: number; unmet: number; excess: number };
  enabled: Record<SourceId, boolean>;
};

/**
 * Rough average-day dispatch, mirroring the backend's `dispatch_year` order:
 * renewables first, then the battery (min state of charge 10% lithium-ion /
 * 50% lead-acid; charge and discharge both limited by its kW rate), then the
 * generator (up to its derated capacity), and whatever is left is unmet.
 * Solar uses a clear-day curve sized to kW × 4.6 sun-hours × 0.86; wind is flat
 * at nameplate × 6 kWh/day. The battery is cycled for a few days so the result
 * reflects steady state.
 *
 * Keep in sync with functions/calculations.py (docs/decisions/0003-backend-owns-dispatch.md).
 */
export function typicalDayDispatch(project: Project | null, load: number[]): DayDispatch {
  const cfg = (id: SourceId) => sourceConfig(project, id);
  const enabled = Object.fromEntries(SOURCE_IDS.map((id) => [id, !!cfg(id).enabled])) as Record<SourceId, boolean>;
  const solarDay = enabled.solar ? num(cfg("solar").sizeKw) * 4.6 * 0.86 : 0;
  const windHour = enabled.wind ? (num(cfg("wind").nameplateKw) * 6) / 24 : 0;
  const genMax = enabled.generator ? num(cfg("generator").capacityKw) * GENERATOR_DERATE : 0;
  const bat = cfg("battery");
  const maxSoc = enabled.battery ? num(bat.storageKwh) : 0;
  const minSoc = maxSoc * (/lead/i.test(String(bat.type ?? "")) ? 0.5 : 0.1);
  const rate = num(bat.chargeKw);

  const z = () => Array(24).fill(0) as number[];
  let soc = minSoc;
  let out = { solar: z(), wind: z(), generator: z(), battery: z(), unmet: z(), excess: z() };
  for (let day = 0; day < 4; day++) {
    out = { solar: z(), wind: z(), generator: z(), battery: z(), unmet: z(), excess: z() };
    for (let h = 0; h < 24; h++) {
      const need = Math.max(0, num(load[h]));
      const solar = solarDay * SOLAR_SHAPE[h];
      const renew = solar + windHour;
      const direct = Math.min(need, renew);
      out.solar[h] = renew > 0 ? direct * (solar / renew) : 0;
      out.wind[h] = renew > 0 ? direct * (windHour / renew) : 0;
      let deficit = need - direct;
      const surplus = renew - direct;
      if (surplus > 0) {
        const stored = maxSoc > 0 ? Math.max(0, Math.min(surplus, rate, maxSoc - soc)) : 0;
        soc += stored;
        out.excess[h] = surplus - stored;
      } else if (deficit > 0 && maxSoc > 0) {
        const drawn = Math.max(0, Math.min(deficit, rate, soc - minSoc));
        soc -= drawn;
        out.battery[h] = drawn;
        deficit -= drawn;
      }
      out.generator[h] = Math.min(deficit, genMax);
      deficit -= out.generator[h];
      out.unmet[h] = deficit;
    }
  }
  const tot = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const { excess, ...hours } = out;
  return {
    hours: { load: load.map((v) => Math.max(0, num(v))), ...hours },
    totals: {
      load: tot(load.map((v) => Math.max(0, num(v)))),
      solar: tot(out.solar),
      wind: tot(out.wind),
      generator: tot(out.generator),
      battery: tot(out.battery),
      unmet: tot(out.unmet),
      excess: tot(excess),
    },
    enabled,
  };
}

/* ---------- Misc ---------- */

/** "just now", "5 min ago", "3 days ago", or "Aug 12". Accepts a Firestore Timestamp. */
export function relativeTime(ts: unknown): string {
  const date =
    ts && typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate: unknown }).toDate === "function"
      ? (ts as { toDate: () => Date }).toDate()
      : null;
  if (!date) return "not saved yet";
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 28) return `${Math.round(days / 7)} week${days < 14 ? "" : "s"} ago`;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Up to two initials from a display name or email. */
export function initialsOf(nameOrEmail: string | null | undefined): string {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "?";
  const base = s.includes("@") ? s.split("@")[0] : s;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : base.slice(0, 2)).toUpperCase();
}
