import { ChevronDown, ChevronRight, Sparkles } from "lucide-preact";
import { BUILDING_SIZE_COPY, buildHourlyLoads, type BuildingSize, type LoadPattern } from "../../utils/loadProfiler";
import { SOLAR_PRESETS, BATTERY_PRESETS, isSolarPresetPremium, isSolarPresetStandard } from "./constants";
import { f1, fMoneyFull, hourLabel, sum } from "../../utils/format";
import { NumberField, PaintBars, SOURCE_META, SOURCE_OFF, STROKE, TextField, num, type SourceId } from "../ui";
import { COST_RATES, STEPS, effectiveLoads, sourceSummary, suggestions, type WizardData } from "./model";

type Upd = (fn: (d: WizardData) => void) => void;
type Dict = Record<string, any>;

const getIn = (o: Dict, path: string): any => path.split(".").reduce<any>((acc, k) => acc?.[k], o);
function setIn(o: Dict, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = o;
  keys.slice(0, -1).forEach((k) => (cur = cur[k] ??= {}));
  cur[keys[keys.length - 1]] = value;
}

/* ---------------- Project ---------------- */

export function ProjectStep({ d, upd }: { d: WizardData; upd: Upd }) {
  return (
    <div class="mg-wz__stack">
      <TextField label="Project name" labelStyle="strong" size="xl" value={d.name} placeholder="e.g. Kisumu Village" onValue={(v) => upd((x) => (x.name = v))} />
      <TextField
        label={
          <>
            Description <span class="mg-faint" style={{ fontWeight: 400 }}>· optional</span>
          </>
        }
        labelStyle="strong"
        multiline
        value={d.description}
        placeholder="Who the microgrid serves and what it needs to power"
        onValue={(v) => upd((x) => (x.description = v))}
      />
      <div class="mg-wz__group" style={{ paddingTop: "6px" }}>
        <div class="mg-wz__group-title">Site location</div>
        <TextField label="Place name · optional" value={d.location.name} placeholder="e.g. Nairobi field site" onValue={(v) => upd((x) => (x.location.name = v))} />
        <div class="mg-wz__grid">
          <NumberField label="Latitude" unit="°" value={d.location.latitude} onValue={(v) => upd((x) => (x.location.latitude = v))} />
          <NumberField label="Longitude" unit="°" value={d.location.longitude} onValue={(v) => upd((x) => (x.location.longitude = v))} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Demand ---------------- */

export type TimeBlock = { key: string; label: string; start: number; end: number; kw: string | number };

export const initialBlocks = (): TimeBlock[] => [
  { key: "morning", label: "Morning", start: 6, end: 12, kw: 2 },
  { key: "afternoon", label: "Afternoon", start: 12, end: 18, kw: 2.5 },
  { key: "evening", label: "Evening", start: 18, end: 24, kw: 3 },
  { key: "night", label: "Night", start: 0, end: 6, kw: 1 },
];

const hoursIn = (a: number, b: number): number[] => {
  const all = Array.from({ length: 24 }, (_, h) => h);
  if (a === b) return all;
  return a < b ? all.filter((h) => h >= a && h < b) : all.filter((h) => h >= a || h < b);
};

const SIZE_RANGE: Record<BuildingSize, string> = { small: "<1 kW", medium: "~2-5 kW", large: ">5-15+ kW" };
const PATTERNS: { id: LoadPattern; label: string; hint: string }[] = [
  { id: "residential", label: "Residential", hint: "Evening peak (Typical Homes and Dwellings)" },
  { id: "commercial", label: "Commercial", hint: "Daytime peak (Offices, Retail, and Small Industry Buildings)" },
];

type DemandStepProps = {
  d: WizardData;
  upd: Upd;
  blocks: TimeBlock[];
  blocksOpen: boolean;
  overlapError: string;
  setBlocksOpen: (open: boolean) => void;
  /** Apply time blocks; returns an error message when `changedKey`'s range overlaps another block. */
  applyBlocks: (next: TimeBlock[], changedKey?: string) => void;
};

export function DemandStep({ d, upd, blocks, blocksOpen, overlapError, setBlocksOpen, applyBlocks }: DemandStepProps) {
  const loads = effectiveLoads(d);
  const daily = sum(loads);
  const peak = Math.max(...loads, 0);
  const scale = Math.min(500, Math.max(2, Math.ceil(peak * 1.25)));
  const hourOptions = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div class="mg-wz__stack mg-wz__stack--lg">
      <div class="mg-wz__group" style={{ gap: "8px" }}>
        <div class="mg-wz__group-title">Usage pattern</div>
        <div class="mg-opt-grid">
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              class={`mg-option${d.pattern === p.id ? " is-selected" : ""}`}
              aria-pressed={d.pattern === p.id}
              onClick={() =>
                upd((x) => {
                  x.pattern = p.id;
                  if (x.size) x.shape = buildHourlyLoads(p.id, x.size);
                })
              }
            >
              <span class="mg-option__title">{p.label}</span>
              <span class="mg-option__hint">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {d.pattern && (
        <div class="mg-wz__group" style={{ gap: "8px", animation: "mg-in 180ms ease-out" }}>
          <div class="mg-wz__group-title">Building size</div>
          <div class="mg-opt-grid mg-opt-grid--sizes">
            {(["small", "medium", "large"] as BuildingSize[]).map((s) => {
              const copy = BUILDING_SIZE_COPY[d.pattern!][s];
              return (
                <button
                  key={s}
                  type="button"
                  class={`mg-option mg-option--size${d.size === s ? " is-selected" : ""}`}
                  aria-pressed={d.size === s}
                  onClick={() =>
                    upd((x) => {
                      x.size = s;
                      x.shape = buildHourlyLoads(x.pattern!, s);
                    })
                  }
                >
                  <span class="mg-option__row">
                    <span class="mg-option__title">{copy.title}</span>
                    <span class="mg-option__range">{SIZE_RANGE[s]}</span>
                  </span>
                  <span class="mg-option__hint">{copy.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div class="mg-profile">
        <div class="mg-profile__head">
          <div class="mg-profile__title">
            <span style={{ fontWeight: 600 }}>Hourly load profile</span>
            <span class="mg-caption">
              {daily ? `Peak ${f1(peak)} kW · ${f1(daily)} kWh per day` : "Pick a pattern and size, or draw the profile directly"}
            </span>
          </div>
        </div>
        <PaintBars
          values={loads}
          scale={scale}
          height={200}
          yWidth={34}
          step={0.1}
          formatTop={(s) => `${s} kW`}
          ariaLabel="Hourly load profile. Drag across the bars to adjust hours."
          onPaint={(h, v) => upd((x) => (x.shape[h] = v))}
        />
        <div class="mg-caption mg-faint">Drag across the bars to adjust individual hours, or set loads by time of day below.</div>
      </div>

      <div class="mg-wz__group" style={{ gap: "8px" }}>
        <button type="button" class="mg-disclosure" aria-expanded={blocksOpen} onClick={() => setBlocksOpen(!blocksOpen)}>
          {blocksOpen ? <ChevronDown size={15} strokeWidth={STROKE} /> : <ChevronRight size={15} strokeWidth={STROKE} />}
          <span>Set loads by time of day</span>
        </button>
        {blocksOpen && (
          <div class="mg-blocks">
            {blocks.map((b) => (
              <div key={b.key} class="mg-block-row">
                <span class="mg-block-row__label">{b.label}</span>
                <select
                  class="mg-select mg-select--sm"
                  aria-label={`${b.label} start`}
                  value={b.start}
                  onChange={(e) => applyBlocks(blocks.map((x) => (x.key === b.key ? { ...x, start: Number((e.currentTarget as HTMLSelectElement).value) } : x)), b.key)}
                >
                  {hourOptions.map((h) => (
                    <option key={h} value={h} selected={h === b.start}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <select
                  class="mg-select mg-select--sm"
                  aria-label={`${b.label} end`}
                  value={b.end === 24 ? 0 : b.end}
                  onChange={(e) => {
                    const r = Number((e.currentTarget as HTMLSelectElement).value);
                    applyBlocks(blocks.map((x) => (x.key === b.key ? { ...x, end: r === 0 ? 24 : r } : x)), b.key);
                  }}
                >
                  {hourOptions.map((h) => (
                    <option key={h} value={h} selected={h === (b.end === 24 ? 0 : b.end)}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
                <span class="mg-input-wrap">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    aria-label={`${b.label} load`}
                    class="mg-input mg-input--sm has-unit"
                    value={b.kw}
                    onInput={(e) => applyBlocks(blocks.map((x) => (x.key === b.key ? { ...x, kw: (e.currentTarget as HTMLInputElement).value } : x)))}
                  />
                  <span class="mg-input-unit">kW</span>
                </span>
              </div>
            ))}
            {overlapError && (
              <div role="alert" class="mg-alert">
                {overlapError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Build a shape from non-overlapping time blocks (0 outside blocks). */
export function shapeFromBlocks(blocks: TimeBlock[]): number[] {
  const shape = Array(24).fill(0) as number[];
  blocks.forEach((b) => hoursIn(b.start, b.end).forEach((h) => (shape[h] = Math.round(num(b.kw) * 100) / 100)));
  return shape;
}

/** Name of a block that `changed` overlaps, or null. */
export function blockOverlap(blocks: TimeBlock[], changedKey: string): { changed: TimeBlock; clash: TimeBlock } | null {
  const changed = blocks.find((b) => b.key === changedKey);
  if (!changed) return null;
  const hrs = new Set(hoursIn(changed.start, changed.end));
  const clash = blocks.find((b) => b.key !== changedKey && hoursIn(b.start, b.end).some((h) => hrs.has(h)));
  return clash ? { changed, clash } : null;
}

/* ---------------- Sources ---------------- */

type Field = { label: string; path: string; unit: string };
const COST_FIELDS: Field[] = [
  { label: "Capital cost", path: "costs.capital", unit: "$" },
  { label: "Lifespan", path: "lifespan", unit: "yr" },
  { label: "Operating cost", path: "costs.opDollar", unit: "$/yr" },
  { label: "Replacement cost", path: "costs.repDollar", unit: "$" },
];
const ADVANCED: Record<SourceId, { label: string; sections: { title: string; fields: Field[] }[] }> = {
  solar: {
    label: "Fine-tune losses and costs",
    sections: [
      {
        title: "System losses",
        fields: [
          { label: "Wire", path: "losses.wire", unit: "%" },
          { label: "Dust", path: "losses.dust", unit: "%" },
          { label: "Mismatch", path: "losses.mismatch", unit: "%" },
          { label: "Aging", path: "losses.aging", unit: "%/yr" },
          { label: "Converter", path: "losses.converter", unit: "%" },
        ],
      },
      { title: "Costs & lifespan", fields: COST_FIELDS },
    ],
  },
  battery: { label: "Fine-tune costs", sections: [{ title: "Costs & lifespan", fields: COST_FIELDS }] },
  wind: {
    label: "Fine-tune speeds and costs",
    sections: [
      {
        title: "Wind speeds",
        fields: [
          { label: "Cut-in", path: "speeds.cutIn", unit: "m/s" },
          { label: "Rated", path: "speeds.rated", unit: "m/s" },
          { label: "Cut-out", path: "speeds.cutOut", unit: "m/s" },
        ],
      },
      { title: "Costs & lifespan", fields: COST_FIELDS },
    ],
  },
  generator: {
    label: "Fine-tune fuel and costs",
    sections: [
      { title: "Fuel", fields: [{ label: "Fuel price", path: "costs.fuelPrice", unit: "$/L" }] },
      { title: "Costs & lifespan", fields: COST_FIELDS },
    ],
  },
};

/** Capital cost per unit of the main size field, as the old wizard auto-filled it. */
function capitalRate(id: SourceId, s: Dict): number {
  if (id === "solar") return num(s.losses?.wire) === 1 ? COST_RATES.solarPrem : COST_RATES.solarStd;
  if (id === "battery") return s.type === "Lead-Acid" ? COST_RATES.lead : COST_RATES.lithium;
  if (id === "wind") return COST_RATES.wind;
  return COST_RATES.gen;
}

type SourceStepProps = { id: SourceId; d: WizardData; upd: Upd; advOpen: boolean; setAdvOpen: (open: boolean) => void };

export function SourceStep({ id, d, upd, advOpen, setAdvOpen }: SourceStepProps) {
  const s = d[id];
  const on = !!s.enabled;
  const name = SOURCE_META[id].name;
  const sugg = suggestions(effectiveLoads(d));

  // The size field also re-derives capital cost from the per-unit rate.
  const sizeField = (label: string, path: string, unit: string, suggestion?: number) => (
    <NumberField
      key={path}
      label={label}
      labelStyle="strong"
      size="lg"
      unit={unit}
      min={0}
      placeholder="0"
      value={getIn(s, path) ?? ""}
      onValue={(raw) =>
        upd((x) => {
          setIn(x[id], path, raw);
          x[id].costs.capital = num(raw) * capitalRate(id, x[id]);
        })
      }
    >
      {!!suggestion && (
        <button
          type="button"
          class="mg-suggest"
          onClick={(e) => {
            e.preventDefault();
            upd((x) => {
              setIn(x[id], path, suggestion);
              x[id].costs.capital = suggestion * capitalRate(id, x[id]);
            });
          }}
        >
          <Sparkles size={14} strokeWidth={STROKE} />
          <span>
            Suggested {suggestion} {unit} for your demand
          </span>
        </button>
      )}
    </NumberField>
  );

  const plainField = (label: string, path: string, unit: string) => (
    <NumberField key={path} label={label} labelStyle="strong" size="lg" unit={unit} min={0} placeholder="0" value={getIn(s, path) ?? ""} onValue={(raw) => upd((x) => setIn(x[id], path, raw))} />
  );

  type Preset = { key: string; label: string; hint: string; active: boolean; apply: () => void };
  let presetTitle = "";
  let presets: Preset[] = [];
  if (id === "solar") {
    presetTitle = "Quick presets";
    presets = (["standard", "premium"] as const).map((k) => ({
      key: k,
      label: k === "standard" ? "Standard" : "Premium",
      hint: k === "standard" ? "Average efficiency · $1,000/kW" : "High efficiency · $1,500/kW",
      active: k === "standard" ? isSolarPresetStandard(s.losses) : isSolarPresetPremium(s.losses),
      apply: () =>
        upd((x) => {
          x.solar.losses = { ...SOLAR_PRESETS[k].losses };
          x.solar.costs.capital = num(x.solar.sizeKw) * SOLAR_PRESETS[k].costPerKw;
        }),
    }));
  } else if (id === "battery") {
    presetTitle = "Battery technology";
    presets = [
      { p: BATTERY_PRESETS.lithium, hint: "High performance, 10 yr life" },
      { p: BATTERY_PRESETS.lead, hint: "Lower cost, 5 yr life" },
    ].map(({ p, hint }) => ({
      key: p.type,
      label: p.type,
      hint,
      active: s.type === p.type,
      apply: () =>
        upd((x) => {
          x.battery.type = p.type;
          x.battery.lifespan = p.lifespan;
          x.battery.costs.capital = num(x.battery.storageKwh) * p.costPerKwh;
        }),
    }));
  }

  const main =
    id === "solar"
      ? [sizeField("System size", "sizeKw", "kW", sugg.solar)]
      : id === "battery"
        ? [sizeField("Capacity", "storageKwh", "kWh", sugg.battery), plainField("Charge rate", "chargeKw", "kW")]
        : id === "wind"
          ? [sizeField("Nameplate", "nameplateKw", "kW"), plainField("Power per turbine", "powerPerTurbineKw", "kW")]
          : [sizeField("Capacity", "capacityKw", "kW", sugg.generator)];

  return (
    <div class="mg-wz__stack mg-wz__stack--lg">
      <button type="button" class="mg-include" role="switch" aria-checked={on} onClick={() => upd((x) => (x[id].enabled = !on))}>
        <span class="mg-include__text">
          <span class="mg-include__title">Include {name.toLowerCase()} in this system</span>
          <span class="mg-caption">{on ? "Turn off to skip this step" : "Currently skipped"}</span>
        </span>
        <span class={`mg-switch mg-switch--lg${on ? " is-on" : ""}`} aria-hidden="true">
          <span class="mg-switch__knob" />
        </span>
      </button>

      {on ? (
        <div class="mg-wz__stack mg-wz__stack--lg" style={{ animation: "mg-in 180ms ease-out" }}>
          {presets.length > 0 && (
            <div class="mg-wz__group" style={{ gap: "8px" }}>
              <div class="mg-wz__group-title">{presetTitle}</div>
              <div class="mg-opt-grid">
                {presets.map((p) => (
                  <button key={p.key} type="button" class={`mg-option${p.active ? " is-selected" : ""}`} aria-pressed={p.active} onClick={p.apply}>
                    <span class="mg-option__title">{p.label}</span>
                    <span class="mg-option__hint">{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div class="mg-wz__grid mg-wz__grid--main">{main}</div>

          <div class="mg-wz__group" style={{ gap: "8px" }}>
            <button type="button" class="mg-disclosure" aria-expanded={advOpen} onClick={() => setAdvOpen(!advOpen)}>
              {advOpen ? <ChevronDown size={15} strokeWidth={STROKE} /> : <ChevronRight size={15} strokeWidth={STROKE} />}
              <span>{ADVANCED[id].label}</span>
            </button>
            {advOpen && (
              <div class="mg-panel-box">
                {ADVANCED[id].sections.map((sec) => (
                  <div key={sec.title} class="mg-wz__group">
                    <div class="mg-caption">{sec.title}</div>
                    <div class="mg-field-grid">
                      {sec.fields.map((f) => (
                        <NumberField key={f.path} label={f.label} unit={f.unit} size="sm" value={getIn(s, f.path) ?? ""} onValue={(raw) => upd((x) => setIn(x[id], f.path, raw))} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div class="mg-off-note">{name} won't be part of this system. You can add it later from the workbench.</div>
      )}
    </div>
  );
}

/* ---------------- Economics ---------------- */

const ECO_SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Revenue & inflation",
    fields: [
      { label: "Energy price", path: "energyPrice", unit: "$/kWh" },
      { label: "Inflation", path: "inflationPct", unit: "%/yr" },
    ],
  },
  {
    title: "Recurring costs",
    fields: [
      { label: "Labor", path: "laborCost", unit: "$/yr" },
      { label: "Land lease", path: "landLeasingCost", unit: "$/yr" },
    ],
  },
  {
    title: "One-time costs",
    fields: [
      { label: "Licensing", path: "licensingCost", unit: "$" },
      { label: "Other CAPEX", path: "otherCapex", unit: "$" },
    ],
  },
];

export function EconomicsStep({ d, upd }: { d: WizardData; upd: Upd }) {
  return (
    <div class="mg-wz__stack">
      {ECO_SECTIONS.map((sec) => (
        <div key={sec.title} class="mg-wz__group">
          <div class="mg-wz__group-title">{sec.title}</div>
          <div class="mg-wz__grid mg-wz__grid--wide">
            {sec.fields.map((f) => (
              <NumberField key={f.path} label={f.label} unit={f.unit} min={0} value={d.economics[f.path] ?? ""} onValue={(raw) => upd((x) => (x.economics[f.path] = raw))} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Review ---------------- */

export function ReviewStep({ d, go }: { d: WizardData; go: (step: number) => void }) {
  const loads = effectiveLoads(d);
  const daily = sum(loads);
  const peak = Math.max(...loads, 0);
  const ProjectIcon = STEPS[0].Icon;
  const DemandIcon = STEPS[1].Icon;
  const EcoIcon = STEPS[6].Icon;
  const accent = { background: "var(--mg-accent-tint)", color: "var(--mg-accent)" };

  const rows = [
    {
      label: "Project",
      Icon: ProjectIcon,
      tile: accent,
      value: [d.name.trim() || "Unnamed", d.location.name.trim(), `${d.location.latitude}, ${d.location.longitude}`].filter(Boolean).join(" · "),
      step: 0,
    },
    {
      label: "Demand",
      Icon: DemandIcon,
      tile: accent,
      value: daily
        ? `${f1(daily)} kWh per day · ${f1(peak)} kW peak${d.pattern ? ` · ${d.pattern}${d.size ? `, ${d.size}` : ""}` : ""}`
        : "No load profile yet. You can add loads on the workbench.",
      warn: !daily,
      step: 1,
    },
    ...(["solar", "battery", "wind", "generator"] as SourceId[]).map((id, i) => {
      const s = d[id];
      const m = SOURCE_META[id];
      return {
        label: m.name,
        Icon: m.Icon,
        tile: s.enabled ? { background: m.tileBg, color: m.tileFg } : { background: SOURCE_OFF.tileBg, color: SOURCE_OFF.tileFg },
        value: s.enabled ? `${sourceSummary(id, s)} · ${fMoneyFull(num(s.costs?.capital))} capital · ${num(s.lifespan)} yr life` : "Not included",
        step: 2 + i,
      };
    }),
    {
      label: "Economics",
      Icon: EcoIcon,
      tile: accent,
      value: `$${num(d.economics.energyPrice)}/kWh · ${num(d.economics.inflationPct)}% inflation · ${fMoneyFull(num(d.economics.laborCost) + num(d.economics.landLeasingCost))}/yr recurring`,
      step: 6,
    },
  ];

  return (
    <div class="mg-card mg-review">
      {rows.map((r) => (
        <div key={r.label} class="mg-review__row">
          <span class="mg-review__icon" style={r.tile}>
            <r.Icon size={16} strokeWidth={STROKE} />
          </span>
          <span class="mg-review__text">
            <span class="mg-review__label">{r.label}</span>
            <span class={`mg-review__value${r.warn ? " is-warn" : ""}`}>{r.value}</span>
          </span>
          <button type="button" class="mg-btn mg-btn--ghost mg-btn--sm" onClick={() => go(r.step)}>
            Edit
          </button>
        </div>
      ))}
    </div>
  );
}
