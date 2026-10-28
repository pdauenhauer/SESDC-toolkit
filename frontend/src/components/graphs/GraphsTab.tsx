import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Chart, ChartConfiguration } from "chart.js";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-preact";
import type { Load } from "../../database/models/load";
import type { SimulationResult } from "../../services/simulation";
import ChartCanvas from "../charts/ChartCanvas";
import { Button, IconButton, Segmented, STROKE } from "../ui";
import { f2 } from "../../utils/format";
import { parseDatetimeWideCsv } from "./parseDateTimeCsv";
import DailyProfileCard from "./DailyProfileCard";
import DemandComponentsCard from "./DemandComponentsCard";
import HeatmapCard, { RAMPS } from "./HeatmapCard";
import YearBar from "./YearBar";
import YearlyOverviewCard from "./YearlyOverviewCard";
import { parseNumericCsv } from "./parseNumericCsv";
import {
  WINDOW_DAYS,
  aggregateDaily,
  dateLabel,
  dayStarts,
  filterBySeason,
  isoDay,
  sliceDays,
  type ParsedView,
  type Resolution,
  type Season,
  type SliceWindow,
} from "./timeseries";
import "../../css/graphs-v2.css";

type SeriesDef = {
  key: string;
  column: string;
  label: string;
  color: string;
  width: number;
  dash: number[];
  axis: "y" | "y1";
};

// Series colors/dashes from the design token table.
const SERIES: SeriesDef[] = [
  { key: "load", column: "load_kW", label: "Load", color: "#16181B", width: 2, dash: [], axis: "y" },
  { key: "solar", column: "solar_kW", label: "Solar", color: "#E39B2D", width: 2, dash: [], axis: "y" },
  { key: "wind", column: "wind_kW", label: "Wind", color: "#4A7FB5", width: 2, dash: [], axis: "y" },
  { key: "diesel", column: "diesel_kW", label: "Diesel", color: "#B4513A", width: 1.75, dash: [], axis: "y" },
  { key: "soc", column: "battery_soc_kWh", label: "Battery charge", color: "#7B6FC4", width: 1.75, dash: [5, 4], axis: "y1" },
  { key: "unmet", column: "load_not_serviced_kW", label: "Unmet load", color: "#D64545", width: 2, dash: [2, 3], axis: "y" },
  { key: "served", column: "load_serviced_kW", label: "Served load", color: "#0E7C6B", width: 1.5, dash: [], axis: "y" },
  { key: "net", column: "net_energy_kW", label: "Net energy", color: "#A8ACB2", width: 1, dash: [], axis: "y" },
];
const DEFAULT_ON = new Set(["load", "solar", "diesel", "soc"]);
const AXIS = { color: "#9A9EA5", font: { size: 11, family: "Geist, system-ui, sans-serif" } };

type Hover = { index: number; px: number; top: number; bottom: number; width: number } | null;

function parseHourly(csv: string | null | undefined): ParsedView | null {
  if (!csv) return null;
  try {
    return parseDatetimeWideCsv(csv);
  } catch (e) {
    console.error("[GraphsTab] Failed to parse hourly simulation CSV", e);
    return null;
  }
}

type GraphsTabProps = {
  result: SimulationResult;
  /** Loads a later year's hourly table from the stored run (years 2–20 aren't in the bundle). */
  loadYear?: (year: number) => Promise<string | null>;
  /** The project's schema, for the demand components chart. */
  loads?: Load[];
  /** Battery size from the project config, used when the run doesn't report it per year. */
  batteryKwh?: number;
};

export default function GraphsTab({ result, loadYear, loads = [], batteryKwh }: GraphsTabProps) {
  const summaryCsv = result["yearly_summary"];
  const summary = useMemo(() => (summaryCsv ? parseNumericCsv(summaryCsv) : null), [summaryCsv]);
  const [year, setYear] = useState(1);
  const [cache, setCache] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  // The loader is recreated on every parent render, so keep the latest in a ref.
  const loadRef = useRef(loadYear);
  loadRef.current = loadYear;
  const pending = useRef<number | null>(null);

  // A new run invalidates the cached years.
  useEffect(() => {
    setCache({});
    setYear(1);
    setError(null);
  }, [result]);

  useEffect(() => {
    setError(null);
    if (year === 1 || cache[year] || pending.current === year) return;
    const load = loadRef.current;
    if (!load) return setError("Sign in to load other years.");
    pending.current = year;
    load(year)
      .then((csv) => {
        if (csv) setCache((c) => ({ ...c, [year]: csv }));
        else setError(`Year ${year} isn't stored for this run. Re-run the simulation to see it.`);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => {
        if (pending.current === year) pending.current = null;
      });
  }, [year, cache]);

  const baseline = useMemo(() => parseHourly(result["hourly_simulation"]), [result]);
  const yearCsv = year === 1 ? result["hourly_simulation"] : cache[year];
  const parsed = useMemo(() => (year === 1 ? baseline : parseHourly(yearCsv)), [year, yearCsv, baseline]);
  const loading = year !== 1 && !yearCsv && !error;
  // While another year loads (or fails), keep the last year on screen so chart
  // settings and the scroll position survive a year change.
  const shown = useRef<{ year: number; parsed: ParsedView; result: SimulationResult } | null>(null);
  if (shown.current?.result !== result) shown.current = null; // a new run
  if (parsed && !loading) shown.current = { year, parsed, result };
  const view = shown.current;

  if (!result["hourly_simulation"]) return <div class="mg-card mg-state">This simulation has no hourly table to chart.</div>;

  return (
    <div class="mg-graphs" data-screen-label="Graphs">
      <YearBar year={year} years={summary?.rowCount ?? 1} onYear={setYear} loading={loading} />
      {summary && summary.rowCount > 0 && <YearlyOverviewCard summary={summary} year={year} onYear={setYear} loading={loading} />}
      {error && <div class="mg-card mg-state">{error}</div>}
      {view ? (
        <div class={`mg-graphs__year${view.year !== year ? " is-stale" : ""}`} aria-busy={loading}>
          <YearCharts
            parsed={view.parsed}
            year={view.year}
            baseline={view.year === 1 ? null : baseline}
            loads={loads}
            batteryKwh={summary?.columns["battery_usable_kWh"]?.[view.year - 1] || batteryKwh || 0}
          />
        </div>
      ) : (
        !error && <div class="mg-state mg-state--loading">Loading year {year}…</div>
      )}
    </div>
  );
}

type BatteryView = "charge" | "dod";

type YearChartsProps = { parsed: ParsedView; year: number; baseline: ParsedView | null; loads: Load[]; batteryKwh: number };

function YearCharts({ parsed, year, baseline, loads, batteryKwh }: YearChartsProps) {
  const available = useMemo(() => SERIES.filter((s) => parsed?.names.includes(s.column)), [parsed]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(SERIES.map((s) => [s.key, DEFAULT_ON.has(s.key)])));
  const [season, setSeason] = useState<Season>("all");
  const [resolution, setResolution] = useState<Resolution>("daily");
  // Hourly mode shows one day or one week at a time, starting at day index `sliceDay`.
  const [win, setWin] = useState<SliceWindow>("week");
  const [sliceDay, setSliceDay] = useState(0);
  const [hover, setHover] = useState<Hover>(null);
  const [zoomed, setZoomed] = useState(false);
  const chartRef = useRef<Chart | null>(null);

  const starts = useMemo(() => (parsed ? dayStarts(parsed) : []), [parsed]);
  const span = WINDOW_DAYS[win];
  const lastStart = Math.max(0, starts.length - span);
  const startDay = Math.min(sliceDay, lastStart);

  const view = useMemo<ParsedView | null>(() => {
    if (!parsed) return null;
    return resolution === "daily" ? aggregateDaily(filterBySeason(parsed, season)) : sliceDays(parsed, starts, startDay, span);
  }, [parsed, season, resolution, starts, startDay, span]);

  const jumpTo = (iso: string) => {
    const idx = starts.findIndex((i) => parsed && isoDay(parsed.x[i]) === iso);
    if (idx >= 0) setSliceDay(Math.min(idx, lastStart));
  };

  const on = available.filter((s) => enabled[s.key]);
  const onKey = on.map((s) => s.key).join("|");

  const config = useMemo<ChartConfiguration | null>(() => {
    if (!view || !on.length) return null;
    const withHour = resolution === "hourly";
    const usesRight = on.some((s) => s.axis === "y1");
    return {
      type: "line",
      data: {
        labels: view.x.map((ts) => dateLabel(ts, withHour)),
        datasets: on.map((s) => ({
          label: s.label,
          data: view.columns[s.column] as number[],
          borderColor: s.color,
          backgroundColor: s.color,
          borderWidth: s.width,
          borderDash: s.dash,
          yAxisID: s.axis,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0,
          spanGaps: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        onHover: (_evt, elements, chart) => {
          const el = elements[0];
          if (!el) return setHover(null);
          const { top, bottom } = chart.chartArea;
          setHover({ index: el.index, px: chart.scales.x.getPixelForValue(el.index), top, bottom, width: chart.width });
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          zoom: {
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              drag: { enabled: true, backgroundColor: "rgba(14, 124, 107, 0.12)", borderColor: "#0E7C6B", borderWidth: 1 },
              mode: "x",
              onZoomComplete: () => setZoomed(true),
            },
            pan: { enabled: true, mode: "x", modifierKey: "shift", onPanComplete: () => setZoomed(true) },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: "#DAD7D0" },
            ticks: { ...AXIS, autoSkip: true, maxTicksLimit: 6, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            grid: { color: "#F1EFEB" },
            border: { display: false },
            ticks: { ...AXIS, maxTicksLimit: 5 },
            title: { display: true, text: "kW", ...AXIS },
          },
          ...(usesRight
            ? {
                y1: {
                  position: "right" as const,
                  beginAtZero: true,
                  grid: { drawOnChartArea: false },
                  border: { display: false },
                  ticks: { ...AXIS, maxTicksLimit: 5 },
                  title: { display: true, text: "kWh", ...AXIS },
                },
              }
            : {}),
        },
      },
    };
    // `on` is derived from onKey, so onKey stands in for it here.
  }, [view, onKey, resolution]);

  // A rebuilt chart starts un-zoomed with no hover.
  useEffect(() => {
    setZoomed(false);
    setHover(null);
  }, [config]);

  const [batteryView, setBatteryView] = useState<BatteryView>("charge");
  // Battery charge as a percentage of this year's usable capacity (falls back to the fullest it got).
  const batteryCap = useMemo(() => {
    const soc = parsed.columns["battery_soc_kWh"];
    if (batteryKwh > 0) return batteryKwh;
    return soc ? soc.reduce<number>((m, v) => Math.max(m, v ?? 0), 0) : 0;
  }, [parsed, batteryKwh]);
  const batteryPct = useMemo(() => {
    const soc = parsed.columns["battery_soc_kWh"];
    const cap = batteryCap;
    if (!soc || cap <= 0) return null;
    return soc.map((v) => {
      if (v == null) return null;
      const pct = Math.min(100, Math.max(0, (v / cap) * 100));
      return batteryView === "charge" ? pct : 100 - pct;
    });
  }, [parsed, batteryCap, batteryView]);

  if (!view || !view.x.length) return <div class="mg-state mg-state--loading">Preparing charts…</div>;

  const n = view.x.length;
  const range = `${dateLabel(view.x[0], false)} – ${dateLabel(view.x[n - 1], false)}`;
  const hoverIdx = hover && hover.index < n ? hover.index : null;

  return (
    <>
      <section class="mg-card mg-flows">
        <div class="mg-flows__head">
          <div class="mg-flows__title">
            <h2 class="mg-h2">Energy flows · Year {year}</h2>
            <span class="mg-meta">
              {range} · {n.toLocaleString("en")} {resolution === "daily" ? "daily averages" : "hourly points"}
            </span>
          </div>
          {zoomed && (
            <Button
              size="sm"
              variant="quiet"
              icon={<RotateCcw size={15} strokeWidth={STROKE} />}
              onClick={() => {
                // resetZoom() doesn't fire onZoomComplete, so clear the flag here.
                chartRef.current?.resetZoom();
                setZoomed(false);
              }}
            >
              Reset zoom
            </Button>
          )}
          {resolution === "daily" ? (
            <Segmented<Season>
              ariaLabel="Season"
              value={season}
              onChange={setSeason}
              options={[
                { id: "all", label: "Full year" },
                { id: "summer", label: "Jun–Aug" },
                { id: "winter", label: "Dec–Feb" },
              ]}
            />
          ) : (
            <div class="mg-slice" role="group" aria-label="Time window">
              <Segmented<SliceWindow>
                ariaLabel="Window length"
                value={win}
                onChange={setWin}
                options={[
                  { id: "day", label: "Day" },
                  { id: "week", label: "Week" },
                ]}
              />
              <IconButton label={`Previous ${win}`} disabled={startDay <= 0} onClick={() => setSliceDay(Math.max(0, startDay - span))}>
                <ChevronLeft size={16} strokeWidth={STROKE} />
              </IconButton>
              <input
                type="date"
                class="mg-slice__date"
                aria-label="Start date"
                value={parsed && starts.length ? isoDay(parsed.x[starts[startDay]]) : ""}
                min={parsed && starts.length ? isoDay(parsed.x[starts[0]]) : undefined}
                max={parsed && starts.length ? isoDay(parsed.x[starts[lastStart]]) : undefined}
                onChange={(e) => jumpTo((e.currentTarget as HTMLInputElement).value)}
              />
              <IconButton label={`Next ${win}`} disabled={startDay >= lastStart} onClick={() => setSliceDay(Math.min(lastStart, startDay + span))}>
                <ChevronRight size={16} strokeWidth={STROKE} />
              </IconButton>
            </div>
          )}
          <Segmented<Resolution>
            ariaLabel="Resolution"
            value={resolution}
            onChange={setResolution}
            options={[
              { id: "daily", label: "Daily" },
              { id: "hourly", label: "Hourly" },
            ]}
          />
        </div>

        <div class="mg-chips" role="group" aria-label="Signals">
          {available.map((s) => {
            const isOn = !!enabled[s.key];
            return (
              <button
                key={s.key}
                type="button"
                class={`mg-chip${isOn ? " is-on" : ""}`}
                aria-pressed={isOn}
                onClick={() => setEnabled((e) => ({ ...e, [s.key]: !e[s.key] }))}
              >
                <span class="mg-chip__dot" style={isOn ? { background: s.color } : undefined} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div class="mg-flows__chart" onMouseLeave={() => setHover(null)}>
          {config ? (
            <ChartCanvas config={config} height={360} ariaLabel="Energy flows over the simulated year" onChart={(c) => (chartRef.current = c)} />
          ) : (
            <div style={{ height: "360px" }}>
              <div class="mg-flows__empty">Select a signal above to plot it.</div>
            </div>
          )}
          {config && hoverIdx != null && hover && (
            <>
              <div class="mg-flows__guide" style={{ left: `${hover.px}px`, top: `${hover.top}px`, height: `${hover.bottom - hover.top}px` }} />
              <div
                class="mg-flows__tip"
                style={{ left: `${hover.px}px`, transform: hover.px > hover.width * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
              >
                <div class="mg-flows__tip-date">{dateLabel(view.x[hoverIdx], resolution === "hourly")}</div>
                {on.map((s) => {
                  const v = view.columns[s.column][hoverIdx];
                  return (
                    <div key={s.key} class="mg-flows__tip-row">
                      <span class="mg-flows__tip-dot" style={{ background: s.color }} />
                      <span class="mg-flows__tip-label">{s.label}</span>
                      <span class="mg-flows__tip-value">
                        {v == null ? "—" : f2(v)} {s.axis === "y1" ? "kWh" : "kW"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div class="mg-flows__caption">
          Power in kW on the left axis · battery charge in kWh on the right · drag to zoom, shift-drag to pan
          {resolution === "daily" ? " · switch to Hourly to step through single days or weeks" : ""}
        </div>
      </section>

      <DailyProfileCard parsed={parsed} year={year} baseline={baseline} />

      <DemandComponentsCard loads={loads} />

      <HeatmapCard
        title={`Solar output by time of year · Year ${year}`}
        parsed={parsed}
        values={parsed.columns["solar_kW"] ?? null}
        ramp={RAMPS.solar}
        format={(v) => `${f2(v)} kW`}
        caption={(peak) => `kW by hour of day · peak ${f2(peak)} kW`}
        empty="No solar output in this simulation"
      />

      <HeatmapCard
        title={`Battery ${batteryView === "charge" ? "state of charge" : "depth of discharge"} · Year ${year}`}
        parsed={parsed}
        values={batteryPct}
        ramp={RAMPS.battery}
        max={100}
        format={(v) => `${Math.round(v)}%`}
        caption={() =>
          batteryView === "charge"
            ? `Percent of the ${f2(batteryCap)} kWh usable capacity · darker = fuller`
            : `Percent of the ${f2(batteryCap)} kWh usable capacity drawn down · darker = more discharged`
        }
        empty="No battery in this simulation"
        controls={
          <Segmented<BatteryView>
            ariaLabel="Battery measure"
            value={batteryView}
            onChange={setBatteryView}
            options={[
              { id: "charge", label: "Charge" },
              { id: "dod", label: "Depth of discharge" },
            ]}
          />
        }
      />

      <HeatmapCard
        title={`Diesel generator output by time of year · Year ${year}`}
        parsed={parsed}
        values={parsed.columns["diesel_kW"] ?? null}
        ramp={RAMPS.diesel}
        format={(v) => `${f2(v)} kW`}
        caption={(peak) => `kW by hour of day · peak ${f2(peak)} kW`}
        empty={`The generator didn't run in year ${year}`}
      />
    </>
  );
}
