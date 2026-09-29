import { useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowRight, Check, ChevronLeft, CircleHelp, X, Zap } from "lucide-preact";
import { auth } from "../utils/firebase/firebase-init";
import { createProject } from "../database/firestore";
import { projectPatchFromWizardData } from "../database/projectPayload";
import { f1, fMoneyFull, sum } from "../utils/format";
import { Button, IconButton, SOURCE_META, STROKE, type SourceId } from "../components/ui";
import {
  STEPS,
  TIPS,
  effectiveLoads,
  initWizardData,
  renewableDayKwh,
  sourceSummary,
  toProjectData,
  upfrontCost,
  type WizardData,
} from "../components/wizard/model";
import {
  DemandStep,
  EconomicsStep,
  ProjectStep,
  ReviewStep,
  SourceStep,
  blockOverlap,
  initialBlocks,
  shapeFromBlocks,
  type TimeBlock,
} from "../components/wizard/steps";
import "../css/app-shell.css";
import "../css/wizard-v2.css";

const SOURCE_IDS: SourceId[] = ["solar", "battery", "wind", "generator"];

/** Full-screen new-project flow (replaces the modal wizard + spotlight tutorial). */
export default function NewProjectWizard() {
  const { route } = useLocation();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(!!auth.currentUser);

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [d, setD] = useState<WizardData>(initWizardData);
  const [showTips, setShowTips] = useState(true);
  const [advOpen, setAdvOpen] = useState<Record<string, boolean>>({});
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [overlapError, setOverlapError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setSignedIn(!!u);
        setAuthReady(true);
      }),
    []
  );

  const upd = (fn: (x: WizardData) => void) =>
    setD((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as WizardData;
      fn(next);
      return next;
    });

  const go = (i: number) => {
    setStep(i);
    setMaxStep((m) => Math.max(m, i));
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const applyBlocks = (next: TimeBlock[], changedKey?: string) => {
    if (changedKey) {
      const hit = blockOverlap(next, changedKey);
      if (hit) {
        setOverlapError(`${hit.changed.label} can't overlap ${hit.clash.label}. Adjust the times so blocks don't share hours.`);
        return;
      }
    }
    setOverlapError("");
    setBlocks(next);
    upd((x) => (x.shape = shapeFromBlocks(next)));
  };

  const loads = effectiveLoads(d);
  const daily = sum(loads);
  const named = !!d.name.trim();
  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const dirty = named || daily > 0;

  const close = () => {
    if (!created && dirty && !window.confirm("Discard this new project?")) return;
    route("/projects");
  };

  const create = async () => {
    const u = auth.currentUser;
    if (!u) return setSaveError("You need to be signed in to create a project.");
    setBusy(true);
    setSaveError("");
    try {
      const data = toProjectData(d);
      const patch = projectPatchFromWizardData(data);
      // No profile drawn yet: start with an empty workbench rather than a zero "Site demand".
      if (!daily) patch.loads = [];
      const id = await createProject(u.uid, { ownerId: u.uid, description: d.description.trim(), ...patch });
      setCreated({ id, name: data.name });
    } catch (e) {
      console.error("Error creating project:", e);
      setSaveError("Couldn't create the project. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setD(initWizardData());
    setBlocks(initialBlocks());
    setAdvOpen({});
    setOverlapError("");
    setCreated(null);
    setStep(0);
    setMaxStep(0);
  };

  const subs: Record<string, string> = {
    project: d.name.trim() || "Not named yet",
    demand: daily ? `${f1(daily)} kWh/day` : "No profile yet",
    economics: `$${d.economics.energyPrice}/kWh`,
    review: "",
  };
  SOURCE_IDS.forEach((id) => (subs[id] = sourceSummary(id, d[id])));

  const srcMeta = SOURCE_IDS.includes(cur.id as SourceId) ? SOURCE_META[cur.id as SourceId] : null;
  const headTile = srcMeta ? { background: srcMeta.tileBg, color: srcMeta.tileFg } : { background: "var(--mg-accent-tint)", color: "var(--mg-accent)" };

  const cover = daily ? renewableDayKwh(d) / daily : 0;
  const titleName = d.name.trim() || "New project";

  const renderStep = () => {
    switch (cur.id) {
      case "project":
        return <ProjectStep d={d} upd={upd} />;
      case "demand":
        return (
          <DemandStep
            d={d}
            upd={upd}
            blocks={blocks}
            blocksOpen={blocksOpen}
            overlapError={overlapError}
            setBlocksOpen={setBlocksOpen}
            applyBlocks={applyBlocks}
          />
        );
      case "economics":
        return <EconomicsStep d={d} upd={upd} />;
      case "review":
        return <ReviewStep d={d} go={go} />;
      default:
        return (
          <SourceStep
            id={cur.id as SourceId}
            d={d}
            upd={upd}
            advOpen={!!advOpen[cur.id]}
            setAdvOpen={(open) => setAdvOpen((a) => ({ ...a, [cur.id]: open }))}
          />
        );
    }
  };

  return (
    <div class="mg-root mg-wz" data-screen-label="New project wizard">
      <header class="mg-header">
        <a href="/" class="mg-brand" aria-label="Microgrid Toolkit home" title="Home">
          <Zap size={16} strokeWidth={STROKE} fill="currentColor" />
        </a>
        <div class="mg-crumbs">
          <span class="mg-crumbs__root">Microgrid Toolkit</span>
          <span class="mg-crumbs__sep">/</span>
          <span class="mg-crumbs__name" style={{ fontWeight: 600 }}>
            {titleName}
          </span>
        </div>
        <div class="mg-header__spacer" />
        <button type="button" class="mg-tips-toggle" role="switch" aria-checked={showTips} onClick={() => setShowTips((s) => !s)}>
          <span>Show tips</span>
          <span class={`mg-switch mg-switch--sm${showTips ? " is-on" : ""}`} aria-hidden="true">
            <span class="mg-switch__knob" />
          </span>
        </button>
        <IconButton label="Close" size="round" onClick={close}>
          <X size={18} strokeWidth={STROKE} />
        </IconButton>
      </header>

      {created ? (
        <div class="mg-success-wrap">
          <div class="mg-card mg-success">
            <div class="mg-success__check">
              <Check size={20} strokeWidth={2} />
            </div>
            <div>
              <h1>{created.name} is ready</h1>
              <p class="mg-muted" style={{ margin: "6px 0 0", textWrap: "pretty" }}>
                Its settings are saved. Next, add buildings and appliances on the workbench, then run the first simulation.
              </p>
            </div>
            <div class="mg-success__actions">
              <Button variant="primary" size="lg" onClick={() => route(`/projects?project=${encodeURIComponent(created.id)}`)}>
                Open workbench
              </Button>
              <Button size="lg" onClick={restart}>
                Start another project
              </Button>
            </div>
          </div>
        </div>
      ) : authReady && !signedIn ? (
        <div class="mg-success-wrap">
          <div class="mg-card mg-state">
            <div class="mg-state__title">Sign in to create a project</div>
            <Button variant="primary" size="sm" onClick={() => route("/")}>
              Go to sign in
            </Button>
          </div>
        </div>
      ) : (
        <div class="mg-wz__body">
          <nav class="mg-wz__rail" aria-label="Steps">
            <div class="mg-wz__progress">
              Step {step + 1} of {STEPS.length}
            </div>
            {STEPS.map((s, i) => {
              const current = i === step;
              const done = !current && (i < step || i <= maxStep);
              const locked = i > 0 && !named;
              return (
                <button
                  key={s.id}
                  type="button"
                  class={`mg-step${current ? " is-current" : ""}${done ? " is-done" : ""}`}
                  aria-current={current ? "step" : undefined}
                  disabled={locked}
                  onClick={() => go(i)}
                >
                  <span class="mg-step__dot">{done ? <Check size={13} strokeWidth={2.25} /> : i + 1}</span>
                  <span class="mg-step__text">
                    <span class="mg-step__label">{s.label}</span>
                    {(i <= maxStep || current) && subs[s.id] && <span class="mg-step__sub">{subs[s.id]}</span>}
                  </span>
                </button>
              );
            })}
          </nav>

          <div class="mg-wz__col">
            <main ref={mainRef} class="mg-wz__main">
              <div class="mg-wz__inner">
                <section class="mg-wz__section">
                  <div class="mg-wz__head">
                    <span class="mg-wz__head-icon" style={headTile}>
                      <cur.Icon size={20} strokeWidth={STROKE} />
                    </span>
                    <div class="mg-wz__head-text">
                      <h1 class="mg-h1">{cur.title}</h1>
                      <div class="mg-muted" style={{ textWrap: "pretty" }}>
                        {cur.sub}
                      </div>
                    </div>
                  </div>
                  {renderStep()}
                </section>

                <aside class="mg-wz__aside">
                  <div class="mg-card mg-sum">
                    <div>
                      <div class="mg-caption">Estimated up-front cost</div>
                      <div class="mg-sum__capex">{fMoneyFull(upfrontCost(d))}</div>
                    </div>
                    <div>
                      <div class="mg-sum__row">
                        <span class="mg-sum__dot" style={{ background: "var(--mg-ink)" }} />
                        <span class="mg-sum__label">Demand</span>
                        <span class="mg-sum__value" style={daily ? undefined : { color: "var(--mg-faint)" }}>
                          {daily ? `${f1(daily)} kWh/day` : "—"}
                        </span>
                      </div>
                      {SOURCE_IDS.map((id) => {
                        const on = !!d[id].enabled;
                        return (
                          <div key={id} class="mg-sum__row">
                            <span class="mg-sum__dot" style={{ background: on ? SOURCE_META[id].color : "var(--mg-switch-off)" }} />
                            <span class="mg-sum__label">{SOURCE_META[id].name}</span>
                            <span class="mg-sum__value" style={on ? undefined : { color: "var(--mg-faint)" }}>
                              {on ? sourceSummary(id, d[id]) : "Off"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div class="mg-wz__group" style={{ gap: "6px" }}>
                      <div class="mg-sum__cover-head">
                        <span>Renewables vs. demand</span>
                        <strong>{daily ? `${Math.round(cover * 100)}%` : "—"}</strong>
                      </div>
                      <div class="mg-sum__cover-track">
                        <div class="mg-sum__cover-fill" style={{ width: `${Math.min(100, cover * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  {showTips && (
                    <div class="mg-tips">
                      <div class="mg-tips__title">
                        <CircleHelp size={15} strokeWidth={STROKE} />
                        <span>About this step</span>
                      </div>
                      <p>{TIPS[cur.id]}</p>
                    </div>
                  )}
                </aside>
              </div>
            </main>

            <footer class="mg-wz__footer">
              {step > 0 && (
                <Button size="lg" icon={<ChevronLeft size={16} strokeWidth={STROKE} />} onClick={() => go(step - 1)}>
                  Back
                </Button>
              )}
              <span style={{ flex: 1 }} />
              {!named && step === 0 && <span class="mg-wz__note">Add a project name to continue</span>}
              {saveError && <span class="mg-error">{saveError}</span>}
              <Button
                variant="primary"
                size="lg"
                disabled={(step === 0 && !named) || busy}
                iconRight={isLast ? <Check size={16} strokeWidth={STROKE} /> : <ArrowRight size={16} strokeWidth={STROKE} />}
                onClick={() => (isLast ? create() : go(step + 1))}
              >
                {isLast ? (busy ? "Creating…" : "Create project") : `Continue to ${STEPS[step + 1].label}`}
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
