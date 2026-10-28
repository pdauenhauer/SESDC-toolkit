import { useState } from "preact/hooks";
import { X } from "lucide-preact";
import type { Project } from "../../database/models/metadata";
import {
  BATTERY_PRESETS,
  INITIAL_PROJECT_DATA,
  SOLAR_PRESETS,
  isSolarPresetPremium,
  isSolarPresetStandard,
} from "../wizard/constants";
import { Button, Drawer, IconButton, NumberField, SOURCE_IDS, SOURCE_META, STROKE, Switch, num, type SourceId } from "../ui";
import { normalizeNumbers } from "../../utils/normalize";
import "../../css/drawers.css";

type Dict = Record<string, any>;
export type SupplyDraft = Record<SourceId, Dict>;

type FieldDef = { label: string; path: string; unit: string };
type SectionDef = { title: string; fields: FieldDef[] };

// Cost fields match what the simulation reads (see services/simulation.ts costFields).
const COSTS: SectionDef = {
  title: "Costs & lifespan",
  fields: [
    { label: "Capital cost", path: "costs.capital", unit: "$" },
    { label: "O&M per year", path: "costs.opDollar", unit: "$/yr" },
    { label: "Replacement", path: "costs.repDollar", unit: "$" },
    { label: "Lifespan", path: "lifespan", unit: "yr" },
  ],
};

const SECTIONS: Record<SourceId, SectionDef[]> = {
  solar: [
    { title: "Array", fields: [{ label: "System size", path: "sizeKw", unit: "kW" }] },
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
    COSTS,
  ],
  battery: [
    {
      title: "Storage",
      fields: [
        { label: "Capacity", path: "storageKwh", unit: "kWh" },
        { label: "Charge rate", path: "chargeKw", unit: "kW" },
      ],
    },
    COSTS,
  ],
  wind: [
    {
      title: "Turbines",
      fields: [
        { label: "Nameplate", path: "nameplateKw", unit: "kW" },
        { label: "Per turbine", path: "powerPerTurbineKw", unit: "kW" },
      ],
    },
    {
      title: "Wind speeds",
      fields: [
        { label: "Cut-in", path: "speeds.cutIn", unit: "m/s" },
        { label: "Rated", path: "speeds.rated", unit: "m/s" },
        { label: "Cut-out", path: "speeds.cutOut", unit: "m/s" },
      ],
    },
    COSTS,
  ],
  generator: [
    {
      title: "Generator",
      fields: [
        { label: "Capacity", path: "capacityKw", unit: "kW" },
        { label: "Fuel price", path: "costs.fuelPrice", unit: "$/L" },
      ],
    },
    COSTS,
  ],
};

const getIn = (o: Dict, path: string): unknown => path.split(".").reduce<any>((acc, k) => acc?.[k], o);
function setIn(o: Dict, path: string, value: unknown) {
  const keys = path.split(".");
  let cur = o;
  keys.slice(0, -1).forEach((k) => (cur = cur[k] ??= {}));
  cur[keys[keys.length - 1]] = value;
}

/** Deep-merge each saved source over the wizard defaults so every field has a value. */
function initDraft(project: Project | null): SupplyDraft {
  const out = {} as SupplyDraft;
  for (const id of SOURCE_IDS) {
    const base = INITIAL_PROJECT_DATA[id] as unknown as Dict;
    const saved = ((project?.[id] as Dict | undefined) ?? {}) as Dict;
    const merged: Dict = { ...base, ...saved, costs: { ...base.costs, ...(saved.costs ?? {}) } };
    if (base.losses) merged.losses = { ...base.losses, ...(saved.losses ?? {}) };
    if (base.speeds) merged.speeds = { ...base.speeds, ...(saved.speeds ?? {}) };
    out[id] = JSON.parse(JSON.stringify(merged));
  }
  return out;
}

type ConfigDrawerProps = {
  project: Project | null;
  initialSource: SourceId;
  onClose: () => void;
  onSave: (supply: SupplyDraft) => void;
};

/** Edit all four supply sources on a draft copy; Save writes them in one update. */
export default function ConfigDrawer({ project, initialSource, onClose, onSave }: ConfigDrawerProps) {
  const [src, setSrc] = useState<SourceId>(initialSource);
  const [draft, setDraft] = useState<SupplyDraft>(() => initDraft(project));

  const edit = (fn: (d: SupplyDraft) => void) =>
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as SupplyDraft;
      fn(next);
      return next;
    });

  const current = draft[src];
  const meta = SOURCE_META[src];
  const on = !!current.enabled;

  type Preset = { key: string; label: string; hint: string; active: boolean; apply: () => void };
  let presetTitle = "";
  let presets: Preset[] = [];
  if (src === "solar") {
    presetTitle = "Quick presets";
    presets = [
      {
        key: "standard",
        label: "Standard",
        hint: "Average efficiency · $1,000/kW",
        active: isSolarPresetStandard(current.losses),
        apply: () =>
          edit((d) => {
            d.solar.losses = { ...SOLAR_PRESETS.standard.losses };
            d.solar.costs.capital = num(d.solar.sizeKw) * SOLAR_PRESETS.standard.costPerKw;
          }),
      },
      {
        key: "premium",
        label: "Premium",
        hint: "High efficiency · $1,500/kW",
        active: isSolarPresetPremium(current.losses),
        apply: () =>
          edit((d) => {
            d.solar.losses = { ...SOLAR_PRESETS.premium.losses };
            d.solar.costs.capital = num(d.solar.sizeKw) * SOLAR_PRESETS.premium.costPerKw;
          }),
      },
    ];
  } else if (src === "battery") {
    presetTitle = "Chemistry";
    presets = [BATTERY_PRESETS.lithium, BATTERY_PRESETS.lead].map((p) => ({
      key: p.type,
      label: p.type,
      hint: `${p.lifespan} yr life · $${p.costPerKwh}/kWh`,
      active: current.type === p.type,
      apply: () =>
        edit((d) => {
          d.battery.type = p.type;
          d.battery.lifespan = p.lifespan;
          d.battery.costs.capital = num(d.battery.storageKwh) * p.costPerKwh;
        }),
    }));
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      label="System configuration"
      header={
        <>
          <h2 class="mg-h2" style={{ marginRight: "auto" }}>
            System configuration
          </h2>
          <IconButton label="Close" size="lg" onClick={onClose}>
            <X size={18} strokeWidth={STROKE} />
          </IconButton>
        </>
      }
      subheader={SOURCE_IDS.map((id) => {
        const m = SOURCE_META[id];
        return (
          <button key={id} type="button" class={`mg-src-pill${id === src ? " is-active" : ""}`} aria-pressed={id === src} onClick={() => setSrc(id)}>
            <span class="mg-src-pill__icon" style={{ background: m.tileBg, color: m.tileFg }}>
              <m.Icon size={13} strokeWidth={STROKE} />
            </span>
            <span>{m.name}</span>
            <span class={`mg-src-pill__dot${draft[id].enabled ? " is-on" : ""}`} />
          </button>
        );
      })}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(normalizeNumbers(draft))}>
            Save changes
          </Button>
        </>
      }
    >
      <div class="mg-enable-row">
        <span class="mg-enable-row__text">
          <span class="mg-enable-row__title">
            {meta.name} is {on ? "on" : "off"}
          </span>
          <span class="mg-caption">{on ? "Included in the next simulation" : "Turn on to include it in the simulation"}</span>
        </span>
        <Switch size="lg" checked={on} label={`Include ${meta.name.toLowerCase()}`} onChange={(v) => edit((d) => (d[src].enabled = v))} />
      </div>

      {presets.length > 0 && (
        <div class="mg-section">
          <div class="mg-section__title">{presetTitle}</div>
          <div class="mg-preset-grid">
            {presets.map((p) => (
              <button key={p.key} type="button" class={`mg-option mg-option--compact${p.active ? " is-selected" : ""}`} aria-pressed={p.active} onClick={p.apply}>
                <span class="mg-option__title">{p.label}</span>
                <span class="mg-option__hint">{p.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {SECTIONS[src].map((sec) => (
        <div key={sec.title} class="mg-section">
          <div class="mg-section__title">{sec.title}</div>
          <div class="mg-field-grid">
            {sec.fields.map((f) => (
              <NumberField
                key={f.path}
                label={f.label}
                unit={f.unit}
                value={(getIn(current, f.path) as string | number | undefined) ?? ""}
                onValue={(raw) => edit((d) => setIn(d[src], f.path, raw))}
              />
            ))}
          </div>
        </div>
      ))}
    </Drawer>
  );
}
