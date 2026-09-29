import { useState } from "preact/hooks";
import { Trash2, X } from "lucide-preact";
import type { Load } from "../../database/models/load";
import { LOAD_LABELS } from "../../data/loadLabels";
import { BUILDING_SIZE_PEAK_KW, normalizedShape, type BuildingSize, type LoadPattern } from "../../utils/loadProfiler";
import { f1, f2, sum } from "../../utils/format";
import { Button, Drawer, IconButton, LoadIcon, NumberField, PaintBars, Segmented, SelectField, STROKE, num } from "../ui";
import "../../css/drawers.css";

/**
 * true  = pointer-drag paints every bar the cursor crosses (the design's "draw the profile").
 * false = a drag only changes the bar it started on.
 */
const PAINT_ACROSS_BARS = true;

/** Peak kW for the pattern presets when editing a single appliance. */
const APPLIANCE_PEAK_KW: Record<BuildingSize, number> = { small: 0.4, medium: 1, large: 2.5 };

const zeros = () => Array(24).fill(0) as number[];
const clean24 = (p: unknown): number[] => (Array.isArray(p) && p.length === 24 ? p.map((v) => num(v)) : zeros());
const snap = (v: number) => Math.round(v * 20) / 20; // 0.05 kW
const ceilHalf = (v: number) => Math.ceil(v * 2) / 2;

export type ProfilerSave = {
  name: string;
  labelId: string;
  profile: number[];
  /** "none" (Standalone) or a building id; undefined for buildings (stay top-level). */
  parentId?: string;
};

type LoadProfilerDrawerProps = {
  load: Load;
  /** Current parent id, or "none" for top-level. */
  parentId: string;
  /** Editing a building's own (shared) profile rather than an appliance. */
  isGroup: boolean;
  /** Buildings a load can belong to. */
  groups: { id: string; name: string }[];
  onClose: () => void;
  onSave: (result: ProfilerSave) => void;
  onDelete: () => void;
};

export default function LoadProfilerDrawer({ load, parentId: initialParentId, isGroup, groups, onClose, onSave, onDelete }: LoadProfilerDrawerProps) {
  const [name, setName] = useState(load.name);
  const [labelId, setLabelId] = useState(load.labelId);
  const [parentId, setParentId] = useState(initialParentId);
  // Raw hourly shape; the saved profile is max(base, shape) so base load stays reversible.
  const [shape, setShape] = useState<number[]>(() => clean24(load.profile));
  const [baseRaw, setBaseRaw] = useState("0");
  const [pattern, setPattern] = useState<LoadPattern | null>(null);
  const [size, setSize] = useState<BuildingSize | null>(null);
  const [scale, setScale] = useState(() => Math.max(1, ceilHalf(Math.max(...clean24(load.profile), 0) * 1.6)));

  const base = Math.max(0, num(baseRaw));
  const profile = shape.map((v) => Math.max(base, v));
  const peak = Math.max(...profile, 0);

  const applyPattern = (p: LoadPattern, s: BuildingSize) => {
    const peakKw = isGroup ? BUILDING_SIZE_PEAK_KW[p][s] : APPLIANCE_PEAK_KW[s];
    const next = normalizedShape(p).map((v) => snap(v * peakKw));
    setShape(next);
    setPattern(p);
    setSize(s);
    setScale((sc) => Math.max(sc, ceilHalf(Math.max(base, ...next) * 1.3)));
  };

  const onBase = (raw: string) => {
    setBaseRaw(raw);
    const b = Math.max(0, num(raw));
    setScale((sc) => Math.max(sc, ceilHalf(b * 1.5)));
  };

  const clear = () => {
    setShape(zeros());
    setPattern(null);
  };

  const paint = (hour: number, value: number) => {
    setShape((prev) => {
      const next = [...prev];
      next[hour] = value;
      return next;
    });
    setPattern(null);
  };

  const typeOptions = LOAD_LABELS.filter((l) => l.canNest === isGroup).map((l) => ({ id: l.id, name: l.name }));
  if (!typeOptions.some((o) => o.id === labelId)) {
    const current = LOAD_LABELS.find((l) => l.id === labelId);
    if (current) typeOptions.unshift({ id: current.id, name: current.name });
  }
  const parentOptions = [{ id: "none", name: "Standalone" }, ...groups];

  const save = () =>
    onSave({
      name: name.trim() || load.name,
      labelId,
      profile: profile.map((v) => Math.round(v * 100) / 100),
      parentId: isGroup ? undefined : parentId,
    });

  return (
    <Drawer
      open
      onClose={onClose}
      width={760}
      label="Load profiler"
      bodyClass="mg-pf-body"
      header={
        <>
          <span class="mg-tile mg-pf-tile">
            <LoadIcon labelId={labelId} size={18} />
          </span>
          <input
            class="mg-pf-name"
            value={name}
            aria-label={isGroup ? "Building name" : "Load name"}
            onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
          />
          <IconButton label="Close" size="lg" onClick={onClose}>
            <X size={18} strokeWidth={STROKE} />
          </IconButton>
        </>
      }
      footer={
        <>
          <Button variant="danger-ghost" icon={<Trash2 size={16} strokeWidth={STROKE} />} onClick={onDelete}>
            {isGroup ? "Delete building" : "Delete load"}
          </Button>
          <span style={{ flex: 1 }} />
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            {isGroup ? "Save building" : "Save load"}
          </Button>
        </>
      }
    >
      <div class="mg-pf-fields">
        <SelectField key={`${load.id}-type`} label="Type" value={labelId} onValue={setLabelId} options={typeOptions} />
        {!isGroup && (
          <SelectField key={`${load.id}-parent-${groups.length}`} label="Belongs to" value={parentId} onValue={setParentId} options={parentOptions} />
        )}
        <NumberField label="Base load (always on)" unit="kW" step={0.05} min={0} value={baseRaw} onValue={onBase} />
      </div>

      <div class="mg-pf-card">
        <div class="mg-pf-card__head">
          <span class="mg-pf-card__title">{isGroup ? "Shared 24-hour profile" : "24-hour profile"}</span>
          <Segmented<LoadPattern>
            ariaLabel="Usage pattern"
            value={pattern}
            onChange={(p) => applyPattern(p, size ?? "medium")}
            options={[
              { id: "residential", label: "Residential" },
              { id: "commercial", label: "Commercial" },
            ]}
          />
          <Segmented<BuildingSize>
            ariaLabel="Size"
            value={size}
            onChange={(s) => applyPattern(pattern ?? "residential", s)}
            options={[
              { id: "small", label: "Small" },
              { id: "medium", label: "Medium" },
              { id: "large", label: "Large" },
            ]}
          />
          <button type="button" class="mg-pf-clear" onClick={clear}>
            Clear
          </button>
        </div>

        <PaintBars
          values={profile}
          scale={scale}
          height={260}
          yWidth={40}
          showValues
          step={0.05}
          paintAcross={PAINT_ACROSS_BARS}
          ariaLabel="Hourly load profile. Drag to draw."
          onPaint={paint}
        />
        <div class="mg-pf-caption">Drag across the bars to draw the profile, or start from a pattern.</div>
      </div>

      <div class="mg-pf-stats">
        <div class="mg-stat">
          <div class="mg-stat__label">Peak</div>
          <div class="mg-stat__value">{f2(peak)} kW</div>
        </div>
        <div class="mg-stat">
          <div class="mg-stat__label">Energy per day</div>
          <div class="mg-stat__value">{f1(sum(profile))} kWh</div>
        </div>
        <div class="mg-stat">
          <div class="mg-stat__label">Hours in use</div>
          <div class="mg-stat__value">{profile.filter((v) => v > base).length} h</div>
        </div>
      </div>
    </Drawer>
  );
}
