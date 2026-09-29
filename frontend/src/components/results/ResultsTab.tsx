import { useMemo, useState } from "preact/hooks";
import { ChevronDown, ChevronRight, Download, Pencil } from "lucide-preact";
import type { Project } from "../../database/models/metadata";
import type { SimulationResult } from "../../services/simulation";
import { computeSimulationMetrics } from "../graphs/simulationMetrics";
import { parseNumericCsv, sumColumn } from "../graphs/parseNumericCsv";
import { fEnergy, fMoney } from "../../utils/format";
import { Button, SOURCE_IDS, STROKE, num } from "../ui";
import { sourceConfig } from "../workbench/model";
import "../../css/results.css";

/** Liters of diesel per kWh generated — matches functions/calculations.py DIESEL_LITERS_PER_KWH. */
const DIESEL_LITERS_PER_KWH = 0.3;
const WARN = "#B4513A";

const RAW_LABELS: Record<string, string> = {
  input_data: "Input data (NLR + load)",
  hourly_simulation: "Hourly simulation",
  daily_averages: "Daily averages",
  twenty_year_daily: "20-year daily load serviced",
  financial_expenses: "Financial expenses (20y)",
  revenue: "Revenue (20y)",
  solar_heatmap: "Solar heatmap (365 x 24)",
  monthly_heatmap: "Monthly heatmap (12 x 31)",
};

// Categories as the backend reports them in financial_expenses.csv.
const COST_CATEGORIES: { column: string; label: string }[] = [
  { column: "solar_expenses", label: "Solar" },
  { column: "battery_expenses", label: "Battery" },
  { column: "wind_expenses", label: "Wind" },
  { column: "generator_expenses", label: "Generator" },
  { column: "fuel_expenses", label: "Fuel" },
  { column: "fixed_expenses", label: "Labor, land & fees" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (v: number) => String(v).padStart(2, "0");
/** "28 Sep, 14:02" (day-first, 24-hour) per the design. Built by hand because
 *  some browsers' en-GB locale abbreviates September as "Sept". */
const formatSimulated = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

type ResultsTabProps = {
  result: SimulationResult;
  project: Project | null;
  /** When the result was produced in this session; null for stored results. */
  simulatedAt: Date | null;
  onEditInputs: () => void;
};

function downloadCsv(key: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `simulation_${key}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function ResultsTab({ result, project, simulatedAt, onEditInputs }: ResultsTabProps) {
  const [rawShown, setRawShown] = useState(false);
  const [rawOpen, setRawOpen] = useState<string | null>(null);

  const m = useMemo(() => computeSimulationMetrics(result), [result]);

  const batteryUsed = useMemo(() => {
    const csv = result["hourly_simulation"];
    return csv ? sumColumn(parseNumericCsv(csv).columns["battery_soc_kWh"]) > 0 : false;
  }, [result]);

  const costRows = useMemo(() => {
    const csv = result["financial_expenses"];
    if (!csv) return [];
    const fin = parseNumericCsv(csv);
    return COST_CATEGORIES.map((c) => ({ label: c.label, value: sumColumn(fin.columns[c.column]) })).filter((r) => r.value > 0);
  }, [result]);

  const rawRows = useMemo(
    () =>
      Object.entries(result)
        .filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length > 0)
        .map(([key, csv]) => ({ key, csv, label: RAW_LABELS[key] ?? key, rows: Math.max(0, csv.split(/\r?\n/).filter(Boolean).length - 1) })),
    [result]
  );

  if (!m) {
    return (
      <div class="mg-card mg-state">
        <div class="mg-state__title">No hourly results</div>
        <div>This simulation didn't return an hourly table. Try running it again.</div>
      </div>
    );
  }

  const gen = m.totalSolarKwh + m.totalWindKwh + m.totalDieselKwh;
  const renewPct = Math.round(m.renewableFraction * 100);
  const sources = [
    m.totalSolarKwh > 0 && "Solar",
    m.totalWindKwh > 0 && "Wind",
    batteryUsed && "Battery",
    m.totalDieselKwh > 0 && "Generator",
  ].filter(Boolean) as string[];

  const upfrontCapital =
    SOURCE_IDS.reduce((s, id) => {
      const c = sourceConfig(project, id);
      return s + (c.enabled ? num((c.costs as { capital?: unknown } | undefined)?.capital) : 0);
    }, 0) +
    num(project?.economics?.licensingCost) +
    num(project?.economics?.otherCapex);

  const kpis = [
    {
      label: "Demand met",
      value: `${(m.servedFraction * 100).toFixed(1)}%`,
      bar: m.servedFraction * 100,
      color: "var(--mg-accent)",
      hint: `${fEnergy(m.totalServicedKwh)} of ${fEnergy(m.totalLoadKwh)} served`,
      flag: m.servedFraction < 0.95 ? "Below 95%" : "",
    },
    {
      label: "Renewable share",
      value: `${renewPct}%`,
      bar: m.renewableFraction * 100,
      color: "var(--mg-solar)",
      hint: m.totalDieselKwh > 0 ? `Diesel supplies the other ${100 - renewPct}%` : "No diesel generation",
      flag: "",
    },
    {
      label: "Payback",
      value: m.paybackYear ? `Year ${m.paybackYear}` : "> 20 yrs",
      bar: m.paybackYear ? ((20 - m.paybackYear) / 20) * 100 : 0,
      color: "var(--mg-ink)",
      hint: `Net ${fMoney(m.netCashflow20y)} over 20 years`,
      flag: m.paybackYear ? "" : "No payback",
    },
  ];

  // Cost vs. revenue: cumulative series, one point per project year.
  const cost = m.cumulativeExpenses;
  const rev = m.cumulativeRevenue;
  const n = Math.max(cost.length, rev.length);
  const cvMax = Math.max(...cost, ...rev, 1) * 1.08;
  const xAt = (i: number) => (n > 1 ? (i / (n - 1)) * 1000 : 0);
  const pts = (s: number[]) => s.map((v, i) => `${xAt(i).toFixed(1)},${(220 - (v / cvMax) * 220).toFixed(1)}`).join(" ");
  const payX = m.paybackYear && n > 1 ? ((m.paybackYear - 1) / (n - 1)) * 100 : null;
  const yearTicks = [1, 5, 10, 15, 20].filter((y) => y <= n).map((y) => ({ y, left: n > 1 ? ((y - 1) / (n - 1)) * 100 : 0 }));

  const mix = [
    { label: "Solar", value: m.totalSolarKwh, color: "var(--mg-solar)" },
    { label: "Wind", value: m.totalWindKwh, color: "var(--mg-wind)" },
    { label: "Diesel", value: m.totalDieselKwh, color: "var(--mg-diesel)" },
  ].map((x) => ({ ...x, pct: gen > 0 ? (x.value / gen) * 100 : 0 }));

  const metricCols = [
    {
      title: "Energy · per year",
      rows: [
        { label: "Annual demand", value: fEnergy(m.totalLoadKwh) },
        { label: "Unmet load", value: fEnergy(m.totalUnservedKwh), color: m.totalUnservedKwh > m.totalLoadKwh * 0.01 ? WARN : undefined },
        { label: "Solar generation", value: fEnergy(m.totalSolarKwh) },
        { label: "Wind generation", value: fEnergy(m.totalWindKwh) },
        { label: "Diesel generation", value: fEnergy(m.totalDieselKwh) },
        { label: "Fuel used", value: `${Math.round(m.totalDieselKwh * DIESEL_LITERS_PER_KWH).toLocaleString("en")} L` },
      ],
    },
    {
      title: "Financial · 20 years",
      rows: [
        { label: "Total cost", value: fMoney(m.totalExpenses20y) },
        { label: "Revenue", value: fMoney(m.totalRevenue20y) },
        { label: "Net", value: fMoney(m.netCashflow20y), color: m.netCashflow20y < 0 ? WARN : "var(--mg-accent-ink)" },
        { label: "LCOE", value: m.lcoe != null ? `$${m.lcoe.toFixed(3)}/kWh` : "—" },
        { label: "Up-front capital", value: fMoney(upfrontCapital) },
      ],
    },
  ];
  const costMax = Math.max(...costRows.map((r) => r.value), 1);

  return (
    <div class="mg-results" data-screen-label="Results">
      <div class="mg-results-head">
        <div class="mg-results-head__title">
          <h1 class="mg-h1">Results</h1>
          <div class="mg-meta">
            {simulatedAt ? `Simulated ${formatSimulated(simulatedAt)}` : "Last saved simulation"} · one year, hourly ·{" "}
            {sources.join(", ") || "no generation"}
          </div>
        </div>
        <Button size="sm" icon={<Pencil size={16} strokeWidth={STROKE} />} onClick={onEditInputs}>
          Edit inputs
        </Button>
      </div>

      <div class="mg-kpis">
        {kpis.map((k) => (
          <div key={k.label} class="mg-card mg-kpi">
            <div class="mg-kpi__top">
              <span class="mg-meta">{k.label}</span>
              {k.flag && <span class="mg-pill-warn">{k.flag}</span>}
            </div>
            <div class="mg-kpi__value">{k.value}</div>
            <div class="mg-bar-track">
              <div class="mg-bar-fill" style={{ width: `${Math.max(0, Math.min(100, k.bar))}%`, background: k.color }} />
            </div>
            <div class="mg-caption">{k.hint}</div>
          </div>
        ))}
      </div>

      <div class="mg-row2">
        {n > 1 && (
          <section class="mg-card mg-panel mg-panel--cvr">
            <div class="mg-panel__head">
              <h2 class="mg-h3">Cost vs. revenue over 20 years</h2>
              <span class="mg-legend-item">
                <span class="mg-swatch" style={{ background: "var(--mg-ink)" }} />
                Cumulative cost
              </span>
              <span class="mg-legend-item">
                <span class="mg-swatch" style={{ background: "var(--mg-accent)" }} />
                Cumulative revenue
              </span>
            </div>
            <div class="mg-cvr">
              <div class="mg-cvr__y">
                <span>{fMoney(cvMax)}</span>
                <span>{fMoney(cvMax / 2)}</span>
                <span>$0</span>
              </div>
              <div class="mg-cvr__plot">
                <svg viewBox="0 0 1000 220" preserveAspectRatio="none" width="100%" height="220" role="img" aria-label="Cumulative cost versus revenue over 20 years">
                  <line x1="0" y1="0.5" x2="1000" y2="0.5" stroke="#EFEDE8" vector-effect="non-scaling-stroke" />
                  <line x1="0" y1="110" x2="1000" y2="110" stroke="#EFEDE8" vector-effect="non-scaling-stroke" />
                  <line x1="0" y1="219.5" x2="1000" y2="219.5" stroke="#DAD7D0" vector-effect="non-scaling-stroke" />
                  {rev.length > 1 && <polygon points={`0,220 ${pts(rev)} ${xAt(rev.length - 1)},220`} fill="#0E7C6B" fill-opacity="0.07" />}
                  <polyline points={pts(cost)} fill="none" stroke="#16181B" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                  <polyline points={pts(rev)} fill="none" stroke="#0E7C6B" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                </svg>
                {payX != null && (
                  <div class={`mg-cvr__payback${payX > 70 ? " is-late" : ""}`} style={{ left: `${payX}%` }}>
                    <span class="mg-cvr__pill">Pays back in year {m.paybackYear}</span>
                  </div>
                )}
              </div>
              <div />
              <div class="mg-cvr__x">
                {yearTicks.map((t) => (
                  <span key={t.y} style={{ left: `${t.left}%` }}>
                    {t.y === 1 ? "Year 1" : t.y}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <section class="mg-card mg-panel mg-panel--mix">
          <h2 class="mg-h3">Generation mix</h2>
          <div class="mg-mixbar">
            {mix.map((x) => (x.pct > 0 ? <div key={x.label} class="mg-mixbar__seg" title={x.label} style={{ width: `${x.pct}%`, background: x.color }} /> : null))}
          </div>
          <div class="mg-mix-rows">
            {mix.map((x) => (
              <div key={x.label} class="mg-mix-row">
                <span class="mg-swatch" style={{ background: x.color }} />
                <span class="mg-mix-row__label">{x.label}</span>
                <span class="mg-mix-row__value">{fEnergy(x.value)}</span>
                <span class="mg-mix-row__pct">{x.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div class="mg-row2 mg-row2--top">
        <section class="mg-card mg-panel mg-panel--metrics">
          <h2 class="mg-h3" style={{ marginBottom: "6px" }}>
            All metrics
          </h2>
          <div class="mg-metric-cols">
            {metricCols.map((col) => (
              <div key={col.title} class="mg-metric-col">
                <div class="mg-metric-col__title">{col.title}</div>
                {col.rows.map((r) => (
                  <div key={r.label} class="mg-metric-row">
                    <span class="mg-metric-row__label">{r.label}</span>
                    <span class="mg-metric-row__value" style={r.color ? { color: r.color } : undefined}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {costRows.length > 0 && (
          <section class="mg-card mg-panel mg-panel--costs">
            <h2 class="mg-h3">20-year cost breakdown</h2>
            {costRows.map((r) => (
              <div key={r.label} class="mg-cost-row">
                <div class="mg-cost-row__top">
                  <span class="mg-cost-row__label">{r.label}</span>
                  <span class="mg-cost-row__value">{fMoney(r.value)}</span>
                </div>
                <div class="mg-bar-track">
                  <div class="mg-bar-fill" style={{ width: `${(r.value / costMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <section class="mg-card mg-raw">
        <button type="button" class="mg-raw__toggle" aria-expanded={rawShown} onClick={() => setRawShown((s) => !s)}>
          <span class="mg-h3">Raw data</span>
          <span class="mg-meta">
            {rawRows.length} CSV table{rawRows.length === 1 ? "" : "s"}
          </span>
          <span class="mg-raw__chev">{rawShown ? <ChevronDown size={16} strokeWidth={STROKE} /> : <ChevronRight size={16} strokeWidth={STROKE} />}</span>
        </button>
        {rawShown && (
          <div class="mg-raw__list">
            {rawRows.map((r) => {
              const open = rawOpen === r.key;
              return (
                <div key={r.key}>
                  <div class="mg-raw__row">
                    <button type="button" class="mg-raw__name" aria-expanded={open} onClick={() => setRawOpen(open ? null : r.key)}>
                      <span class="mg-raw__name-chev">
                        {open ? <ChevronDown size={14} strokeWidth={STROKE} /> : <ChevronRight size={14} strokeWidth={STROKE} />}
                      </span>
                      <span>{r.label}</span>
                    </button>
                    <span class="mg-raw__rows">{r.rows.toLocaleString("en")} rows</span>
                    <button type="button" class="mg-raw__dl" aria-label={`Download ${r.label} CSV`} title="Download CSV" onClick={() => downloadCsv(r.key, r.csv)}>
                      <Download size={14} strokeWidth={STROKE} />
                      <span>CSV</span>
                    </button>
                  </div>
                  {open && <pre class="mg-raw__preview mg-mono">{r.csv.split(/\r?\n/).slice(0, 12).join("\n")}</pre>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
