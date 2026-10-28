import { useState } from "preact/hooks";
import { f1, fEnergy } from "../../utils/format";
import type { NumericCsv } from "./parseNumericCsv";

/** Same stack order, colors and unmet hatch as the Average day card. */
const SERIES = [
  { key: "solar", label: "Solar", color: "var(--mg-solar)" },
  { key: "wind", label: "Wind", color: "var(--mg-wind)" },
  { key: "generator", label: "Generator", color: "var(--mg-diesel)" },
  { key: "battery", label: "Battery", color: "var(--mg-battery)" },
] as const;

type YearRow = { year: number; load: number; solar: number; wind: number; generator: number; battery: number; unmet: number; fuel: number; batteryKwh: number };

/**
 * Renewable energy that actually served load each year. The summary reports
 * total solar/wind output (including what was stored or curtailed), so subtract
 * the battery's charging share and curtailment, which together equal the
 * renewable surplus.
 */
function rows(summary: NumericCsv): YearRow[] {
  const c = summary.columns;
  return Array.from({ length: summary.rowCount }, (_, i) => {
    const load = c.load_kWh?.[i] ?? 0;
    const generator = c.diesel_kWh?.[i] ?? 0;
    const battery = c.battery_discharge_kWh?.[i] ?? 0;
    const unmet = c.unmet_kWh?.[i] ?? 0;
    const renewUsed = Math.max(0, load - generator - battery - unmet);
    const solarOut = c.solar_kWh?.[i] ?? 0;
    const windOut = c.wind_kWh?.[i] ?? 0;
    const out = solarOut + windOut;
    return {
      year: c.year?.[i] ?? i + 1,
      load,
      solar: out > 0 ? renewUsed * (solarOut / out) : 0,
      wind: out > 0 ? renewUsed * (windOut / out) : 0,
      generator,
      battery,
      unmet,
      fuel: c.fuel_liters?.[i] ?? 0,
      batteryKwh: c.battery_usable_kWh?.[i] ?? 0,
    };
  });
}

type Props = { summary: NumericCsv; year: number; onYear: (year: number) => void; loading: boolean };

export default function YearlyOverviewCard({ summary, year, onYear, loading }: Props) {
  const data = rows(summary);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const top = Math.max(...data.map((r) => r.load), 1);
  const shown = SERIES.filter((s) => data.some((r) => r[s.key] > 0.5));
  const first = data[0];
  const last = data[data.length - 1];
  const tip = hover !== null ? data[hover] : null;
  const pct = (v: number, of: number) => (of > 0 ? `${Math.round((v / of) * 100)}%` : "—");

  return (
    <section class="mg-card mg-years">
      <div class="mg-avgday__head">
        <div class="mg-flows__title">
          <h2 class="mg-h2">20-year overview</h2>
          <span class="mg-meta">
            Each year is simulated hour by hour with equipment wear and replacements · unmet demand{" "}
            {fEnergy(first.unmet)} in year 1 → {fEnergy(last.unmet)} in year {last.year}
          </span>
        </div>
        <span class="mg-caption">Click a year to show it in every chart</span>
      </div>

      <div class="mg-years__plot" onMouseLeave={() => setHover(null)} role="group" aria-label="Energy by year. Select a year to show it below.">
        {data.map((r, i) => (
          <button
            key={r.year}
            type="button"
            class={`mg-years__col${r.year === year ? " is-selected" : ""}${hover === i ? " is-hover" : ""}`}
            aria-label={`Year ${r.year}: ${f1(r.unmet)} kWh unmet`}
            aria-pressed={r.year === year}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onClick={() => onYear(r.year)}
          >
            <span class="mg-years__bar" style={{ height: `${(r.load / top) * 100}%` }}>
              {shown.map((s) => (r[s.key] > 0 ? <span key={s.key} style={{ flexGrow: r[s.key], background: s.color }} /> : null))}
              {r.unmet > 0 && <span class="mg-unmet-fill" style={{ flexGrow: r.unmet }} />}
            </span>
            <span class="mg-years__label">{r.year}</span>
          </button>
        ))}
        {tip && (
          <div class="mg-flows__tip" style={{ left: `${(((hover ?? 0) + 0.5) / data.length) * 100}%`, transform: (hover ?? 0) > data.length * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}>
            <div class="mg-flows__tip-date">
              Year {tip.year} · {fEnergy(tip.load)} demand
            </div>
            {shown.map((s) => (
              <div key={s.key} class="mg-flows__tip-row">
                <span class="mg-flows__tip-dot" style={{ background: s.color }} />
                <span class="mg-flows__tip-label">{s.label}</span>
                <span class="mg-flows__tip-value">{fEnergy(tip[s.key])}</span>
              </div>
            ))}
            <div class="mg-flows__tip-row">
              <span class="mg-flows__tip-dot mg-unmet-fill" />
              <span class="mg-flows__tip-label">Unmet</span>
              <span class="mg-flows__tip-value">{fEnergy(tip.unmet)}</span>
            </div>
          </div>
        )}
      </div>

      <div class="mg-years__foot">
        <div class="mg-years__legend" aria-hidden="true">
          {shown.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
          <span>
            <i class="mg-unmet-fill" />
            Unmet
          </span>
        </div>
        {loading && <span class="mg-caption">Loading year {year}…</span>}
        <button type="button" class="mg-pf-clear" aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}>
          {showTable ? "Hide table" : "Show table"}
        </button>
      </div>

      {showTable && (
        <div class="mg-years__table" role="table" aria-label="Energy by year">
          <div class="mg-years__row mg-years__row--head" role="row">
            <span>Year</span>
            <span>Demand</span>
            {shown.map((s) => (
              <span key={s.key}>{s.label}</span>
            ))}
            <span>Unmet</span>
            <span>Fuel</span>
            <span>Battery size</span>
          </div>
          {data.map((r) => (
            <div key={r.year} role="row" class={`mg-years__row${r.year === year ? " is-selected" : ""}`}>
              <span>{r.year}</span>
              <span>{f1(r.load)}</span>
              {shown.map((s) => (
                <span key={s.key}>{f1(r[s.key])}</span>
              ))}
              <span>
                {f1(r.unmet)} <span class="mg-faint">({pct(r.unmet, r.load)})</span>
              </span>
              <span>{f1(r.fuel)} L</span>
              <span>{r.batteryKwh ? `${f1(r.batteryKwh)} kWh` : "—"}</span>
            </div>
          ))}
          <div class="mg-caption">Energy in kWh per year.</div>
        </div>
      )}
    </section>
  );
}
