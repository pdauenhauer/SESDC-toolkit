import { useMemo, useState } from "preact/hooks";
import { f1, f2, hourLabel, sum } from "../../utils/format";
import { averageDayProfile, type ParsedView } from "./timeseries";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Period = { id: string; label: string; months: number[] | null };
const PERIODS: Period[] = [
  { id: "all", label: "Full year", months: null },
  { id: "summer", label: "Jun–Aug", months: [5, 6, 7] },
  { id: "winter", label: "Dec–Feb", months: [11, 0, 1] },
  ...MONTHS.map((m, i) => ({ id: `m${i}`, label: m, months: [i] })),
];

/**
 * Stack order (validated for colorblind separation: wind and battery must not
 * touch). It's a composition, not the dispatch order: the simulation uses the
 * battery before the generator.
 */
const SERIES = [
  { key: "solar", label: "Solar", color: "var(--mg-solar)" },
  { key: "wind", label: "Wind", color: "var(--mg-wind)" },
  { key: "generator", label: "Generator", color: "var(--mg-diesel)" },
  { key: "battery", label: "Battery", color: "var(--mg-battery)" },
] as const;

/** "Nice" axis maximum just above the peak, with an even midpoint (e.g. 12 → 6, 15 → 7.5). */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= v * 1.05) ?? 10) * p;
}

const dayTotals = (p: ReturnType<typeof averageDayProfile>) => ({
  load: sum(p.load),
  solar: sum(p.solar),
  wind: sum(p.wind),
  generator: sum(p.generator),
  battery: sum(p.battery),
  unmet: sum(p.unmet),
});

/** Signed change in kWh/day vs year 1, e.g. "+1.2" / "−0.4" / "0". */
function delta(now: number, then: number): string {
  const d = now - then;
  if (Math.abs(d) < 0.05) return "0";
  return `${d > 0 ? "+" : "−"}${f1(Math.abs(d))}`;
}

type Props = {
  parsed: ParsedView;
  year: number;
  /** Year-1 hourly data, to compare against when a later year is shown. */
  baseline: ParsedView | null;
};

export default function DailyProfileCard({ parsed, year, baseline }: Props) {
  const [periodId, setPeriodId] = useState("all");
  const [hover, setHover] = useState<number | null>(null);
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[0];
  const prof = useMemo(() => averageDayProfile(parsed, period.months), [parsed, period]);
  const base = useMemo(() => (baseline ? dayTotals(averageDayProfile(baseline, period.months)) : null), [baseline, period]);

  const totals = dayTotals(prof);
  const shown = SERIES.filter((s) => totals[s.key] > 0.005 || (base && base[s.key] > 0.005));
  const top = niceMax(Math.max(...prof.load, 0));
  const pct = (v: number) => (totals.load > 0 ? `${Math.round((v / totals.load) * 100)}%` : "—");

  return (
    <section class="mg-card mg-avgday">
      <div class="mg-avgday__head">
        <div class="mg-flows__title">
          <h2 class="mg-h3">Average day · Year {year}</h2>
          <span class="mg-caption">
            What met demand each hour · {period.label}, averaged over {prof.days} days
          </span>
        </div>
        <label class="mg-avgday__period">
          <span class="mg-caption">Period</span>
          <select class="mg-select mg-select--sm" value={periodId} onChange={(e) => setPeriodId((e.currentTarget as HTMLSelectElement).value)}>
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id} selected={p.id === periodId}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div class="mg-avgday__body">
        <div class="mg-avgday__plotwrap">
          <div class="mg-avgday__y" aria-hidden="true">
            <span>{f1(top)} kW</span>
            <span>{f1(top / 2)}</span>
            <span>0</span>
          </div>
          <div class="mg-avgday__plot" onMouseLeave={() => setHover(null)}>
            <div class="mg-avgday__grid" aria-hidden="true" />
            {prof.load.map((load, h) => (
              <div key={h} class={`mg-avgday__col${hover === h ? " is-hover" : ""}`} onMouseEnter={() => setHover(h)}>
                <div class="mg-avgday__bar" style={{ height: `${(load / top) * 100}%` }}>
                  {shown.map((s) => (prof[s.key][h] > 0 ? <span key={s.key} style={{ flexGrow: prof[s.key][h], background: s.color }} /> : null))}
                  {prof.unmet[h] > 0 && <span class="mg-unmet-fill" style={{ flexGrow: prof.unmet[h] }} />}
                </div>
              </div>
            ))}
            {hover !== null && (
              <div class="mg-flows__tip" style={{ left: `${((hover + 0.5) / 24) * 100}%`, transform: hover > 13 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}>
                <div class="mg-flows__tip-date">
                  {hourLabel(hover)} · {f2(prof.load[hover])} kW demand
                </div>
                {shown.map((s) => (
                  <div key={s.key} class="mg-flows__tip-row">
                    <span class="mg-flows__tip-dot" style={{ background: s.color }} />
                    <span class="mg-flows__tip-label">{s.label}</span>
                    <span class="mg-flows__tip-value">{f2(prof[s.key][hover])} kW</span>
                  </div>
                ))}
                {prof.unmet[hover] > 0.005 && (
                  <div class="mg-flows__tip-row">
                    <span class="mg-flows__tip-dot mg-unmet-fill" />
                    <span class="mg-flows__tip-label">Unmet</span>
                    <span class="mg-flows__tip-value">{f2(prof.unmet[hover])} kW</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <span />
          <div class="mg-heat__hours">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        <div class={`mg-avgday__legend${base ? " is-compare" : ""}`} role="table" aria-label="Average daily energy by source">
          {base && (
            <div class="mg-avgday__row mg-avgday__row--head" role="row">
              <span />
              <span />
              <span>kWh / day</span>
              <span>Share</span>
              <span>vs year 1</span>
            </div>
          )}
          <div class="mg-avgday__row mg-avgday__row--total" role="row">
            <span />
            <span>Demand</span>
            <span class="mg-tnum">{f1(totals.load)} kWh</span>
            <span />
            {base && <span class="mg-tnum mg-delta">{delta(totals.load, base.load)}</span>}
          </div>
          {shown.map((s) => (
            <div key={s.key} class="mg-avgday__row" role="row">
              <i style={{ background: s.color }} aria-hidden="true" />
              <span>{s.label}</span>
              <span class="mg-tnum">{f1(totals[s.key])} kWh</span>
              <span class="mg-tnum mg-faint">{pct(totals[s.key])}</span>
              {base && <span class="mg-tnum mg-delta">{delta(totals[s.key], base[s.key])}</span>}
            </div>
          ))}
          <div class={`mg-avgday__row${totals.unmet > 0.05 ? " is-alert" : ""}`} role="row">
            <i class="mg-unmet-fill" aria-hidden="true" />
            <span>Unmet demand</span>
            <span class="mg-tnum">{f1(totals.unmet)} kWh</span>
            <span class="mg-tnum">{pct(totals.unmet)}</span>
            {base && <span class="mg-tnum mg-delta">{delta(totals.unmet, base.unmet)}</span>}
          </div>
          {base && <div class="mg-caption">Change in kWh per day compared with the same period in year 1.</div>}
        </div>
      </div>
    </section>
  );
}
