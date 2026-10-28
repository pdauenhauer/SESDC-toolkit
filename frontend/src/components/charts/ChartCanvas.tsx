import { useEffect, useRef } from "preact/hooks";
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  Title,
} from "chart.js";
import type { ChartConfiguration } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

// Register only what our charts use (keeps the bundle lean vs chart.js/auto).
// The zoom plugin is inert unless a chart's options.plugins.zoom is set.
Chart.register(
  LineController,
  BarController,
  DoughnutController,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  Title,
  zoomPlugin
);

Chart.defaults.font.family =
  "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
Chart.defaults.color = "#475569";

type Props = {
  /** A memoized Chart.js config — the chart is rebuilt whenever this changes. */
  config: ChartConfiguration;
  height?: number;
  ariaLabel?: string;
  /** Receives the live Chart instance (and null on teardown) for imperative calls like resetZoom(). */
  onChart?: (chart: Chart | null) => void;
};

/**
 * Thin Preact wrapper around a Chart.js instance. `config` should be memoized
 * by the parent so the chart is only rebuilt when the underlying data changes.
 */
export default function ChartCanvas({ config, height = 260, ariaLabel, onChart }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const chart = new Chart(canvas, config);
    chartRef.current = chart;
    onChart?.(chart);
    return () => {
      onChart?.(null);
      chart.destroy();
      chartRef.current = null;
    };
  }, [config]);

  return (
    <div style={{ position: "relative", height: `${height}px` }}>
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} />
    </div>
  );
}
