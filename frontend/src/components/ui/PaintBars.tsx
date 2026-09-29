import { useEffect, useRef, useState } from "preact/hooks";
import { f1, f2 } from "../../utils/format";
import "../../css/paint-bars.css";

type PaintBarsProps = {
  /** 24 hourly values to draw. */
  values: number[];
  /** Axis maximum. Frozen for the duration of a drag so values can't run away. */
  scale: number;
  height?: number;
  /** Width of the y-label column in px. */
  yWidth?: number;
  /** Show each bar's value above it (hidden automatically when too narrow). */
  showValues?: boolean;
  /** Value snapping step, e.g. 0.05 or 0.1 kW. */
  step?: number;
  /** true = a drag paints every bar it crosses; false = only the bar it started on. */
  paintAcross?: boolean;
  formatTop?: (scale: number) => string;
  ariaLabel: string;
  /** Called for each painted hour with the snapped value. */
  onPaint: (hour: number, value: number) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 24-hour bar chart you edit by pointer-dragging on the bars. */
export function PaintBars({
  values,
  scale,
  height = 260,
  yWidth = 40,
  showValues = false,
  step = 0.05,
  paintAcross = true,
  formatTop = f1,
  ariaLabel,
  onPaint,
}: PaintBarsProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [frozenScale, setFrozenScale] = useState<number | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const sc = frozenScale ?? scale;
  const peak = Math.max(...values, 0);

  const onPointerDown = (e: PointerEvent) => {
    const el = plotRef.current;
    if (!el) return;
    e.preventDefault();
    const s = scale;
    setFrozenScale(s);
    const indexAt = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return clamp(Math.floor(((ev.clientX - r.left) / r.width) * 24), 0, 23);
    };
    const locked = paintAcross ? null : indexAt(e);
    const apply = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const raw = clamp((r.bottom - ev.clientY) / r.height, 0, 1) * s;
      onPaint(locked ?? indexAt(ev), Math.round((Math.round(raw / step) * step) * 100) / 100);
    };
    apply(e);
    const up = () => {
      window.removeEventListener("pointermove", apply);
      window.removeEventListener("pointerup", up);
      stopRef.current = null;
      setFrozenScale(null);
    };
    window.addEventListener("pointermove", apply);
    window.addEventListener("pointerup", up);
    stopRef.current = up;
  };

  return (
    <div class="mg-paint" style={{ gridTemplateColumns: `${yWidth}px minmax(0, 1fr)` }}>
      <div class="mg-paint__y" style={{ height: `${height}px` }}>
        <span>{formatTop(sc)}</span>
        <span>{f2(sc / 2)}</span>
        <span>0</span>
      </div>
      <div ref={plotRef} class="mg-paint__plot" style={{ height: `${height}px` }} onPointerDown={onPointerDown} role="group" aria-label={ariaLabel}>
        <div class="mg-paint__grid mg-paint__grid--mid" />
        <div class="mg-paint__grid mg-paint__grid--top" />
        {values.map((v, i) => (
          <div key={i} class="mg-paint__col" title={`${String(i).padStart(2, "0")}:00 · ${f2(v)} kW`}>
            {showValues && <span class="mg-paint__val">{v ? f2(v).replace(/^0/, "") : ""}</span>}
            <div class={`mg-paint__bar${v === peak && v > 0 ? " is-peak" : ""}`} style={{ height: `${(Math.min(v, sc) / sc) * 100}%` }} />
          </div>
        ))}
      </div>
      <div />
      <div class="mg-paint__hours">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i}>{i % 3 === 0 ? String(i).padStart(2, "0") : ""}</span>
        ))}
      </div>
    </div>
  );
}
