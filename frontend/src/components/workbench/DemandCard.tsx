import { useMemo, useState } from "preact/hooks";
import { Building, ChevronDown, ChevronRight, LayoutGrid, List, Pencil, Plug, Plus, Trash2, Workflow } from "lucide-preact";
import type { Load } from "../../database/models/load";
import type { Project } from "../../database/models/metadata";
import { getLoadLabelById } from "../../data/loadLabels";
import { createNewLoad } from "../../utils/loadUtils";
import { f1, f2, hourLabel, sum } from "../../utils/format";
import {
  Button,
  IconButton,
  LoadIcon,
  Segmented,
  SOURCE_IDS,
  SOURCE_META,
  SOURCE_OFF,
  STROKE,
  useToast,
  type SourceId,
} from "../ui";
import {
  addChildLoad,
  effectiveProfile,
  isNestable,
  leafCount,
  removeLoad,
  sourceConfig,
  sourceDetail,
  totalProfile,
  zeros,
} from "./model";

type View = "table" | "cards" | "diagram";

type Row = {
  id: string;
  name: string;
  labelId: string;
  typeName: string;
  profile: number[];
  /** The group's own (non-appliance) profile, shown as a row so it stays editable. */
  isShared?: boolean;
};

type Group = {
  key: string;
  isBuilding: boolean;
  name: string;
  labelId: string;
  meta: string;
  profile: number[];
  rows: Row[];
};

export type DemandCardProps = {
  loads: Load[];
  onLoadsChange: (updater: (prev: Load[]) => Load[]) => void;
  project: Project | null;
  onOpenSource: (id: SourceId) => void;
  onEditLoad: (id: string) => void;
};

const typeName = (labelId: string) => getLoadLabelById(labelId)?.name ?? "Other Appliance";

function Sparkline({ profile, variant }: { profile: number[]; variant?: "sm" | "tile" | "muted-sm" }) {
  const max = Math.max(...profile, 0.01);
  const cls = [
    "mg-spark",
    variant === "sm" || variant === "muted-sm" ? "mg-spark--sm" : "",
    variant === "tile" ? "mg-spark--tile" : "",
    variant === "muted-sm" ? "mg-spark--muted" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span class={cls} aria-hidden="true">
      {profile.map((v, i) => (
        <span key={i} class="mg-spark__bar" style={{ height: `${Math.round((v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

function AggregateChart({ total }: { total: number[] }) {
  const peak = Math.max(...total, 0);
  const peakIdx = total.indexOf(peak);
  const scale = Math.max(0.5, Math.ceil(peak * 1.15 * 2) / 2);
  return (
    <div class="mg-agg">
      <div class="mg-agg__plot">
        <div class="mg-agg__top" />
        <span class="mg-agg__scale">{f1(scale)} kW</span>
        {total.map((v, i) => (
          <div
            key={i}
            class={`mg-agg__bar${i === peakIdx && v > 0 ? " is-peak" : ""}`}
            style={{ height: `${(v / scale) * 100}%` }}
            title={`${hourLabel(i)} · ${f2(v)} kW`}
          />
        ))}
      </div>
      <div class="mg-agg__hours">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}

export default function DemandCard({ loads, onLoadsChange, project, onOpenSource, onEditLoad }: DemandCardProps) {
  const flash = useToast();
  const [view, setView] = useState<View>("table");
  // Groups are open unless explicitly collapsed (new buildings appear expanded).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const total = useMemo(() => totalProfile(loads), [loads]);
  const peak = Math.max(...total, 0);
  const peakIdx = total.indexOf(peak);
  const leaves = leafCount(loads);

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = loads.filter(isNestable).map((l) => {
      const own = Array.isArray(l.profile) && l.profile.length === 24 ? l.profile.map((v) => Number(v) || 0) : zeros();
      const rows: Row[] = [];
      if (sum(own) > 0) {
        rows.push({ id: l.id, name: "Shared load", labelId: l.labelId, typeName: "Not tied to an appliance", profile: own, isShared: true });
      }
      for (const c of l.children ?? []) {
        rows.push({ id: c.id, name: c.name, labelId: c.labelId, typeName: typeName(c.labelId), profile: effectiveProfile(c) });
      }
      return {
        key: l.id,
        isBuilding: true,
        name: l.name,
        labelId: l.labelId,
        meta: `${typeName(l.labelId)} · ${l.children?.length ?? 0}`,
        profile: effectiveProfile(l),
        rows,
      };
    });
    const standalone = loads.filter((l) => !isNestable(l));
    if (standalone.length) {
      const p = zeros();
      standalone.forEach((l) => effectiveProfile(l).forEach((v, i) => (p[i] += v)));
      out.push({
        key: "__solo",
        isBuilding: false,
        name: "Standalone",
        labelId: "misc",
        meta: `${standalone.length} load${standalone.length === 1 ? "" : "s"}`,
        profile: p,
        rows: standalone.map((l) => ({ id: l.id, name: l.name, labelId: l.labelId, typeName: typeName(l.labelId), profile: effectiveProfile(l) })),
      });
    }
    return out;
  }, [loads]);

  const addBuilding = () => {
    const n = createNewLoad(`Building ${loads.filter(isNestable).length + 1}`);
    n.labelId = "building";
    n.children = [];
    onLoadsChange((prev) => [n, ...prev]);
    flash("Building added");
  };

  const addLoad = () => {
    const n = createNewLoad(`Load ${leaves + 1}`);
    n.labelId = "misc";
    onLoadsChange((prev) => [...prev, n]);
    onEditLoad(n.id);
  };

  const addAppliance = (parentId: string) => {
    const n = createNewLoad("New appliance");
    onLoadsChange((prev) => addChildLoad(prev, parentId, n));
    setCollapsed((c) => ({ ...c, [parentId]: false }));
    onEditLoad(n.id);
  };

  const remove = (id: string, name: string) => {
    onLoadsChange((prev) => removeLoad(prev, id));
    flash(`${name} removed`);
  };

  /** Clearing a group's shared profile (the group itself stays). */
  const clearShared = (id: string) => {
    onLoadsChange((prev) => prev.map((l) => (l.id === id ? { ...l, profile: zeros() } : l)));
    flash("Shared load cleared");
  };

  const stop = (fn: () => void) => (e: Event) => {
    e.stopPropagation();
    fn();
  };

  const isOpen = (key: string) => !collapsed[key];
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: isOpen(key) }));

  const meta = loads.length
    ? `${f1(sum(total))} kWh per day · ${f2(peak)} kW peak at ${hourLabel(Math.max(0, peakIdx))} · ${leaves} load${leaves === 1 ? "" : "s"}`
    : "No loads yet";

  return (
    <section class="mg-card mg-wb__demand">
      <div class="mg-demand__head">
        <div class="mg-demand__title">
          <h2 class="mg-h2">Demand</h2>
          <div class="mg-meta">{meta}</div>
        </div>
        <Segmented<View>
          variant="icon"
          ariaLabel="Demand view"
          value={view}
          onChange={setView}
          options={[
            { id: "table", title: "List view", icon: <List size={16} strokeWidth={STROKE} /> },
            { id: "cards", title: "Card view", icon: <LayoutGrid size={16} strokeWidth={STROKE} /> },
            { id: "diagram", title: "Diagram view", icon: <Workflow size={16} strokeWidth={STROKE} /> },
          ]}
        />
        <Button size="sm" icon={<Building size={16} strokeWidth={STROKE} />} onClick={addBuilding}>
          Add building
        </Button>
        <Button size="sm" icon={<Plus size={16} strokeWidth={STROKE} />} onClick={addLoad}>
          Add load
        </Button>
      </div>

      <AggregateChart total={total} />

      {!loads.length && (
        <div class="mg-empty">
          <div class="mg-empty__title">No loads yet</div>
          <div class="mg-empty__text">
            Add a building to group appliances, or add a standalone load such as a water pump or street lighting.
          </div>
          <Button variant="primary" size="sm" icon={<Building size={16} strokeWidth={STROKE} />} onClick={addBuilding}>
            Add building
          </Button>
        </div>
      )}

      {view === "table" && loads.length > 0 && (
        <div class="mg-table">
          <div class="mg-grid-row mg-table__head">
            <span />
            <span>Load</span>
            <span class="mg-num">kWh / day</span>
            <span class="mg-num">Peak</span>
            <span>24 h</span>
            <span />
          </div>
          {groups.map((g) => {
            const open = isOpen(g.key);
            return (
              <div key={g.key}>
                <div class="mg-grid-row mg-group-row" onClick={() => toggle(g.key)}>
                  <span class="mg-tile mg-tile--sm">
                    {g.isBuilding ? <LoadIcon labelId={g.labelId} /> : <Plug size={16} strokeWidth={STROKE} />}
                  </span>
                  <span class="mg-group-row__name">
                    <strong>{g.name}</strong>
                    <span class="mg-group-row__meta">{g.meta}</span>
                    <span class="mg-group-row__chev">
                      {open ? <ChevronDown size={14} strokeWidth={STROKE} /> : <ChevronRight size={14} strokeWidth={STROKE} />}
                    </span>
                  </span>
                  <span class="mg-num mg-group-row__kwh">{f1(sum(g.profile))}</span>
                  <span class="mg-num mg-group-row__peak">{f2(Math.max(...g.profile))}</span>
                  <Sparkline profile={g.profile} />
                  <span class="mg-row-actions">
                    {g.isBuilding && (
                      <>
                        <IconButton label="Edit building" onClick={stop(() => onEditLoad(g.key))}>
                          <Pencil size={16} strokeWidth={STROKE} />
                        </IconButton>
                        <IconButton label="Delete building" tone="danger" onClick={stop(() => remove(g.key, g.name))}>
                          <Trash2 size={16} strokeWidth={STROKE} />
                        </IconButton>
                      </>
                    )}
                  </span>
                </div>
                {open && (
                  <div class="mg-children">
                    {g.rows.map((r) => (
                      <div key={r.id + (r.isShared ? "-shared" : "")} class="mg-grid-row mg-child-row" onClick={() => onEditLoad(r.id)}>
                        <span class="mg-child-row__icon">
                          <LoadIcon labelId={r.labelId} />
                        </span>
                        <span class="mg-child-row__name">
                          <span>{r.name}</span>
                          <span class="mg-child-row__type">{r.typeName}</span>
                        </span>
                        <span class="mg-num">{f1(sum(r.profile))}</span>
                        <span class="mg-num mg-child-row__peak">{f2(Math.max(...r.profile))}</span>
                        <Sparkline profile={r.profile} variant="muted-sm" />
                        <span class="mg-row-actions">
                          <IconButton label="Edit profile" onClick={stop(() => onEditLoad(r.id))}>
                            <Pencil size={16} strokeWidth={STROKE} />
                          </IconButton>
                          <IconButton
                            label={r.isShared ? "Clear shared load" : "Delete"}
                            tone="danger"
                            onClick={stop(() => (r.isShared ? clearShared(r.id) : remove(r.id, r.name)))}
                          >
                            <Trash2 size={16} strokeWidth={STROKE} />
                          </IconButton>
                        </span>
                      </div>
                    ))}
                    {g.isBuilding && (
                      <Button variant="ghost" size="sm" icon={<Plus size={16} strokeWidth={STROKE} />} onClick={() => addAppliance(g.key)}>
                        Add appliance
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "cards" && loads.length > 0 && (
        <div class="mg-cards">
          {groups.map((g) => (
            <div key={g.key} class="mg-cards__group">
              <div class="mg-cards__head">
                <span class="mg-cards__head-icon">
                  {g.isBuilding ? <LoadIcon labelId={g.labelId} /> : <Plug size={16} strokeWidth={STROKE} />}
                </span>
                <strong>{g.name}</strong>
                <span class="mg-caption">
                  {g.meta} · {f1(sum(g.profile))} kWh/day
                </span>
                {g.isBuilding && (
                  <Button variant="ghost" size="sm" icon={<Plus size={16} strokeWidth={STROKE} />} onClick={() => addAppliance(g.key)}>
                    Add appliance
                  </Button>
                )}
              </div>
              {g.rows.length > 0 ? (
                <div class="mg-cards__grid">
                  {g.rows.map((r) => (
                    <button key={r.id + (r.isShared ? "-shared" : "")} type="button" class="mg-load-tile" onClick={() => onEditLoad(r.id)}>
                      <span class="mg-load-tile__top">
                        <span class="mg-load-tile__icon">
                          <LoadIcon labelId={r.labelId} />
                        </span>
                        <span class="mg-caption mg-faint">{r.typeName}</span>
                      </span>
                      <span class="mg-load-tile__name">{r.name}</span>
                      <Sparkline profile={r.profile} variant="tile" />
                      <span class="mg-load-tile__stats">
                        <span>{f1(sum(r.profile))} kWh/day</span>
                        <span>{f2(Math.max(...r.profile))} kW</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div class="mg-meta mg-faint">No appliances yet.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "diagram" && (
        <div class="mg-diagram-wrap">
          <div class="mg-diagram">
            <div class="mg-diagram__label">Supply</div>
            <div class="mg-diagram__label mg-diagram__label--bus">AC bus</div>
            <div class="mg-diagram__label">Demand</div>

            <div class="mg-diagram__col">
              {SOURCE_IDS.map((id) => {
                const s = sourceConfig(project, id);
                const m = SOURCE_META[id];
                const on = !!s.enabled;
                return (
                  <button key={id} type="button" class={`mg-node${on ? "" : " mg-node--off"}`} onClick={() => onOpenSource(id)}>
                    <span class="mg-tile mg-tile--md" style={{ background: on ? m.tileBg : SOURCE_OFF.tileBg, color: on ? m.tileFg : SOURCE_OFF.tileFg }}>
                      <m.Icon size={16} strokeWidth={STROKE} />
                    </span>
                    <span class="mg-node__text">
                      <span class="mg-node__name">{m.name}</span>
                      <span class="mg-node__sub">{sourceDetail(id, s)}</span>
                    </span>
                    <span class="mg-node__wire mg-node__wire--out" style={{ background: on ? "var(--mg-accent)" : "var(--mg-control-border)" }} />
                  </button>
                );
              })}
            </div>
            <div class="mg-diagram__bus">
              <span />
            </div>
            <div class="mg-diagram__col">
              {loads.map((l) => {
                const nest = isNestable(l);
                return (
                  <button
                    key={l.id}
                    type="button"
                    class="mg-node mg-node--load"
                    onClick={() => {
                      if (nest) {
                        setCollapsed((c) => ({ ...c, [l.id]: false }));
                        setView("table");
                      } else onEditLoad(l.id);
                    }}
                  >
                    <span class="mg-node__wire mg-node__wire--in" />
                    <span class="mg-tile mg-tile--md">
                      <LoadIcon labelId={l.labelId} />
                    </span>
                    <span class="mg-node__text">
                      <span class="mg-node__name">{l.name}</span>
                      <span class="mg-node__sub">
                        {nest ? (l.children ?? []).map((c) => c.name).join(", ") || "No appliances" : typeName(l.labelId)}
                      </span>
                    </span>
                    <span class="mg-node__kwh">{f1(sum(effectiveProfile(l)))} kWh</span>
                  </button>
                );
              })}
              {!loads.length && <div class="mg-meta mg-faint">No loads yet.</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
