import { useEffect, useRef, useState } from "preact/hooks";
import { ChevronLeft, ChevronRight } from "lucide-preact";
import { IconButton, STROKE } from "../ui";

type Props = {
  year: number;
  /** Number of simulated years; 1 means this run only has year 1. */
  years: number;
  onYear: (year: number) => void;
  loading: boolean;
};

/**
 * Year picker for every chart on the Graphs tab. It sticks to the top of the
 * page while scrolling, so the year can be changed from any chart.
 */
export default function YearBar({ year, years, onYear, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const single = years <= 1;

  // Show a shadow once the bar is pinned (its sentinel has scrolled out of view).
  useEffect(() => {
    const el = ref.current;
    const sentinel = el?.previousElementSibling;
    if (!el || !sentinel || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { root: el.closest(".mg-main"), threshold: 0 });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div class="mg-yearbar__sentinel" aria-hidden="true" />
      <div ref={ref} class={`mg-yearbar${stuck ? " is-stuck" : ""}`} role="toolbar" aria-label="Year shown in the charts">
        <span class="mg-yearbar__label">Year</span>
        <IconButton label="Previous year" disabled={single || year <= 1} onClick={() => onYear(year - 1)}>
          <ChevronLeft size={16} strokeWidth={STROKE} />
        </IconButton>
        <select
          class="mg-select mg-select--sm mg-yearbar__select"
          aria-label="Year to show"
          value={year}
          disabled={single}
          onChange={(e) => onYear(Number((e.currentTarget as HTMLSelectElement).value))}
        >
          {Array.from({ length: Math.max(1, years) }, (_, i) => (
            <option key={i + 1} value={i + 1} selected={i + 1 === year}>
              Year {i + 1}
            </option>
          ))}
        </select>
        <IconButton label="Next year" disabled={single || year >= years} onClick={() => onYear(year + 1)}>
          <ChevronRight size={16} strokeWidth={STROKE} />
        </IconButton>
        <span class="mg-yearbar__note">
          {single
            ? "This run only covers year 1. Re-run the simulation to see all 20 years."
            : loading
              ? `Loading year ${year}…`
              : `of ${years} · applies to every chart below`}
        </span>
      </div>
    </>
  );
}
