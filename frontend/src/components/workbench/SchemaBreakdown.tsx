import { useMemo, useState } from "preact/hooks";
import { ChevronDown, ChevronRight } from "lucide-preact";
import type { Load } from "../../database/models/load";
import { getLoadLabelById } from "../../data/loadLabels";
import { f1, f2, hourLabel, sum } from "../../utils/format";
import { STROKE } from "../ui";
import { effectiveProfile, isNestable, totalProfile, zeros } from "./model";

/**
 * Categorical slots in fixed order (validated: CVD + normal-vision separation on white).
 * Contrast is below 3:1 for some slots, so the table below always names every series.
 */
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const OTHER = "#A3A7AD";
const MAX_SERIES = SERIES.length;

type Part = { id: string; name: string; type: string; profile: number[] };
type Series = { id: string; name: string; color: string; profile: number[]; parts: Part[]; isBuilding: boolean };

const clean24 = (p: unknown): number[] => (Array.isArray(p) && p.length === 24 ? p.map((v) => Number(v) || 0) : zeros());
const pct = (v: number, of: number) => (of > 0 ? `${Math.round((v / of) * 100)}%` : "—");
const typeName = (labelId: string) => getLoadLabelById(labelId)?.name ?? "Other Appliance";

function buildSeries(loads: Load[]): Series[] {
  const all = loads.map((l) => {
    const nest = isNestable(l);
    const parts: Part[] = [];
    if (nest) {
      const own = clean24(l.profile);
      if (sum(own) > 0) parts.push({ id: `${l.id}-shared`, name: "Shared load", type: "Not tied to an appliance", profile: own });
      for (const c of l.children ?? []) parts.push({ id: c.id, name: c.name, type: typeName(c.labelId), profile: effectiveProfile(c) });
    }
    return { id: l.id, name: l.name, color: "", profile: effectiveProfile(l), parts, isBuilding: nest };
  });
  // Colors follow the entity's position in the schema (not its rank), so they stay put as values change.
  if (all.length <= MAX_SERIES) return all.map((s, i) => ({ ...s, color: SERIES[i] }));
  const kept = all.slice(0, MAX_SERIES - 1).map((s, i) => ({ ...s, color: SERIES[i] }));
  const rest = all.slice(MAX_SERIES - 1);
  const other = zeros();
  rest.forEach((s) => s.profile.forEach((v, i) => (other[i] += v)));
  return [
    ...kept,
    {
      id: "__other",
      name: `${rest.length} more loads`,
      color: OTHER,
      profile: other,
      isBuilding: true,
      parts: rest.map((s) => ({ id: s.id, name: s.name, type: s.isBuilding ? "Building" : "Load", profile: s.profile })),
    },
  ];
}

function StackedChart({ series, total }: { series: Series[]; total: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(...total, 0);
  const scale = Math.max(0.5, Math.ceil(peak * 1.15 * 2) / 2);
  return (
    <div class="mg-stack">
      <div class="mg-stack__plot" onMouseLeave={() => setHover(null)}>
        <div class="mg-agg__top" />
        <span class="mg-agg__scale">{f1(scale)} kW</span>
        {total.map((t, h) => (
          <div
            key={h}
            class={`mg-stack__col${hover === h ? " is-hover" : ""}`}
            onMouseEnter={() => setHover(h)}
            aria-label={`${hourLabel(h)}: ${f2(t)} kW total`}
          >
            <div class="mg-stack__bar" style={{ height: `${(t / scale) * 100}%` }}>
              {series.map((s) =>
                s.profile[h] > 0 ? <span key={s.id} class="mg-stack__seg" style={{ flexGrow: s.profile[h], background: s.color }} /> : null
              )}
            </div>
          </div>
        ))}
        {hover !== null && (
          <div class={`mg-stack__tip${hover > 14 ? " is-left" : ""}`} style={{ left: `${((hover + 0.5) / 24) * 100}%` }}>
            <div class="mg-stack__tip-head">
              <span>{hourLabel(hover)}</span>
              <strong>{f2(total[hover])} kW</strong>
            </div>
            {series
              .filter((s) => s.profile[hover] > 0)
              .map((s) => (
                <div key={s.id} class="mg-stack__tip-row">
                  <i style={{ background: s.color }} />
                  <span>{s.name}</span>
                  <span class="mg-tnum">{f2(s.profile[hover])}</span>
                </div>
              ))}
          </div>
        )}
      </div>
      <div class="mg-agg__hours">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

export function SchemaBreakdown({ loads }: { loads: Load[] }) {
  const series = useMemo(() => buildSeries(loads), [loads]);
  const total = useMemo(() => totalProfile(loads), [loads]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const totalKwh = sum(total);
  const peakHour = total.indexOf(Math.max(...total, 0));

  const tagRows = useMemo(() => {
    const byTag = new Map<string, { name: string; kwh: number; count: number }>();
    let untagged = 0;
    let untaggedCount = 0;
    let overlaps = false;
    for (const l of loads) {
      const kwh = sum(effectiveProfile(l));
      const tags = l.tags ?? [];
      if (!tags.length) {
        untagged += kwh;
        untaggedCount++;
        continue;
      }
      if (tags.length > 1) overlaps = true;
      for (const t of tags) {
        const key = t.toLowerCase();
        const row = byTag.get(key) ?? { name: t, kwh: 0, count: 0 };
        row.kwh += kwh;
        row.count++;
        byTag.set(key, row);
      }
    }
    const rows = [...byTag.values()].sort((a, b) => b.kwh - a.kwh);
    if (untaggedCount) rows.push({ name: "Untagged", kwh: untagged, count: untaggedCount });
    return { rows, overlaps, anyTags: byTag.size > 0 };
  }, [loads]);

  return (
    <div class="mg-breakdown">
      <StackedChart series={series} total={total} />

      <div class="mg-bd-table" role="table" aria-label="How each load adds up to the total">
        <div class="mg-bd-row mg-bd-row--head" role="row">
          <span />
          <span>Load</span>
          <span class="mg-num">kWh / day</span>
          <span class="mg-num">Share</span>
          <span class="mg-num" title={`Contribution at the system peak (${hourLabel(Math.max(0, peakHour))})`}>
            At peak
          </span>
        </div>
        {series.map((s) => {
          const kwh = sum(s.profile);
          const expandable = s.parts.length > 0;
          const isOpen = !!open[s.id];
          return (
            <div key={s.id} role="rowgroup">
              <div
                class={`mg-bd-row mg-bd-row--series${expandable ? " is-expandable" : ""}`}
                role="row"
                onClick={() => expandable && setOpen((o) => ({ ...o, [s.id]: !isOpen }))}
              >
                <span class="mg-bd-swatch" style={{ background: s.color }} aria-hidden="true" />
                <span class="mg-bd-name">
                  <strong>{s.name}</strong>
                  {expandable && (
                    <span class="mg-bd-chev">{isOpen ? <ChevronDown size={14} strokeWidth={STROKE} /> : <ChevronRight size={14} strokeWidth={STROKE} />}</span>
                  )}
                  {loads.find((l) => l.id === s.id)?.tags?.map((t) => (
                    <span key={t} class="mg-tag mg-tag--static">
                      {t}
                    </span>
                  ))}
                </span>
                <span class="mg-num">{f1(kwh)}</span>
                <span class="mg-num mg-bd-share">
                  <span class="mg-bd-sharebar" aria-hidden="true">
                    <span style={{ width: totalKwh ? `${(kwh / totalKwh) * 100}%` : "0", background: s.color }} />
                  </span>
                  {pct(kwh, totalKwh)}
                </span>
                <span class="mg-num">{f2(s.profile[Math.max(0, peakHour)] ?? 0)} kW</span>
              </div>
              {isOpen &&
                s.parts.map((p) => {
                  const pk = sum(p.profile);
                  return (
                    <div key={p.id} class="mg-bd-row mg-bd-row--part" role="row">
                      <span />
                      <span class="mg-bd-name">
                        <span>{p.name}</span>
                        <span class="mg-caption">{p.type}</span>
                      </span>
                      <span class="mg-num">{f1(pk)}</span>
                      <span class="mg-num mg-faint" title={`Share of ${s.name}`}>
                        {pct(pk, kwh)} of {s.id === "__other" ? "group" : "building"}
                      </span>
                      <span class="mg-num">{f2(p.profile[Math.max(0, peakHour)] ?? 0)} kW</span>
                    </div>
                  );
                })}
            </div>
          );
        })}
        <div class="mg-bd-row mg-bd-row--total" role="row">
          <span />
          <span>Total demand</span>
          <span class="mg-num">{f1(totalKwh)}</span>
          <span class="mg-num">100%</span>
          <span class="mg-num">{f2(total[Math.max(0, peakHour)] ?? 0)} kW</span>
        </div>
      </div>

      <div class="mg-bd-tags">
        <div class="mg-bd-tags__head">
          <span class="mg-h3">By tag</span>
          {tagRows.overlaps && <span class="mg-caption">Buildings with several tags count toward each, so tags can add up to more than 100%.</span>}
        </div>
        {tagRows.anyTags ? (
          tagRows.rows.map((r) => (
            <div key={r.name} class="mg-bd-tagrow">
              <span class={r.name === "Untagged" ? "mg-faint" : ""}>{r.name}</span>
              <span class="mg-caption">
                {r.count} load{r.count === 1 ? "" : "s"}
              </span>
              <span class="mg-bd-sharebar mg-bd-sharebar--wide" aria-hidden="true">
                <span style={{ width: totalKwh ? `${Math.min(100, (r.kwh / totalKwh) * 100)}%` : "0" }} />
              </span>
              <span class="mg-num mg-tnum">{f1(r.kwh)} kWh</span>
              <span class="mg-num mg-tnum">{pct(r.kwh, totalKwh)}</span>
            </div>
          ))
        ) : (
          <div class="mg-meta mg-faint">Edit a building to add tags such as Residential or Productive use.</div>
        )}
      </div>
    </div>
  );
}
