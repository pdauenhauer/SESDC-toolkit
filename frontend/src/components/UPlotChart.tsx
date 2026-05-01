import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export type UPlotSeriesSpec = {
  label: string;
  stroke?: string;
  width?: number;
  scale?: string;
};

type Props = {
  data: (number | null)[][];
  series: UPlotSeriesSpec[];
  width: number;
  height: number;
};

type ZoomPreset = "day" | "month" | "year" | "all";

const PRESET_SECONDS: Record<Exclude<ZoomPreset, "all">, number> = {
  day: 86400,
  month: 30 * 86400,
  year: 365 * 86400,
};

type TimeWindow = {
  key: string;
  label: string;
  min: number;
  max: number;
};

function buildTimeWindows(
  timestamps: number[],
  mode: "day" | "month"
): TimeWindow[] {
  const windows: TimeWindow[] = [];
  let current: TimeWindow | null = null;

  timestamps.forEach((ts) => {
    const date = new Date(ts * 1000);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const key =
      mode === "day"
        ? `${year}-${month + 1}-${day}`
        : `${year}-${month + 1}`;
    const label =
      mode === "day"
        ? date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          });

    if (!current || current.key !== key) {
      current = { key, label, min: ts, max: ts };
      windows.push(current);
      return;
    }

    current.max = ts;
  });

  return windows;
}

export default function UPlotChart({ data, series, width, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>("month");
  const [dayWindowIndex, setDayWindowIndex] = useState<number>(0);
  const [monthWindowIndex, setMonthWindowIndex] = useState<number>(0);

  const xValues = data[0] ?? [];
  const xMin = xValues[0] ?? null;
  const xMax = xValues[xValues.length - 1] ?? null;
  const dayWindows = useMemo(() => buildTimeWindows(xValues as number[], "day"), [xValues]);
  const monthWindows = useMemo(() => buildTimeWindows(xValues as number[], "month"), [xValues]);

  useEffect(() => {
    setDayWindowIndex(dayWindows.length > 0 ? dayWindows.length - 1 : 0);
  }, [dayWindows]);

  useEffect(() => {
    setMonthWindowIndex(monthWindows.length > 0 ? monthWindows.length - 1 : 0);
  }, [monthWindows]);

  const applyZoomPreset = (preset: ZoomPreset) => {
    const plot = plotRef.current;
    if (!plot || xMin == null || xMax == null) return;

    if (preset === "day") {
      const window = dayWindows[dayWindowIndex];
      if (!window) return;
      plot.setScale("x", { min: window.min, max: window.max });
      return;
    }

    if (preset === "month") {
      const window = monthWindows[monthWindowIndex];
      if (!window) return;
      plot.setScale("x", { min: window.min, max: window.max });
      return;
    }

    if (preset === "all") {
      plot.setScale("x", { min: xMin, max: xMax });
      return;
    }

    const range = PRESET_SECONDS[preset];
    const min = Math.max(xMin, xMax - range);

    plot.setScale("x", { min, max: xMax });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const timeAxis: uPlot.Axis = {
      label: "time",
      space: 120,
      values: (u, splits) => {
        const min = u.scales.x.min ?? 0;
        const max = u.scales.x.max ?? 0;
        const rangeSec = max - min;

        if (rangeSec > 180 * 86400) {
          return splits.map((ts) =>
            new Date(ts * 1000).toLocaleString(undefined, { month: "short" })
          );
        }
        if (rangeSec > 14 * 86400) {
          return splits.map((ts) =>
            new Date(ts * 1000).toLocaleString(undefined, {
              month: "short",
              day: "2-digit",
            })
          );
        }
        return splits.map((ts) =>
          new Date(ts * 1000).toLocaleString(undefined, {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      },
    };

    const valueAxis: uPlot.Axis = { label: "value" };
    const usesSoc = series.some((s) => s.scale === "soc");
    const plotSeries: uPlot.Series[] = [
      { label: "t" },
      ...series.map((s) => ({
        label: s.label,
        stroke: s.stroke,
        width: s.width ?? 1,
        spanGaps: true,
        scale: s.scale ?? "y",
      })),
    ];
    const opts: uPlot.Options = {
      width,
      height,
      scales: {
        x: { time: true },
        y: { auto: true },
        soc: { auto: true },
      },
      axes: usesSoc
        ? [
            timeAxis,
            valueAxis,
            { scale: "soc", side: 1, label: "SOC (kWh)", grid: { show: false } },
          ]
        : [timeAxis, valueAxis],
      series: plotSeries,
      legend: { show: true },
      cursor: {
        drag: { x: false, y: false },
        points: { show: false },
      },
    };

    plotRef.current?.destroy();
    plotRef.current = new uPlot(opts, data as uPlot.AlignedData, el);
    applyZoomPreset(zoomPreset);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [data, height, series, width, zoomPreset, dayWindows, monthWindows, dayWindowIndex, monthWindowIndex]);

  useEffect(() => {
    plotRef.current?.setData(data as uPlot.AlignedData);
    applyZoomPreset(zoomPreset);
  }, [data, zoomPreset, dayWindowIndex, monthWindowIndex, dayWindows, monthWindows]);

  const isWindowedPreset = zoomPreset === "day" || zoomPreset === "month";
  const currentWindows = zoomPreset === "day" ? dayWindows : monthWindows;
  const currentWindowIndex = zoomPreset === "day" ? dayWindowIndex : monthWindowIndex;
  const currentWindow = isWindowedPreset ? currentWindows[currentWindowIndex] : null;

  const moveWindow = (direction: -1 | 1) => {
    if (zoomPreset === "day") {
      setDayWindowIndex((prev) =>
        Math.max(0, Math.min(dayWindows.length - 1, prev + direction))
      );
      return;
    }

    if (zoomPreset === "month") {
      setMonthWindowIndex((prev) =>
        Math.max(0, Math.min(monthWindows.length - 1, prev + direction))
      );
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setZoomPreset("day")}
          aria-pressed={zoomPreset === "day"}
        >
          Day
        </button>
        <button
          type="button"
          onClick={() => setZoomPreset("month")}
          aria-pressed={zoomPreset === "month"}
        >
          Month
        </button>
        <button
          type="button"
          onClick={() => setZoomPreset("year")}
          aria-pressed={zoomPreset === "year"}
        >
          Year
        </button>
        <button
          type="button"
          onClick={() => setZoomPreset("all")}
          aria-pressed={zoomPreset === "all"}
        >
          All
        </button>
      </div>

      {isWindowedPreset && currentWindow && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => moveWindow(-1)}
            disabled={currentWindowIndex === 0}
            aria-label={`Previous ${zoomPreset}`}
          >
            ←
          </button>
          <div style={{ minWidth: 140, fontSize: 13, fontWeight: 600 }}>
            {currentWindow.label}
          </div>
          <button
            type="button"
            onClick={() => moveWindow(1)}
            disabled={currentWindowIndex === currentWindows.length - 1}
            aria-label={`Next ${zoomPreset}`}
          >
            →
          </button>
        </div>
      )}

      <div ref={containerRef} />
    </div>
  );
}
