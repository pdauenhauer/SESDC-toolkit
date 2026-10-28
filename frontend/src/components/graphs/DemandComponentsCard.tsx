import { useMemo, useState } from "preact/hooks";
import type { Load } from "../../database/models/load";
import { getLoadLabelById, LOAD_LABELS } from "../../data/loadLabels";
import { f1, f2, hourLabel, sum } from "../../utils/format";
import { Segmented } from "../ui";
import { StackedChart } from "../workbench/SchemaBreakdown";
import { effectiveProfile, isNestable, totalProfile, zeros } from "../workbench/model";
import "../../css/workbench-v2.css";

/** Validated categorical order (same as the Schema breakdown); a 9th group folds into "Other". */
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const OTHER = "#A3A7AD";
const STANDALONE = "__standalone";

type GroupBy = "enduse" | "facility" | "tag" | "load";
type Group = { id: string; name: string; color: string; profile: number[]; note?: string };

/** A single appliance-level load, with the facility it belongs to. */
type Leaf = { id: string; name: string; endUse: string; facilityId: string; profile: number[] };

const clean24 = (p: unknown): number[] => (Array.isArray(p) && p.length === 24 ? p.map((v) => Number(v) || 0) : zeros());
const endUseName = (labelId: string) => getLoadLabelById(labelId)?.name ?? "Other Appliance";
const endUseOrder = (name: string) => {
  const i = LOAD_LABELS.findIndex((l) => l.name === name);
  return i < 0 ? LOAD_LABELS.length : i;
};

function leaves(loads: Load[]): Leaf[] {
  const out: Leaf[] = [];
  for (const l of loads) {
    if (isNestable(l)) {
      const own = clean24(l.profile);
      if (sum(own) > 0) out.push({ id: `${l.id}-shared`, name: `${l.name} · shared`, endUse: "Shared (no appliance)", facilityId: l.id, profile: own });
      for (const c of l.children ?? []) out.push({ id: c.id, name: c.name, endUse: endUseName(c.labelId), facilityId: l.id, profile: effectiveProfile(c) });
    } else {
      out.push({ id: l.id, name: l.name, endUse: endUseName(l.labelId), facilityId: STANDALONE, profile: effectiveProfile(l) });
    }
  }
  return out;
}

function addInto(map: Map<string, Group>, id: string, name: string, profile: number[], scale = 1) {
  const g = map.get(id) ?? { id, name, color: "", profile: zeros() };
  profile.forEach((v, h) => (g.profile[h] += v * scale));
  map.set(id, g);
}

/** Colors follow each group's fixed position (schema / label order), not its size. */
function colorize(groups: Group[]): Group[] {
  const live = groups.filter((g) => sum(g.profile) > 0);
  if (live.length <= SERIES.length) return live.map((g, i) => ({ ...g, color: SERIES[i] }));
  const kept = live.slice(0, SERIES.length - 1).map((g, i) => ({ ...g, color: SERIES[i] }));
  const rest = live.slice(SERIES.length - 1);
  const other = zeros();
  rest.forEach((g) => g.profile.forEach((v, h) => (other[h] += v)));
  return [...kept, { id: "__other", name: `${rest.length} more`, color: OTHER, profile: other, note: rest.map((g) => g.name).join(", ") }];
}

function buildGroups(loads: Load[], scope: string, by: GroupBy): Group[] {
  const all = leaves(loads);
  const items = scope === "all" ? all : all.filter((l) => l.facilityId === scope);
  const map = new Map<string, Group>();

  if (by === "enduse") {
    items.forEach((l) => addInto(map, l.endUse, l.endUse, l.profile));
    return colorize([...map.values()].sort((a, b) => endUseOrder(a.name) - endUseOrder(b.name)));
  }
  if (by === "load") {
    items.forEach((l) => addInto(map, l.id, l.name, l.profile));
    return colorize([...map.values()]);
  }
  if (by === "facility") {
    for (const l of loads) {
      if (isNestable(l)) addInto(map, l.id, l.name, effectiveProfile(l));
    }
    items.filter((l) => l.facilityId === STANDALONE).forEach((l) => addInto(map, STANDALONE, "Standalone loads", l.profile));
    return colorize([...map.values()]);
  }
  // by tag: a facility with several tags is split evenly between them, so the stack still adds up.
  for (const l of loads) {
    const tags = (l.tags ?? []).filter(Boolean);
    const profile = effectiveProfile(l);
    if (!tags.length) {
      addInto(map, "__untagged", "Untagged", profile);
      continue;
    }
    for (const t of tags) addInto(map, t.toLowerCase(), t, profile, 1 / tags.length);
  }
  const untagged = map.get("__untagged");
  map.delete("__untagged");
  return colorize([...map.values(), ...(untagged ? [untagged] : [])]);
}

const peakHour = (p: number[]) => p.indexOf(Math.max(...p));

/**
 * Typical-day demand from the schema, split by end use (appliance type),
 * facility or tag, for the whole site or inside one facility.
 */
export default function DemandComponentsCard({ loads }: { loads: Load[] }) {
  const facilities = useMemo(() => loads.filter(isNestable), [loads]);
  const hasStandalone = useMemo(() => loads.some((l) => !isNestable(l)), [loads]);
  const [scope, setScope] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("enduse");

  // A deleted facility, or a facility-only grouping that no longer applies, falls back.
  const validScope = scope === "all" || scope === STANDALONE ? scope : facilities.some((f) => f.id === scope) ? scope : "all";
  const inFacility = validScope !== "all";
  const by: GroupBy = inFacility && (groupBy === "facility" || groupBy === "tag") ? "load" : !inFacility && groupBy === "load" ? "facility" : groupBy;

  const groups = useMemo(() => buildGroups(loads, validScope, by), [loads, validScope, by]);
  const total = useMemo(() => {
    const t = zeros();
    groups.forEach((g) => g.profile.forEach((v, h) => (t[h] += v)));
    return t;
  }, [groups]);
  const siteTotal = useMemo(() => sum(totalProfile(loads)), [loads]);
  const totalKwh = sum(total);
  const sysPeak = peakHour(total);
  const anyTags = loads.some((l) => l.tags?.length);
  const multiTag = by === "tag" && loads.some((l) => (l.tags?.length ?? 0) > 1);
  const scopeName = validScope === "all" ? "All facilities" : validScope === STANDALONE ? "Standalone loads" : facilities.find((f) => f.id === validScope)?.name;

  if (!loads.length || siteTotal <= 0) {
    return (
      <section class="mg-card mg-demand">
        <h2 class="mg-h3">Demand components</h2>
        <div class="mg-meta mg-faint">Add loads to the schema to see what makes up demand.</div>
      </section>
    );
  }

  return (
    <section class="mg-card mg-demand">
      <div class="mg-heat__head">
        <div class="mg-flows__title">
          <h2 class="mg-h3">Demand components</h2>
          <span class="mg-caption">
            Typical day from your schema · {scopeName} · {f1(totalKwh)} kWh/day
            {inFacility ? ` (${Math.round((totalKwh / siteTotal) * 100)}% of the site)` : ""} · same in every year
          </span>
        </div>
        <label class="mg-avgday__period">
          <span class="mg-caption">Show</span>
          <select
            class="mg-select mg-select--sm"
            aria-label="Facility to show"
            value={validScope}
            onChange={(e) => setScope((e.currentTarget as HTMLSelectElement).value)}
          >
            <option value="all">All facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            {hasStandalone && <option value={STANDALONE}>Standalone loads</option>}
          </select>
        </label>
        <Segmented<GroupBy>
          ariaLabel="Group demand by"
          value={by}
          onChange={setGroupBy}
          options={
            inFacility
              ? [
                  { id: "enduse", label: "End use" },
                  { id: "load", label: "Each load" },
                ]
              : [
                  { id: "enduse", label: "End use" },
                  { id: "facility", label: "Facility" },
                  { id: "tag", label: "Tag" },
                ]
          }
        />
      </div>

      {totalKwh <= 0 ? (
        <div class="mg-meta mg-faint">{scopeName} has no demand yet.</div>
      ) : (
        <>
          <StackedChart series={groups} total={total} />
          <div class="mg-bd-table" role="table" aria-label="Demand by component">
            <div class="mg-demand__row mg-bd-row--head" role="row">
              <span />
              <span>{by === "enduse" ? "End use" : by === "facility" ? "Facility" : by === "tag" ? "Tag" : "Load"}</span>
              <span class="mg-num">kWh / day</span>
              <span class="mg-num">Share</span>
              <span class="mg-num">Busiest hour</span>
              <span class="mg-num" title={`Contribution at the ${inFacility ? "facility" : "site"} peak (${hourLabel(sysPeak)})`}>
                At peak
              </span>
            </div>
            {groups.map((g) => {
              const kwh = sum(g.profile);
              const ph = peakHour(g.profile);
              return (
                <div key={g.id} class="mg-demand__row" role="row" title={g.note}>
                  <span class="mg-bd-swatch" style={{ background: g.color }} aria-hidden="true" />
                  <span class={`mg-bd-name${g.id === "__untagged" ? " mg-faint" : ""}`}>{g.name}</span>
                  <span class="mg-num mg-tnum">{f1(kwh)}</span>
                  <span class="mg-num mg-bd-share">
                    <span class="mg-bd-sharebar" aria-hidden="true">
                      <span style={{ width: `${(kwh / totalKwh) * 100}%`, background: g.color }} />
                    </span>
                    {Math.round((kwh / totalKwh) * 100)}%
                  </span>
                  <span class="mg-num mg-tnum">
                    {Math.max(...g.profile) - Math.min(...g.profile) < 1e-9 ? "All day" : hourLabel(ph)}{" "}
                    <span class="mg-faint">· {f2(g.profile[ph])} kW</span>
                  </span>
                  <span class="mg-num mg-tnum">{f2(g.profile[sysPeak])} kW</span>
                </div>
              );
            })}
          </div>
          {by === "tag" && !anyTags && <div class="mg-meta mg-faint">Edit a building to add tags such as Residential or Productive use.</div>}
          {multiTag && <div class="mg-caption">Buildings with several tags are split evenly between them, so the stack adds up to the real total.</div>}
        </>
      )}
    </section>
  );
}
