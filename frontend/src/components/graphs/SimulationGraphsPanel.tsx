import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { SimulationResult } from "../../services/simulation";
import UPlotChart, { UPlotSeriesSpec } from "../UPlotChart";
import { parseDatetimeWideCsv } from "./parseDateTimeCsv";

type Props = { result: SimulationResult };



function downsampleAvg(
  x: number[],
  y: (number | null)[],
  maxPoints: number
): { x: number[]; y: (number | null)[] } {
  const n = x.length;
  if (n <= maxPoints) return { x, y };

  const bucket = Math.ceil(n / maxPoints);

  const outX: number[] = [];
  const outY: (number | null)[] = [];

  for (let i = 0; i < n; i += bucket) {
    const end = Math.min(n, i + bucket);

    let xSum = 0;
    let xCount = 0;

    let ySum = 0;
    let yCount = 0;

    for (let j = i; j < end; j++) {
      const xv = x[j];
      xSum += xv;
      xCount++;

      const yv = y[j];
      if (yv != null) {
        ySum += yv;
        yCount++;
      }
    }

    outX.push(xCount ? xSum / xCount : x[i]);
    outY.push(yCount ? ySum / yCount : null);
  }

  return { x: outX, y: outY };
}

const DEFAULT_ON = new Set([
  "load_kW",
  "solar_kW",
  "wind_kW",
  "diesel_kW",
  "battery_soc_kWh",
  "load_not_serviced_kW",
  "load_serviced_kW",
  "net_energy_kW",
]);

const palette = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
];

export default function SimulationGraphsPanel({ result }: Props) {
  // 1) source csv
  const hourlyCsv = result["hourly_simulation"];

  // 2) parse
  const parsed = useMemo(() => {
    if (!hourlyCsv) return null;
    try {
      return parseDatetimeWideCsv(hourlyCsv);
    } catch (error) {
      console.error("[SimulationGraphsPanel] Failed to parse hourly simulation CSV", error);
      return null;
    }
  }, [hourlyCsv]);

  // 3) checkbox state
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  // 4) chart width (measured)
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setWidth(Math.max(300, Math.floor(rect.width)));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 5) initialize enabled defaults once we know column names
  useEffect(() => {
    if (!parsed) return;

    const init: Record<string, boolean> = {};
    for (const name of parsed.names) {
      const col = parsed.columns[name];
      const nonNull = col.reduce<number>((acc, v) => acc + (v == null ? 0 : 1), 0);
      const pct = col.length ? nonNull / col.length : 0;
      init[name] = DEFAULT_ON.has(name) && pct >= 0.05;
    }
    setEnabled(init);
  }, [parsed?.names?.join("|")]);

  // 6) enabled-only series/data
  const enabledNames = useMemo(() => {
    if (!parsed) return [];
    return parsed.names.filter((n) => enabled[n]);
  }, [parsed, enabled]);

  const series: UPlotSeriesSpec[] = useMemo(() => {
    if (!parsed) return [];
  
    const indexByName = new Map(parsed.names.map((n, i) => [n, i]));
  
    return enabledNames.map((n) => {
      const idx = indexByName.get(n) ?? 0;
      return {
        label: n,
        width: 1,
        stroke: palette[idx % palette.length],
        scale: n === "battery_soc_kWh" ? "soc" : "y",
      };
    });
  }, [parsed, enabledNames]);

  const data = useMemo(() => {
    if (!parsed) return [[0], [0]];
  
    // Heuristic: a few points per pixel column is enough for overview.
    // Increase multiplier if you want more detail.
    const maxPoints = Math.max(800, Math.floor(width * 3));
  
    // If nothing enabled, still return valid shape: [x]
    if (enabledNames.length === 0) {
      return [parsed.x];
    }
  
    let outX: number[] | null = null;
    const out: (number | null)[][] = [];
  
    for (const n of enabledNames) {
      const { x: dx, y: dy } = downsampleAvg(parsed.x, parsed.columns[n], maxPoints);
      if (!outX) outX = dx;
      out.push(dy);
    }
  
    return [outX ?? parsed.x, ...out];
  }, [parsed, enabledNames, width]);
  // 7) empty/loading states
  if (!hourlyCsv) {
    return <p class="project-craft-placeholder">Graphs — no hourly simulation CSV found.</p>;
  }

  if (!parsed || parsed.x.length === 0) {
    return (
      <p class="project-craft-placeholder project-craft-placeholder--loading">
        Parsing hourly simulation CSV…
      </p>
    );
  }

  const deselectAll = () => {
    if (!parsed) return;
    const next: Record<string, boolean> = {};
    for (const n of parsed.names) next[n] = false;
    setEnabled(next);
  };
  
  // optional: restore your DEFAULT_ON behavior quickly
  const selectDefaults = () => {
    if (!parsed) return;
    const next: Record<string, boolean> = {};
    for (const name of parsed.names) {
      const col = parsed.columns[name];
      const nonNull = col.reduce<number>((acc, v) => acc + (v == null ? 0 : 1), 0);
      const pct = col.length ? nonNull / col.length : 0;
      next[name] = DEFAULT_ON.has(name) && pct >= 0.05;
    }
    setEnabled(next);
  };

  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <div style={{ minWidth: 280, maxWidth: 420 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
  <div style={{ fontWeight: 600 }}>Signals</div>
  <div style={{ display: "flex", gap: 8 }}>
    <button type="button" onClick={deselectAll} style={{ fontSize: 12, padding: "4px 8px" }}>
      Deselect all
    </button>

    {/* optional */}
    <button type="button" onClick={selectDefaults} style={{ fontSize: 12, padding: "4px 8px" }}>
      Defaults
    </button>
  </div>
</div>

<div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>
  Rows: {parsed.x.length}
</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 6,
            maxHeight: 420,
            overflow: "auto",
          }}
        >
          {parsed.names.map((n) => (
            <label key={n} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={enabled[n] ?? false}
                onChange={(e) =>
                  setEnabled((prev) => ({
                    ...prev,
                    [n]: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
              <span style={{ fontSize: 13 }}>{n}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 650 }}>
        <div
          ref={chartWrapRef}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
        >
          <UPlotChart data={data} series={series} width={Math.max(300, width - 20)} height={460} />
        </div>
        
      </div>
    </div>
  );
}
