import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { onAuthStateChanged } from "firebase/auth";
import { CircleHelp, Play, Plus, Zap } from "lucide-preact";
import type { Load } from "../database/models/load";
import type { Project } from "../database/models/metadata";
import { auth } from "../utils/firebase/firebase-init";
import {
  deleteProject,
  getProjectLoads,
  listProjects,
  saveProjectLoads,
  updateProject,
} from "../database/firestore";
import { buildSimulationPayload, fetchStoredSimulation, runSimulation, type SimulationResult } from "../services/simulation";
import ResultsTab from "../components/results/ResultsTab";
import GraphsTab from "../components/graphs/GraphsTab";
import Workbench from "../components/workbench/Workbench";
import { findWithParent, initialsOf, isNestable, removeLoad, saveLoadEdit, sourceConfig } from "../components/workbench/model";
import ConfigDrawer, { type SupplyDraft } from "../components/drawers/ConfigDrawer";
import LoadProfilerDrawer from "../components/drawers/LoadProfilerDrawer";
import ProjectSwitcher from "../components/shell/ProjectSwitcher";
import { Button, IconButton, Segmented, SOURCE_META, STROKE, useToast, type SourceId } from "../components/ui";
import "../css/app-shell.css";

type TabId = "workbench" | "data" | "graphs";

export default function Projects() {
  const { route, query } = useLocation();
  /** Project to open first, e.g. /projects?project=abc after the wizard creates one. */
  const requestedProjectId = query.project;
  const flash = useToast();

  const [user, setUser] = useState(auth.currentUser);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("workbench");

  // Load tree + debounced autosave.
  const [workbenchLoads, setWorkbenchLoads] = useState<Load[]>([]);
  const [saving, setSaving] = useState(false);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const editVersionRef = useRef(0);

  // Simulation.
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  /** Set when a run completes this session; stored results have no known run time. */
  const [simulatedAt, setSimulatedAt] = useState<Date | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Drawers.
  const [configSource, setConfigSource] = useState<SourceId | null>(null);
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  /* ---------- Data loading ---------- */

  const refreshProjects = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return [];
    const list = await listProjects(u.uid);
    setProjects(list);
    return list;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        hydratedProjectIdRef.current = null;
        setWorkbenchLoads([]);
        setActiveProjectId("");
        setProjects([]);
        setLoading(false);
        return;
      }
      try {
        await refreshProjects();
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [refreshProjects]);

  // Select the most recently edited project once the list arrives.
  useEffect(() => {
    if (loading) return;
    if (!activeProjectId && projects.length > 0) {
      const requested = requestedProjectId && projects.find((p) => p.id === requestedProjectId);
      setActiveProjectId(requested ? requested.id : projects[0].id);
    }
  }, [loading, projects, activeProjectId]);

  // Load the tree when the active project changes.
  useEffect(() => {
    const u = auth.currentUser;
    dirtyRef.current = false;
    setSaving(false);
    setSimulatedAt(null);
    if (!u || !activeProjectId) {
      setWorkbenchLoads([]);
      return;
    }
    hydratedProjectIdRef.current = null;
    let cancelled = false;
    (async () => {
      try {
        const loads = await getProjectLoads(u.uid, activeProjectId);
        if (!cancelled) setWorkbenchLoads(loads);
      } catch (e) {
        console.error("Failed to load project loads:", e);
        if (!cancelled) setWorkbenchLoads([]);
      } finally {
        if (!cancelled) hydratedProjectIdRef.current = activeProjectId;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  /** All user edits to the load tree go through here so they're saved. */
  const editLoads = useCallback((updater: (prev: Load[]) => Load[]) => {
    dirtyRef.current = true;
    editVersionRef.current += 1;
    setWorkbenchLoads(updater);
  }, []);

  // Debounced save (800 ms) with a live Saved / Saving… status.
  useEffect(() => {
    const u = auth.currentUser;
    if (!dirtyRef.current || !u || !activeProjectId) return;
    if (hydratedProjectIdRef.current !== activeProjectId) return;
    setSaving(true);
    const version = editVersionRef.current;
    const pid = activeProjectId;
    const loads = workbenchLoads;
    const handle = window.setTimeout(async () => {
      try {
        await saveProjectLoads(u.uid, pid, loads);
        setProjects((ps) => ps.map((p) => (p.id === pid ? { ...p, loads } : p)));
      } catch (e) {
        console.error("Failed to save project loads:", e);
      }
      if (editVersionRef.current === version) {
        dirtyRef.current = false;
        setSaving(false);
      }
    }, 800);
    return () => window.clearTimeout(handle);
  }, [activeProjectId, workbenchLoads]);

  // Stored results for the Results / Graphs tabs.
  useEffect(() => {
    if (activeTab === "workbench") return;
    const u = auth.currentUser;
    if (!u || !activeProjectId) {
      setSimulationResult(null);
      return;
    }
    setResultsLoading(true);
    fetchStoredSimulation(u.uid, activeProjectId)
      .then((bundle) => setSimulationResult(Object.keys(bundle).length > 0 ? bundle : null))
      .catch((err) => {
        console.warn("[Simulation GET stored] failed:", err);
        setSimulationResult(null);
      })
      .finally(() => setResultsLoading(false));
  }, [activeTab, activeProjectId]);

  /* ---------- Project actions ---------- */

  const selectProject = async (id: string) => {
    if (id === activeProjectId) return;
    // Flush an unsaved edit before switching so it isn't dropped.
    const u = auth.currentUser;
    if (u && dirtyRef.current && activeProjectId) {
      saveProjectLoads(u.uid, activeProjectId, workbenchLoads).catch((e) => console.error("Flush save failed:", e));
    }
    setActiveProjectId(id);
  };

  const renameProject = async (id: string, name: string) => {
    const u = auth.currentUser;
    if (!u) return;
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, name } : p)));
    try {
      await updateProject(u.uid, id, { name });
      flash("Project renamed");
    } catch (e) {
      console.error("Rename failed:", e);
      await refreshProjects();
    }
  };

  const removeProject = async (project: Project) => {
    const u = auth.currentUser;
    if (!u) return;
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(u.uid, project.id);
      const list = await refreshProjects();
      if (project.id === activeProjectId) setActiveProjectId(list[0]?.id ?? "");
      flash("Project deleted");
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  /* ---------- Supply ---------- */

  const toggleSource = async (id: SourceId, enabled: boolean) => {
    const u = auth.currentUser;
    if (!u || !activeProject) return;
    const next = { ...sourceConfig(activeProject, id), enabled };
    const pid = activeProject.id;
    setProjects((ps) => ps.map((p) => (p.id === pid ? { ...p, [id]: next } : p)));
    setSaving(true);
    try {
      await updateProject(u.uid, pid, { [id]: next } as Partial<Project>);
      flash(`${SOURCE_META[id].name} turned ${enabled ? "on" : "off"}`);
    } catch (e) {
      console.error("Toggle failed:", e);
      await refreshProjects();
    } finally {
      if (!dirtyRef.current) setSaving(false);
    }
  };

  const openSource = (id: SourceId) => {
    if (activeProject) setConfigSource(id);
  };

  const saveConfig = async (supply: SupplyDraft) => {
    const u = auth.currentUser;
    if (!u || !activeProject) return;
    const pid = activeProject.id;
    setConfigSource(null);
    // SupplyDraft is the same shape as the stored source configs (normalized numbers).
    const patch = supply as unknown as Partial<Project>;
    setProjects((ps) => ps.map((p) => (p.id === pid ? ({ ...p, ...patch } as Project) : p)));
    setSaving(true);
    try {
      await updateProject(u.uid, pid, patch);
      flash("Configuration saved");
    } catch (e) {
      console.error("Saving configuration failed:", e);
      alert("Failed to save the configuration.");
      await refreshProjects();
    } finally {
      if (!dirtyRef.current) setSaving(false);
    }
  };

  /* ---------- Simulation ---------- */

  const handleRunSimulation = async () => {
    const u = auth.currentUser;
    if (!u || !activeProjectId) return;
    setSimulationLoading(true);
    try {
      const payload = buildSimulationPayload(u.uid, activeProjectId, workbenchLoads, activeProject);
      const result = await runSimulation(payload);
      setSimulationResult(result);
      setSimulatedAt(new Date());
      setActiveTab("data");
      flash("Simulation complete");
    } catch (err) {
      console.error("Simulation error:", err);
      alert(err instanceof Error ? err.message : "Simulation failed. Check console.");
    } finally {
      setSimulationLoading(false);
    }
  };

  /* ---------- Rendering ---------- */

  const editing = (() => {
    if (!editingLoadId) return null;
    const { load, parent } = findWithParent(workbenchLoads, editingLoadId);
    // A top-level nestable load is a building: its own (shared) profile is edited.
    return load ? { load, parent, isGroup: !parent && isNestable(load) } : null;
  })();
  const initials = initialsOf(user?.displayName || user?.email);
  const hasProject = !!activeProject;

  const renderTab = () => {
    if (activeTab === "workbench") {
      return (
        <Workbench
          loads={workbenchLoads}
          onLoadsChange={editLoads}
          project={activeProject}
          onToggleSource={toggleSource}
          onOpenSource={openSource}
          onEditLoad={setEditingLoadId}
        />
      );
    }
    const label = activeTab === "data" ? "results" : "graphs";
    if (simulationLoading) return <div class="mg-state mg-state--loading">Running simulation…</div>;
    if (resultsLoading) return <div class="mg-state mg-state--loading">Loading stored {label}…</div>;
    if (!simulationResult || Object.keys(simulationResult).length === 0) {
      return (
        <div class="mg-card mg-state">
          <div class="mg-state__title">No simulation yet</div>
          <div>Run a simulation to see {label} for this project.</div>
          <Button variant="primary" size="sm" icon={<Play size={14} fill="currentColor" strokeWidth={STROKE} />} onClick={handleRunSimulation}>
            Run simulation
          </Button>
        </div>
      );
    }
    return activeTab === "data" ? (
      <ResultsTab
        result={simulationResult}
        project={activeProject}
        simulatedAt={simulatedAt}
        onEditInputs={() => setActiveTab("workbench")}
      />
    ) : (
      <GraphsTab result={simulationResult} />
    );
  };

  const renderEmpty = () => {
    if (loading) return <div class="mg-state mg-state--loading">Loading projects…</div>;
    if (!user) {
      return (
        <div class="mg-card mg-state">
          <div class="mg-state__title">Sign in to see your projects</div>
          <Button variant="primary" size="sm" onClick={() => route("/")}>
            Go to sign in
          </Button>
        </div>
      );
    }
    return (
      <div class="mg-card mg-state">
        <div class="mg-state__title">No projects yet</div>
        <div>Create a project to start designing a microgrid.</div>
        <Button variant="primary" size="sm" icon={<Plus size={16} strokeWidth={STROKE} />} onClick={() => route("/projects/new")}>
          New project
        </Button>
      </div>
    );
  };

  return (
    <div class="mg-root mg-shell">
      <header class="mg-header">
        <a href="/" class="mg-brand" aria-label="Microgrid Toolkit home" title="Home">
          <Zap size={16} strokeWidth={STROKE} fill="currentColor" />
        </a>
        <ProjectSwitcher
          projects={projects}
          activeId={activeProjectId}
          activeName={activeProject?.name || (loading ? "Loading…" : "No project")}
          onSelect={selectProject}
          onNew={() => route("/projects/new")}
          onRename={renameProject}
          onDelete={removeProject}
        />
        <Segmented<TabId>
          variant="tabs"
          ariaLabel="Project views"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { id: "workbench", label: "Workbench" },
            { id: "data", label: "Results" },
            { id: "graphs", label: "Graphs" },
          ]}
        />
        <div class="mg-header__spacer" />
        {hasProject && (
          <div class={`mg-save${saving ? " is-saving" : ""}`} title={saving ? "Saving…" : "All changes saved"}>
            <span class="mg-save__dot" />
            <span>{saving ? "Saving…" : "Saved"}</span>
          </div>
        )}
        <IconButton label="Help" size="round" onClick={() => route("/guide")}>
          <CircleHelp size={18} strokeWidth={STROKE} />
        </IconButton>
        <button type="button" class="mg-avatar" aria-label="Account" title="Account" onClick={() => route("/account")}>
          {initials}
        </button>
        <Button
          variant="primary"
          icon={<Play size={14} fill="currentColor" strokeWidth={STROKE} />}
          onClick={handleRunSimulation}
          disabled={simulationLoading || !hasProject}
        >
          {simulationLoading ? "Running…" : "Run simulation"}
        </Button>
        {simulationLoading && (
          <div class="mg-runbar" aria-hidden="true">
            <div class="mg-runbar__fill" />
          </div>
        )}
      </header>

      <main class="mg-main">
        <div class="mg-content">{hasProject ? renderTab() : renderEmpty()}</div>
      </main>

      {configSource && hasProject && (
        <ConfigDrawer
          key={`${activeProjectId}-${configSource}`}
          project={activeProject}
          initialSource={configSource}
          onClose={() => setConfigSource(null)}
          onSave={saveConfig}
        />
      )}

      {editing && (
        <LoadProfilerDrawer
          key={editing.load.id}
          load={editing.load}
          parentId={editing.parent ? editing.parent.id : "none"}
          isGroup={editing.isGroup}
          groups={workbenchLoads.filter(isNestable).map((g) => ({ id: g.id, name: g.name }))}
          onClose={() => setEditingLoadId(null)}
          onSave={(result) => {
            const id = editing.load.id;
            editLoads((prev) =>
              saveLoadEdit(prev, id, { name: result.name, labelId: result.labelId, profile: result.profile }, result.parentId)
            );
            setEditingLoadId(null);
            flash(editing.isGroup ? "Building saved" : "Load saved");
          }}
          onDelete={() => {
            const { id, name } = editing.load;
            editLoads((prev) => removeLoad(prev, id));
            setEditingLoadId(null);
            flash(`${name} deleted`);
          }}
        />
      )}
    </div>
  );
}
