import { Fragment, type ComponentChildren } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Segmented } from "../ui";
import { dayHourGrid, monthHourAveragesOf, type ParsedView } from "./timeseries";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOUR_TICKS = ["00:00", "06:00", "12:00", "18:00", "23:00"];

/** Light (near zero) → dark (high) stops of a one-hue sequential ramp. */
export type Ramp = string[];

export const RAMPS = {
  solar: ["#F4F3EF", "#F0C47E", "#E39B2D", "#9A5F0E"],
  battery: ["#F4F3EF", "#C9C2EC", "#7B6FC4", "#3E3384"],
  diesel: ["#F4F3EF", "#E7B8A5", "#B4513A", "#6E2A1B"],
} satisfies Record<string, Ramp>;

type Mode = "month" | "day";

type Props = {
  title: string;
  /** Hourly values to map (same length as `parsed.x`), or null when there's nothing to show. */
  values: (number | null)[] | null;
  parsed: ParsedView;
  ramp: Ramp;
  /** Color scale end; the start is 0. Defaults to the largest value shown. */
  max?: number;
  format: (v: number) => string;
  /** Shown instead of the map when there is no data (e.g. no battery in this run). */
  empty?: string;
  /** Caption next to the title; gets the scale peak. */
  caption: (peak: number) => string;
  /** Extra controls in the header (e.g. charge / depth-of-discharge switch). */
  controls?: ComponentChildren;
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Color for t in [0, 1] along the ramp, interpolated in sRGB between stops. */
function rampColor(ramp: Ramp, t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as [number, number, number];
}

const css = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
const dayLabel = (ts: number) => new Date(ts * 1000).toLocaleDateString("en", { month: "short", day: "numeric" });

type Tip = { label: string; value: string; left: number; top: number; flip: boolean } | null;

/**
 * Hour-of-day × time-of-year heatmap. "By month" averages each month's hours;
 * "By day" shows every day of the year (one row per day) so single events stand out.
 */
export default function HeatmapCard({ title, values, parsed, ramp, max, format, empty, caption, controls }: Props) {
  const [mode, setMode] = useState<Mode>("month");
  const [tip, setTip] = useState<Tip>(null);
  const months = useMemo(() => (values ? monthHourAveragesOf(parsed, values) : null), [parsed, values]);
  const grid = useMemo(() => (values && mode === "day" ? dayHourGrid(parsed, values) : null), [parsed, values, mode]);

  const dataMax = useMemo(() => {
    if (!values) return 0;
    let m = 0;
    for (const v of values) if (v != null && v > m) m = v;
    return m;
  }, [values]);
  const peak = max ?? dataMax;
  const hasData = !!values && dataMax > 0;
  const t = (v: number) => (peak > 0 ? v / peak : 0);

  return (
    <section class="mg-card mg-heat">
      <div class="mg-heat__head">
        <div class="mg-flows__title">
          <h2 class="mg-h3">{title}</h2>
          <span class="mg-caption">{hasData ? caption(peak) : empty ?? "No data"}</span>
        </div>
        {hasData && controls}
        {hasData && (
          <Segmented<Mode>
            ariaLabel="Heatmap detail"
            value={mode}
            onChange={(m) => {
              setTip(null);
              setMode(m);
            }}
            options={[
              { id: "month", label: "By month" },
              { id: "day", label: "By day" },
            ]}
          />
        )}
      </div>

      {hasData && (
        <div class="mg-heat__body" onMouseLeave={() => setTip(null)}>
          {mode === "month" && months ? (
            <div class="mg-heat__grid">
              {months.map((row, mIdx) => (
                <Fragment key={mIdx}>
                  <span class="mg-heat__month">{MONTHS[mIdx]}</span>
                  <div class="mg-heat__row">
                    {row.map((v, h) => (
                      <span
                        key={h}
                        class="mg-heat__cell"
                        aria-label={`${MONTHS[mIdx]} ${hh(h)}: ${format(v)}`}
                        style={{ background: css(rampColor(ramp, t(v))) }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          const box = el.closest(".mg-heat__body")!.getBoundingClientRect();
                          const r = el.getBoundingClientRect();
                          setTip({
                            label: `${MONTHS[mIdx]} average · ${hh(h)}`,
                            value: format(v),
                            left: r.left - box.left + r.width / 2,
                            top: r.top - box.top,
                            flip: h > 15,
                          });
                        }}
                      />
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>
          ) : grid ? (
            <DayGrid grid={grid} ramp={ramp} peak={peak} format={format} onTip={setTip} />
          ) : null}
          <div class="mg-heat__grid">
            <span />
            <div class="mg-heat__hours">
              {HOUR_TICKS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>
          {tip && (
            <div
              class="mg-heat__tip"
              style={{ left: `${tip.left}px`, top: `${tip.top}px`, transform: tip.flip ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)" }}
            >
              <div class="mg-flows__tip-date">{tip.label}</div>
              <strong>{tip.value}</strong>
            </div>
          )}
          <div class="mg-heat__legend" aria-hidden="true">
            <span>{format(0)}</span>
            <span class="mg-heat__scale" style={{ background: `linear-gradient(90deg, ${ramp.join(", ")})` }} />
            <span>{format(peak)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

type DayGridProps = {
  grid: { days: number[]; cells: (number | null)[][] };
  ramp: Ramp;
  peak: number;
  format: (v: number) => string;
  onTip: (tip: Tip) => void;
};

/** Every day of the year as one row of 24 cells, drawn one pixel per cell and scaled up. */
function DayGrid({ grid, ramp, peak, format, onTip }: DayGridProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = grid.days.length;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !n) return;
    const img = ctx.createImageData(24, n);
    const [br, bg, bb] = hexToRgb("#FAFAF8");
    grid.cells.forEach((row, d) =>
      row.forEach((v, h) => {
        const [r, g, b] = v == null ? [br, bg, bb] : rampColor(ramp, peak > 0 ? v / peak : 0);
        const o = (d * 24 + h) * 4;
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
      })
    );
    ctx.putImageData(img, 0, 0);
  }, [grid, ramp, peak, n]);

  // First row of each month, for the labels on the left.
  const monthRows = useMemo(() => {
    const out: { m: number; row: number }[] = [];
    let last = -1;
    grid.days.forEach((ts, row) => {
      const m = new Date(ts * 1000).getMonth();
      if (m !== last) out.push({ m, row });
      last = m;
    });
    return out;
  }, [grid]);

  const onMove = (e: MouseEvent) => {
    const canvas = ref.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const h = Math.min(23, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * 24)));
    const d = Math.min(n - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * n)));
    const v = grid.cells[d]?.[h];
    const box = canvas.closest(".mg-heat__body")!.getBoundingClientRect();
    onTip({
      label: `${dayLabel(grid.days[d])} · ${hh(h)}`,
      value: v == null ? "No data" : format(v),
      left: r.left - box.left + ((h + 0.5) / 24) * r.width,
      top: e.clientY - box.top,
      flip: h > 15,
    });
  };

  return (
    <div class="mg-heat__grid">
      <div class="mg-heat__days">
        {monthRows.map(({ m, row }) => (
          <span key={m} style={{ top: `${(row / n) * 100}%` }}>
            {MONTHS[m]}
          </span>
        ))}
      </div>
      <canvas
        ref={ref}
        class="mg-heat__canvas"
        width={24}
        height={n}
        role="img"
        aria-label={`Every day of the year by hour, ${n} days`}
        onMouseMove={onMove}
      />
    </div>
  );
}
