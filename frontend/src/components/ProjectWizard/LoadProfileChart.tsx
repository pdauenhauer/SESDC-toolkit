import { useCallback, useRef } from "preact/hooks";

const HOURS = 24;
const VIEW_W = 576;
const VIEW_H = 140;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 24;
const PAD_B = 22;
const INNER_W = VIEW_W - PAD_L - PAD_R;
const INNER_H = VIEW_H - PAD_T - PAD_B;

type Props = {
  loads: number[];
  baseLoadKw: number;
  onLoadsChange: (next: number[]) => void;
  /** Soft cap for the chart scale (kW). */
  maxKwHint?: number;
};

export default function LoadProfileChart({ loads, baseLoadKw, onLoadsChange, maxKwHint = 24 }: Props) {
  const captureElRef = useRef<Element | null>(null);
  const dragRef = useRef<{
    hour: number;
    startClientY: number;
    startVal: number;
    kwPerPixel: number;
  } | null>(null);
  const DRAG_CAP_KW = 500;

  const maxVal =
    Math.max(4, maxKwHint, baseLoadKw + 0.5, ...loads.map((v) => v || 0)) * 1.08;

  const barW = INNER_W / HOURS;
  const toY = (kw: number) => PAD_T + INNER_H * (1 - kw / maxVal);

  const setHour = useCallback(
    (hour: number, kw: number) => {
      const clamped = Math.max(baseLoadKw, Math.min(DRAG_CAP_KW, kw));
      const next = [...loads];
      if (next.length !== HOURS) {
        for (let i = 0; i < HOURS; i++) next[i] = next[i] ?? 0;
      }
      next[hour] = Math.round(clamped * 100) / 100;
      onLoadsChange(next);
    },
    [loads, baseLoadKw, onLoadsChange]
  );

  const onBarPointerDown = (hour: number, e: Event) => {
    const pe = e as PointerEvent;
    pe.preventDefault();
    const el = e.currentTarget as Element;
    captureElRef.current = el;
    dragRef.current = {
      hour,
      startClientY: pe.clientY,
      startVal: loads[hour] ?? 0,
      kwPerPixel: maxVal / INNER_H
    };

    const onMove = (ev: Event) => {
      const d = dragRef.current;
      if (!d) return;
      const p = ev as PointerEvent;
      const dy = p.clientY - d.startClientY;
      const deltaKw = -dy * d.kwPerPixel;
      setHour(d.hour, d.startVal + deltaKw);
    };

    const onUp = (ev: Event) => {
      const p = ev as PointerEvent;
      try {
        captureElRef.current?.releasePointerCapture?.(p.pointerId);
      } catch {
        /* ignore */
      }
      captureElRef.current = null;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      dragRef.current = null;
    };

    el.setPointerCapture?.(pe.pointerId);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  const baseY = toY(baseLoadKw);

  return (
    <div class="w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <svg
        class="mx-auto block touch-none select-none"
        width="100%"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ maxWidth: "640px" }}
        role="img"
        aria-label="24-hour load profile, drag bars to adjust kW"
      >
        <line
          x1={PAD_L}
          x2={VIEW_W - PAD_R}
          y1={baseY}
          y2={baseY}
          stroke="#037f6f"
          strokeOpacity={0.35}
          strokeDasharray="4 3"
        />
        <text
          x={PAD_L}
          y={Math.max(12, baseY - 4)}
          fill="#037f6f"
          fontSize="9"
          fontWeight="600"
        >
          Base {baseLoadKw.toFixed(2)} kW
        </text>

        {Array.from({ length: HOURS }, (_, h) => {
          const v = loads[h] ?? 0;
          const x = PAD_L + h * barW + 0.5;
          const yTop = toY(v);
          const hBar = Math.max(0, VIEW_H - PAD_B - yTop);
          const active = v > baseLoadKw + 0.01;
          return (
            <g key={h}>
              <rect
                x={x}
                y={yTop}
                width={Math.max(1, barW - 1)}
                height={hBar}
                rx={3}
                fill={active ? "#037f6f" : "#94a3b8"}
                fillOpacity={active ? 0.85 : 0.35}
                stroke="#0f172a"
                strokeOpacity={0.06}
              />
              <rect
                x={x - 1}
                y={PAD_T}
                width={barW + 1}
                height={INNER_H}
                fill="transparent"
                style={{ cursor: "ns-resize" }}
                onPointerDown={onBarPointerDown.bind(null, h)}
              />
              <title>{`Hour ${h}:00 — ${v.toFixed(2)} kW`}</title>
              {h % 3 === 0 && (
                <text
                  x={x + barW / 2}
                  y={VIEW_H - 6}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                >
                  {h}
                </text>
              )}
              {v >= 0.05 && (
                <text
                  x={x + barW / 2}
                  y={yTop - 3}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="8"
                  fontWeight="600"
                >
                  {v < 10 ? v.toFixed(1) : Math.round(v)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p class="mt-2 text-center text-xs text-slate-500">
        Drag any hour up or down to set load (kW). Values cannot go below base load.
      </p>
    </div>
  );
}
