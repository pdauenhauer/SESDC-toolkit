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

type ZoomPreset = "day" | "week" | "month" | "year" | "all";
type WindowMode = Extract<ZoomPreset, "day" | "week" | "month">;

type TimeWindow = {
  key: string;
  label: string;
  inputValue: string;
  min: number;
  max: number;
};

type WindowSelection = Record<WindowMode, string>;

const PRESET_SECONDS: Record<Extract<ZoomPreset, "year">, number> = {
  year: 365 * 86400,
};

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
});
const monthDayFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
});
const monthDayTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const offset = (dayOfWeek + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekNumber(date: Date): { weekYear: number; week: number } {
  const weekDate = getStartOfWeek(date);
  const yearStart = new Date(weekDate.getFullYear(), 0, 1);
  const yearStartWeek = getStartOfWeek(yearStart);
  const diffMs = weekDate.getTime() - yearStartWeek.getTime();
  const week = Math.floor(diffMs / (7 * 86400000)) + 1;
  return { weekYear: weekDate.getFullYear(), week };
}

function formatWeekInputValue(date: Date): string {
  const { weekYear, week } = getWeekNumber(date);
  return `${weekYear}-W${pad(week)}`;
}

function buildTimeWindows(timestamps: number[], mode: WindowMode): TimeWindow[] {
  const windows: TimeWindow[] = [];
  let current: TimeWindow | null = null;

  timestamps.forEach((ts) => {
    const date = new Date(ts * 1000);
    const year = date.getFullYear();
    const month = date.getMonth();
    let key: string;
    let label: string;
    let inputValue: string;

    if (mode === "day") {
      key = formatDateInputValue(date);
      label = dayLabelFormatter.format(date);
      inputValue = key;
    } else if (mode === "month") {
      key = `${year}-${pad(month + 1)}`;
      label = monthLabelFormatter.format(date);
      inputValue = key;
    } else {
      const weekStart = getStartOfWeek(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      key = formatWeekInputValue(date);
      label = `${dayLabelFormatter.format(weekStart)} - ${dayLabelFormatter.format(weekEnd)}`;
      inputValue = key;
    }

    if (!current || current.key !== key) {
      current = { key, label, inputValue, min: ts, max: ts };
      windows.push(current);
      return;
    }

    current.max = ts;
  });

  return windows;
}

function getWindowLookup(windows: TimeWindow[]): Record<string, TimeWindow> {
  return Object.fromEntries(windows.map((window) => [window.key, window]));
}

function getVisibleRange(
  preset: ZoomPreset,
  selections: WindowSelection,
  windowsByMode: Record<WindowMode, Record<string, TimeWindow>>,
  xMin: number | null,
  xMax: number | null
): { min: number; max: number } | null {
  if (xMin == null || xMax == null) return null;

  if (preset === "all") {
    return { min: xMin, max: xMax };
  }

  if (preset === "year") {
    return { min: Math.max(xMin, xMax - PRESET_SECONDS.year), max: xMax };
  }

  const selectedKey = selections[preset];
  const window = windowsByMode[preset][selectedKey];
  if (!window) return null;

  return { min: window.min, max: window.max };
}

function getLastWindowKey(windows: TimeWindow[]): string {
  return windows.length > 0 ? windows[windows.length - 1].key : "";
}

function getLastWindowInputValue(windows: TimeWindow[]): string | undefined {
  return windows.length > 0 ? windows[windows.length - 1].inputValue : undefined;
}

export default function UPlotChart({ data, series, width, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>("month");
  const [windowSelection, setWindowSelection] = useState<WindowSelection>({
    day: "",
    week: "",
    month: "",
  });

  const xValues = (data[0] ?? []) as number[];
  const xMin = xValues[0] ?? null;
  const xMax = xValues[xValues.length - 1] ?? null;

  const dayWindows = useMemo(() => buildTimeWindows(xValues, "day"), [xValues]);
  const weekWindows = useMemo(() => buildTimeWindows(xValues, "week"), [xValues]);
  const monthWindows = useMemo(() => buildTimeWindows(xValues, "month"), [xValues]);

  const dayWindowsByKey = useMemo(() => getWindowLookup(dayWindows), [dayWindows]);
  const weekWindowsByKey = useMemo(() => getWindowLookup(weekWindows), [weekWindows]);
  const monthWindowsByKey = useMemo(() => getWindowLookup(monthWindows), [monthWindows]);

  useEffect(() => {
    setWindowSelection((prev) => ({
      day: dayWindowsByKey[prev.day] ? prev.day : getLastWindowKey(dayWindows),
      week: weekWindowsByKey[prev.week] ? prev.week : getLastWindowKey(weekWindows),
      month: monthWindowsByKey[prev.month] ? prev.month : getLastWindowKey(monthWindows),
    }));
  }, [dayWindows, weekWindows, monthWindows, dayWindowsByKey, weekWindowsByKey, monthWindowsByKey]);

  const windowsByMode = useMemo(
    () => ({
      day: dayWindowsByKey,
      week: weekWindowsByKey,
      month: monthWindowsByKey,
    }),
    [dayWindowsByKey, weekWindowsByKey, monthWindowsByKey]
  );

  const visibleRange = useMemo(
    () => getVisibleRange(zoomPreset, windowSelection, windowsByMode, xMin, xMax),
    [zoomPreset, windowSelection, windowsByMode, xMin, xMax]
  );

  const chartSeries = useMemo<uPlot.Series[]>(
    () => [
      { label: "t" },
      ...series.map((item) => ({
        label: item.label,
        stroke: item.stroke,
        width: item.width ?? 1,
        spanGaps: true,
        scale: item.scale ?? "y",
      })),
    ],
    [series]
  );

  const chartOptions = useMemo<uPlot.Options>(() => {
    const timeAxis: uPlot.Axis = {
      label: "time",
      space: 120,
      values: (u, splits) => {
        const min = u.scales.x.min ?? 0;
        const max = u.scales.x.max ?? 0;
        const rangeSec = max - min;

        if (rangeSec > 180 * 86400) {
          return splits.map((ts) => monthFormatter.format(new Date(ts * 1000)));
        }
        if (rangeSec > 14 * 86400) {
          return splits.map((ts) => monthDayFormatter.format(new Date(ts * 1000)));
        }
        return splits.map((ts) => monthDayTimeFormatter.format(new Date(ts * 1000)));
      },
    };

    const valueAxis: uPlot.Axis = { label: "value" };
    const usesSoc = series.some((item) => item.scale === "soc");

    return {
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
      series: chartSeries,
      legend: { show: true },
      cursor: {
        drag: { x: false, y: false },
        points: { show: false },
      },
    };
  }, [chartSeries, height, series, width]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    plotRef.current?.destroy();
    plotRef.current = new uPlot(chartOptions, data as uPlot.AlignedData, el);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [chartOptions]);

  useEffect(() => {
    plotRef.current?.setData(data as uPlot.AlignedData);
  }, [data]);

  useEffect(() => {
    if (!visibleRange) return;
    plotRef.current?.setScale("x", visibleRange);
  }, [visibleRange]);

  const selectedWindow =
    zoomPreset === "day"
      ? dayWindowsByKey[windowSelection.day]
      : zoomPreset === "week"
        ? weekWindowsByKey[windowSelection.week]
        : zoomPreset === "month"
          ? monthWindowsByKey[windowSelection.month]
          : null;

  const handleWindowSelection = (mode: WindowMode, value: string) => {
    setWindowSelection((prev) => ({ ...prev, [mode]: value }));
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
          onClick={() => setZoomPreset("week")}
          aria-pressed={zoomPreset === "week"}
        >
          Week
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

      {zoomPreset === "day" && dayWindows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <label style={{ fontSize: 13, fontWeight: 600 }} for="graph-day-picker">
            Date
          </label>
          <input
            id="graph-day-picker"
            type="date"
            value={windowSelection.day}
            min={dayWindows[0]?.inputValue}
            max={getLastWindowInputValue(dayWindows)}
            onInput={(event) =>
              handleWindowSelection("day", (event.target as HTMLInputElement).value)
            }
          />
          {selectedWindow && <div style={{ fontSize: 13 }}>{selectedWindow.label}</div>}
        </div>
      )}

      {zoomPreset === "week" && weekWindows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <label style={{ fontSize: 13, fontWeight: 600 }} for="graph-week-picker">
            Week
          </label>
          <input
            id="graph-week-picker"
            type="week"
            value={windowSelection.week}
            min={weekWindows[0]?.inputValue}
            max={getLastWindowInputValue(weekWindows)}
            onInput={(event) =>
              handleWindowSelection("week", (event.target as HTMLInputElement).value)
            }
          />
          {selectedWindow && <div style={{ fontSize: 13 }}>{selectedWindow.label}</div>}
        </div>
      )}

      {zoomPreset === "month" && monthWindows.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <label style={{ fontSize: 13, fontWeight: 600 }} for="graph-month-picker">
            Month
          </label>
          <input
            id="graph-month-picker"
            type="month"
            value={windowSelection.month}
            min={monthWindows[0]?.inputValue}
            max={getLastWindowInputValue(monthWindows)}
            onInput={(event) =>
              handleWindowSelection("month", (event.target as HTMLInputElement).value)
            }
          />
          {selectedWindow && <div style={{ fontSize: 13 }}>{selectedWindow.label}</div>}
        </div>
      )}

      <div ref={containerRef} />
    </div>
  );
}
