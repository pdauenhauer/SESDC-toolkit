import type { Project } from "../../database/models/metadata";
import { f1 } from "../../utils/format";
import { SOURCE_IDS, SOURCE_META, SOURCE_OFF, STROKE, Switch, type SourceId } from "../ui";
import { renewableDayKwh, sourceConfig, sourceDetail } from "./model";

type SupplyCardProps = {
  project: Project | null;
  onToggleSource: (id: SourceId, enabled: boolean) => void;
  onOpenSource: (id: SourceId) => void;
};

export function SupplyCard({ project, onToggleSource, onOpenSource }: SupplyCardProps) {
  const onCount = SOURCE_IDS.filter((id) => sourceConfig(project, id).enabled).length;
  return (
    <section class="mg-card mg-supply">
      <div class="mg-supply__head">
        <h2 class="mg-h2">Supply</h2>
        <span class="mg-meta">{onCount} of 4 on</span>
      </div>
      {SOURCE_IDS.map((id) => {
        const s = sourceConfig(project, id);
        const m = SOURCE_META[id];
        const on = !!s.enabled;
        return (
          <div key={id} class={`mg-supply__row${on ? "" : " is-off"}`} onClick={() => onOpenSource(id)}>
            <span class="mg-tile" style={{ background: on ? m.tileBg : SOURCE_OFF.tileBg, color: on ? m.tileFg : SOURCE_OFF.tileFg }}>
              <m.Icon size={18} strokeWidth={STROKE} />
            </span>
            <span class="mg-supply__text">
              <span class="mg-supply__name">{m.name}</span>
              <span class="mg-supply__detail">{sourceDetail(id, s)}</span>
            </span>
            <Switch checked={on} label={`Toggle ${m.name}`} onChange={(next) => onToggleSource(id, next)} />
          </div>
        );
      })}
    </section>
  );
}

type TypicalDayCardProps = { project: Project | null; demandKwh: number };

export function TypicalDayCard({ project, demandKwh }: TypicalDayCardProps) {
  const supplyKwh = renewableDayKwh(project);
  const max = Math.max(supplyKwh, demandKwh, 1);
  const genOn = !!sourceConfig(project, "generator").enabled;
  const note =
    supplyKwh >= demandKwh
      ? `Renewables cover an average day with ${f1(supplyKwh - demandKwh)} kWh to spare.`
      : `Renewables fall ${f1(demandKwh - supplyKwh)} kWh short on an average day${genOn ? "; the generator covers the gap." : "."}`;

  const meters = [
    { label: "Demand", value: demandKwh, color: "var(--mg-ink)" },
    { label: "Renewable supply", value: supplyKwh, color: "var(--mg-solar)" },
  ];

  return (
    <section class="mg-card mg-day">
      <div class="mg-meta">Typical day</div>
      {meters.map((m) => (
        <div key={m.label} class="mg-meter">
          <div class="mg-meter__row">
            <span>{m.label}</span>
            <span class="mg-meter__value">{f1(m.value)} kWh</span>
          </div>
          <div class="mg-meter__track">
            <div class="mg-meter__fill" style={{ width: `${(m.value / max) * 100}%`, background: m.color }} />
          </div>
        </div>
      ))}
      <div class="mg-day__note">{note}</div>
    </section>
  );
}
