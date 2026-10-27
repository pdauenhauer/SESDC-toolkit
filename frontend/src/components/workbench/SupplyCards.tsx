import { useMemo, useState } from "preact/hooks";
import { CircleAlert } from "lucide-preact";
import type { Project } from "../../database/models/metadata";
import { f1, f2, hourLabel } from "../../utils/format";
import { SOURCE_IDS, SOURCE_META, SOURCE_OFF, STROKE, Switch, type SourceId } from "../ui";
import { sourceConfig, sourceDetail, typicalDayDispatch } from "./model";

type SupplyCardProps = {
  project: Project | null;
  onToggleSource: (id: SourceId, enabled: boolean) => void;
  onOpenSource: (id: SourceId) => void;
};

export function SupplyCard({ project, onToggleSource, onOpenSource }: SupplyCardProps) {
  const onCount = SOURCE_IDS.filter((id) => sourceConfig(project, id).enabled).length;
  return (
    <section class="mg-card mg-supply">
      <div class="mg-supply__head">
        <h2 class="mg-h2">Supply</h2>
        <span class="mg-meta">{onCount} of 4 on</span>
      </div>
      {SOURCE_IDS.map((id) => {
        const s = sourceConfig(project, id);
        const m = SOURCE_META[id];
        const on = !!s.enabled;
        return (
          <div key={id} class={`mg-supply__row${on ? "" : " is-off"}`} onClick={() => onOpenSource(id)}>
            <span class="mg-tile" style={{ background: on ? m.tileBg : SOURCE_OFF.tileBg, color: on ? m.tileFg : SOURCE_OFF.tileFg }}>
              <m.Icon size={18} strokeWidth={STROKE} />
            </span>
            <span class="mg-supply__text">
              <span class="mg-supply__name">{m.name}</span>
              <span class="mg-supply__detail">{sourceDetail(id, s)}</span>
            </span>
            <Switch checked={on} label={`Toggle ${m.name}`} onChange={(next) => onToggleSource(id, next)} />
          </div>
        );
      })}
    </section>
  );
}

type TypicalDayCardProps = { project: Project | null; load: number[] };

/**
 * Stack order (validated for colorblind separation: wind and battery must not
 * touch), with unmet on top. It's a composition, not the dispatch order: the
 * simulation uses the battery before the generator.
 */
const DAY_SERIES = [
  { key: "solar", label: "Solar", color: "var(--mg-solar)" },
  { key: "wind", label: "Wind", color: "var(--mg-wind)" },
  { key: "generator", label: "Generator", color: "var(--mg-diesel)" },
  { key: "battery", label: "Battery", color: "var(--mg-battery)" },
] as const;

export function TypicalDayCard({ project, load }: TypicalDayCardProps) {
  const d = useMemo(() => typicalDayDispatch(project, load), [project, load]);
  const [hover, setHover] = useState<number | null>(null);
  const { totals: t, hours } = d;
  const series = DAY_SERIES.filter((s) => d.enabled[s.key]);
  const peak = Math.max(...hours.load, 0.01);
  const pct = (v: number) => (t.load > 0 ? Math.round((v / t.load) * 100) : 0);

  const note = !t.load
    ? "Add loads to see how supply meets an average day."
    : t.unmet > 0.05
      ? `${f1(t.unmet)} kWh (${pct(t.unmet)}%) of demand goes unmet on an average day.`
      : t.generator > 0.05
        ? `All demand is met; the generator supplies ${pct(t.generator)}% of it.`
        : "All demand is met without the generator.";

  return (
    <section class="mg-card mg-day">
      <div class="mg-day__head">
        <span class="mg-meta">Typical day</span>
        <span class="mg-caption mg-faint" title="Clear-day solar curve, average wind, same dispatch order as the simulation">
          Estimate
        </span>
      </div>

      {t.load > 0 && (
        <div class="mg-day__chart" onMouseLeave={() => setHover(null)}>
          {hours.load.map((need, h) => (
            <div key={h} class={`mg-day__col${hover === h ? " is-hover" : ""}`} onMouseEnter={() => setHover(h)}>
              <div class="mg-day__bar" style={{ height: `${(need / peak) * 100}%` }}>
                {series.map((s) => (hours[s.key][h] > 0 ? <span key={s.key} style={{ flexGrow: hours[s.key][h], background: s.color }} /> : null))}
                {hours.unmet[h] > 0 && <span class="mg-day__unmet" style={{ flexGrow: hours.unmet[h] }} />}
              </div>
            </div>
          ))}
          {hover !== null && (
            <div class={`mg-day__tip${hover > 11 ? " is-left" : ""}`} style={{ left: `${((hover + 0.5) / 24) * 100}%` }}>
              <div class="mg-stack__tip-head">
                <span>{hourLabel(hover)}</span>
                <strong>{f2(hours.load[hover])} kW</strong>
              </div>
              {series
                .filter((s) => hours[s.key][hover] > 0)
                .map((s) => (
                  <div key={s.key} class="mg-stack__tip-row">
                    <i style={{ background: s.color }} />
                    <span>{s.label}</span>
                    <span class="mg-tnum">{f2(hours[s.key][hover])}</span>
                  </div>
                ))}
              {hours.unmet[hover] > 0 && (
                <div class="mg-stack__tip-row">
                  <i class="mg-day__unmet" />
                  <span>Unmet</span>
                  <span class="mg-tnum">{f2(hours.unmet[hover])}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div class="mg-day__rows">
        <div class="mg-day__row mg-day__row--total">
          <span />
          <span>Demand</span>
          <span class="mg-tnum">{f1(t.load)} kWh</span>
          <span />
        </div>
        {series.map((s) => (
          <div key={s.key} class="mg-day__row">
            <i style={{ background: s.color }} aria-hidden="true" />
            <span>{s.label}</span>
            <span class="mg-tnum">{f1(t[s.key])} kWh</span>
            <span class="mg-tnum mg-faint">{pct(t[s.key])}%</span>
          </div>
        ))}
        <div class={`mg-day__row${t.unmet > 0.05 ? " is-alert" : ""}`}>
          <i class="mg-day__unmet" aria-hidden="true" />
          <span>Unmet demand</span>
          <span class="mg-tnum">{f1(t.unmet)} kWh</span>
          <span class="mg-tnum">{pct(t.unmet)}%</span>
        </div>
      </div>
      <div class="mg-day__note">
        {t.unmet > 0.05 && <CircleAlert size={14} strokeWidth={STROKE} />}
        <span>
          {note}
          {t.excess > 0.05 ? ` ${f1(t.excess)} kWh of renewable energy can't be stored.` : ""}
        </span>
      </div>
    </section>
  );
}
