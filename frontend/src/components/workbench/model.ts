import type { Load } from "../../database/models/load";
import type { Project } from "../../database/models/metadata";
import type { SourceId } from "../ui";
import { getLoadLabelById } from "../../data/loadLabels";
import { INITIAL_PROJECT_DATA } from "../wizard/constants";
import { num } from "../ui";

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
  patch: Pick<Load, "name" | "labelId" | "profile">,
  newParentId?: string
): Load[] {
  const { load, parent } = findWithParent(loads, id);
  if (!load) return loads;
  const updated: Load = { ...load, ...patch };
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

/** Rough renewable energy on an average day (kWh): solar kW × 4.6 × 0.86 + wind kW × 6. */
export function renewableDayKwh(project: Project | null): number {
  const solar = sourceConfig(project, "solar");
  const wind = sourceConfig(project, "wind");
  return (solar.enabled ? num(solar.sizeKw) * 4.6 * 0.86 : 0) + (wind.enabled ? num(wind.nameplateKw) * 6 : 0);
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
