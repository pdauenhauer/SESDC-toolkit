import { Fragment } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Chart, ChartConfiguration } from "chart.js";
import { RotateCcw } from "lucide-preact";
import type { SimulationResult } from "../../services/simulation";
import ChartCanvas from "../charts/ChartCanvas";
import { Button, Segmented, STROKE } from "../ui";
import { f2 } from "../../utils/format";
import { parseDatetimeWideCsv } from "./parseDateTimeCsv";
import {
  aggregateDaily,
  dateLabel,
  downsampleView,
  filterBySeason,
  monthHourAverages,
  type ParsedView,
  type Resolution,
  type Season,
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
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const AXIS = { color: "#9A9EA5", font: { size: 11, family: "Geist, system-ui, sans-serif" } };

type Hover = { index: number; px: number; top: number; bottom: number; width: number } | null;

export default function GraphsTab({ result }: { result: SimulationResult }) {
  const hourlyCsv = result["hourly_simulation"];
  const parsed = useMemo<ParsedView | null>(() => {
    if (!hourlyCsv) return null;
    try {
      return parseDatetimeWideCsv(hourlyCsv);
    } catch (e) {
      console.error("[GraphsTab] Failed to parse hourly simulation CSV", e);
      return null;
    }
  }, [hourlyCsv]);

  const available = useMemo(() => SERIES.filter((s) => parsed?.names.includes(s.column)), [parsed]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(SERIES.map((s) => [s.key, DEFAULT_ON.has(s.key)])));
  const [season, setSeason] = useState<Season>("all");
  const [resolution, setResolution] = useState<Resolution>("daily");
  const [hover, setHover] = useState<Hover>(null);
  const [zoomed, setZoomed] = useState(false);
  const chartRef = useRef<Chart | null>(null);

  const view = useMemo<ParsedView | null>(() => {
    if (!parsed) return null;
    const seasonal = filterBySeason(parsed, season);
    return resolution === "daily" ? aggregateDaily(seasonal) : downsampleView(seasonal, 1000);
  }, [parsed, season, resolution]);

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

  const heat = useMemo(() => (parsed ? monthHourAverages(parsed, "solar_kW") : null), [parsed]);
  const heatMax = heat ? Math.max(...heat.flat(), 0) : 0;

  if (!hourlyCsv) return <div class="mg-card mg-state">This simulation has no hourly table to chart.</div>;
  if (!parsed || !view || !view.x.length) return <div class="mg-state mg-state--loading">Preparing charts…</div>;

  const n = view.x.length;
  const range = `${dateLabel(view.x[0], false)} – ${dateLabel(view.x[n - 1], false)}`;
  const hoverIdx = hover && hover.index < n ? hover.index : null;

  return (
    <div class="mg-graphs" data-screen-label="Graphs">
      <section class="mg-card mg-flows">
        <div class="mg-flows__head">
          <div class="mg-flows__title">
            <h2 class="mg-h2">Energy flows</h2>
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
        <div class="mg-flows__caption">Power in kW on the left axis · battery charge in kWh on the right · drag to zoom, shift-drag to pan</div>
      </section>

      <section class="mg-card mg-heat">
        <div class="mg-heat__head">
          <h2 class="mg-h3">Solar output by month and hour</h2>
          <span class="mg-caption">{heatMax > 0 ? `Average kW · peak ${f2(heatMax)} kW` : "No solar output in this simulation"}</span>
        </div>
        {heat && heatMax > 0 && (
          <div class="mg-heat__grid">
            {heat.map((row, mIdx) => (
              <Fragment key={mIdx}>
                <span class="mg-heat__month">{MONTHS[mIdx]}</span>
                <div class="mg-heat__row">
                  {row.map((v, h) => {
                    const p = Math.round(Math.pow(v / heatMax, 0.85) * 100);
                    return (
                      <span
                        key={h}
                        class="mg-heat__cell"
                        title={`${MONTHS[mIdx]} ${String(h).padStart(2, "0")}:00 · ${f2(v)} kW`}
                        style={{ background: `color-mix(in srgb, #E39B2D ${p}%, #F4F3EF)` }}
                      />
                    );
                  })}
                </div>
              </Fragment>
            ))}
            <span />
            <div class="mg-heat__hours">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
