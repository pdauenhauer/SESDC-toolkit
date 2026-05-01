import { useState, useEffect, useRef } from "preact/hooks";
import { useLocation } from "preact-iso";
import { Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ProjectsSidebar from "../components/ProjectsSidebar";
import Workbench from "../components/Workbench";
import SimulationResults from "../components/SimulationResults";
import SimulationGraphsPanel from "../components/graphs/SimulationGraphsPanel";
import type { Load } from "../database/models/load";
import type { Project } from "../database/models/metadata";
import { createNewLoad } from "../utils/loadUtils";
import { auth } from "../utils/firebase/firebase-init";
import ProjectWizard from '../components/ProjectWizard';
import type { WizardStep } from "../components/ProjectWizard/types";
import { listProjects, getProjectLoads, saveProjectLoads, createProject, updateProject } from "../database/firestore";
import {
  buildSimulationPayload,
  fetchStoredSimulation,
  runSimulation,
  type SimulationResult,
} from "../services/simulation";
import menuIcon from "../media/layout-grid.svg";
import settingIcon from "../media/settings.svg";
import homeIcon from "../media/house.svg";
import projectsIcon from "../media/boxes.svg";
import runIcon from "../media/play-green.svg";
import showProjectsIcon from "../media/grid-2x2-plus.svg";
import slidersHorizontalIcon from "../media/sliders-horizontal.svg";
import rightArrowIcon from "../media/chevron-right.svg";
import leftArrowIcon from "../media/chevron-left.svg";
import configIcon from "../media/cog.svg";
import windIcon from "../media/wind.svg";
import generatorIcon from "../media/zap.svg";
import solarPanelIcon from "../media/solar-panel.svg";
import batteryIcon from "../media/battery-medium.svg";
import accountIcon from "../media/user.svg";
import "../css/ProjectsPage/projects.css";
import "../css/ProjectsPage/projectCraftArea.css";
import Tooltip from "../components/Tooltip";
//maybe add the ability to have more than one project open at a time and have the tab change.with a plus

// Set to true to use hardcoded dummy projects instead of fetching from DB
const USE_DUMMY_DATA = false;

// Hardcoded dummy projects for testing
const dummyProjects: Project[] = [
  {
    id: "1",
    name: "Solar Farm Project",
    ownerId: "user1",
    description: "Large-scale solar installation",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    id: "2",
    name: "Microgrid Design Alpha",
    ownerId: "user1",
    description: "Community microgrid system",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    id: "3",
    name: "Rural Energy System",
    ownerId: "user1",
    description: "Off-grid renewable energy solution",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    id: "4",
    name: "Hybrid Solar-Wind",
    ownerId: "user1",
    description: "Combined renewable energy project",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];

type CraftTabId = "data" | "workbench" | "graphs";

const TABS: { id: CraftTabId; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "workbench", label: "Workbench" },
  { id: "graphs", label: "Graphs" },
];

export default function Projects() {
  const { route } = useLocation();
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCraftTab, setActiveCraftTab] = useState<CraftTabId>("workbench");
  const [workbenchLoads, setWorkbenchLoads] = useState<Load[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [graphFiltersOpen, setGraphFiltersOpen] = useState(false);
  const [dataTabLoading, setDataTabLoading] = useState(false);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<WizardStep>("ONBOARDING_PROMPT");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [revealReady, setRevealReady] = useState(false);

  const handleAddComponent = () => {
    setWorkbenchLoads((prev) => [...prev, createNewLoad(`Load ${prev.length + 1}`)]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealReady(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  const handleRunSimulation = async () => {
    const user = auth.currentUser;
    if (!user || !activeProjectId) {
      alert("Please sign in and select a project.");
      return;
    }
    setSimulationLoading(true);
    setSimulationResult(null);
    try {
      const payload = buildSimulationPayload(
        user.uid,
        activeProjectId,
        workbenchLoads
      );
      const result = await runSimulation(payload);
      setSimulationResult(result);
      setActiveCraftTab("data");
    } catch (err) {
      console.error("Simulation error:", err);
      alert(err instanceof Error ? err.message : "Simulation failed. Check console.");
    } finally {
      setSimulationLoading(false);
    }
  };

  const openWizardAtStep = (step: WizardStep) => {
    setWizardInitialStep(step);
    setWizardOpen(true);
  };

  const handleCraftTabChange = (tab: CraftTabId) => {
    setActiveCraftTab(tab);
    if (tab !== "data") setDataTabLoading(false);
  };

  // 1) fetch projects
  useEffect(() => {
    if (USE_DUMMY_DATA) {
      setProjects(dummyProjects);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        hydratedProjectIdRef.current = null;
        setWorkbenchLoads([]);
        setActiveProjectId("");
        setProjects([]);
        setLoading(false);
        return;
      }

      try {
        const userProjects = await listProjects(user.uid);
        setProjects(userProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2) Select first project after projects load (if none selected)
  useEffect(() => {
    if (loading) return;
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [loading, projects, activeProjectId]);

  // 3) When on a results tab and active project changes, fetch stored data for that project
  useEffect(() => {
    if (activeCraftTab !== "data" && activeCraftTab !== "graphs") return;
    const user = auth.currentUser;
    if (!user?.uid || !activeProjectId) {
      setSimulationResult(null);
      return;
    }
    setDataTabLoading(true);
    fetchStoredSimulation(user.uid, activeProjectId)
      .then((csvBundle) => {
        if (Object.keys(csvBundle).length > 0) setSimulationResult(csvBundle);
        else setSimulationResult(null);
      })
      .catch((err) => {
        console.warn("[Simulation GET stored] failed:", err);
        setSimulationResult(null);
      })
      .finally(() => setDataTabLoading(false));
  }, [activeCraftTab, activeProjectId]);

  // 4) load loads when active project changes
  useEffect(() => {
    if (USE_DUMMY_DATA) return;

    const user = auth.currentUser;
    if (!user || !activeProjectId) {
      setWorkbenchLoads([]);
      return;
    }

    hydratedProjectIdRef.current = null;
    let cancelled = false;

    (async () => {
      try {
        const loads = await getProjectLoads(user.uid, activeProjectId);
        if (cancelled) return;
        setWorkbenchLoads(loads);
        hydratedProjectIdRef.current = activeProjectId;
      } catch (e) {
        console.error("Failed to load project loads:", e);
        if (!cancelled) setWorkbenchLoads([]);
        hydratedProjectIdRef.current = activeProjectId; // allow saving after user edits
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  // 4) Debounced save when loads change
  useEffect(() => {
    if (USE_DUMMY_DATA) return;

    const user = auth.currentUser;
    if (!user || !activeProjectId) return;
    if (hydratedProjectIdRef.current !== activeProjectId) return;

    const handle = setTimeout(() => {
      saveProjectLoads(user.uid, activeProjectId, workbenchLoads).catch((e) => {
        console.error("Failed to save project loads:", e);
      });
    }, 800);

    return () => clearTimeout(handle);
  }, [activeProjectId, workbenchLoads]);

  // Callback to refresh projects after creating a new one
  const refreshProjects = async () => {
    if (USE_DUMMY_DATA) return;
    const user = auth.currentUser;
    if (user) {
      const userProjects = await listProjects(user.uid);
      setProjects(userProjects);
    }
  };

  const activeProjectName =
    projects.find((project) => project.id === activeProjectId)?.name ?? "No Project Selected";

  return (
    <div class="projects-page">
      <div class="projects-layout">
        {sidebarOpen && (
          <aside
            class={`projects-sidebar projects-reveal projects-reveal--sidebar ${revealReady ? "is-visible" : ""}`}
          >
            <ProjectsSidebar
              projects={projects}
              loading={loading}
              activeProjectId={activeProjectId}
              onProjectSelect={(id) => setActiveProjectId(id)}
              onProjectCreated={refreshProjects}
              onNewProjectClick={() => setWizardOpen(true)}
              onHideSidebar={() => setSidebarOpen(false)}
            />
          </aside>
        )}

        <section class="projects-main">
          <div
            class={`projects-project-header projects-reveal projects-reveal--header ${revealReady ? "is-visible" : ""}`}
          >
            <div class="projects-project-header-side projects-project-header-side--left">
              <>
                <Tooltip text="Show Projects" position="right">
                    <button
                      type="button"
                      class="projects-sidebar-inline-toggle projects-top-icon-btn"
                      onClick={() => setSidebarOpen(true)}
                      aria-label="Show Projects"
                    >
                    <img src={menuIcon} alt="" class="projects-sidebar-toggle-icon" />
                  </button>
                </Tooltip>
                <Tooltip text="Home" position="bottom">
                  <button
                    type="button"
                    class="projects-toolbar-icon-btn projects-top-icon-btn"
                    onClick={() => route("/")}
                    aria-label="Home"
                  >
                    <img src={homeIcon} alt="" class="projects-toolbar-icon" />
                  </button>
                </Tooltip>
              </>
            </div>
            <div class="projects-project-header-title-wrap">
              <span class="projects-project-header-outer-box projects-project-header-outer-box--left" />
              <span class="projects-project-header-outer-box projects-project-header-outer-box--right" />
              <div class="projects-project-header-title">
                <img src={projectsIcon} alt="" class="projects-project-header-title-icon" />
                {activeProjectName}
              </div>
            </div>
            <div class="projects-project-header-side projects-project-header-side--right">
              <Tooltip text="Account" position="bottom">
                <button
                  type="button" //NEED TO FIX ACCOUNT PAGE ROUTE
                  class="projects-toolbar-icon-btn projects-top-icon-btn"
                  onClick={() => route("/account")}
                  aria-label="Account"
                >
                  <img src={accountIcon} alt="" class="projects-toolbar-icon" />
                </button>
              </Tooltip>
              <button
                type="button"
                class="projects-toolbar-icon-btn projects-top-icon-btn"
                onClick={() => console.log("Open Settings")}
                aria-label="Settings"
              >
                <img src={settingIcon} alt="" class="projects-toolbar-icon" />
              </button>
            </div>
          </div>

          <div
            class={`projects-toolbar projects-reveal projects-reveal--toolbar ${revealReady ? "is-visible" : ""}`}
          >
            <div class="projects-toolbar-row">
              <div class="project-craft-tabs project-craft-tabs--toolbar">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    class={[
                      "project-craft-tab",
                      activeCraftTab === tab.id ? "is-active" : "",
                    ].join(" ")}
                    onClick={() => handleCraftTabChange(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {(activeCraftTab === "workbench" || activeCraftTab === "graphs") && (
                <span class="projects-toolbar-divider" aria-hidden="true" />
              )}

              {activeCraftTab === "workbench" && (
                <>
                  <button
                    type="button"
                    class="projects-btn projects-btn-add projects-btn-add--workbench"
                    onClick={handleAddComponent}
                    aria-label="Create Component"
                  >
                    <img src={showProjectsIcon} alt="" class="projects-btn-add-icon" />
                    <span class="projects-btn-label">Create Component</span>
                  </button>
                  <div class={`projects-config-wrap ${configOpen ? "is-open" : ""}`}>
                    <button
                      type="button"
                      class="projects-btn projects-btn-config"
                      onClick={() => setConfigOpen((open) => !open)}
                      aria-label="System Configuration"
                      aria-expanded={configOpen}
                    >
                      <img src={configIcon} alt="" class="projects-btn-config-left-icon" />
                      <span class="projects-btn-label">System Configuration</span>
                      <img
                        src={configOpen ? leftArrowIcon : rightArrowIcon}
                        alt=""
                      class="projects-btn-config-icon"
                    />
                  </button>
                    {configOpen && (
                      <div class="projects-config-icons" aria-label="System Configuration Options">
                        <Tooltip text="Generator" position="bottom">
                          <button
                            type="button"
                            class="projects-config-option-btn"
                            onClick={() => openWizardAtStep("GENERATOR")}
                            aria-label="Open Generator Setup"
                          >
                            <img src={generatorIcon} alt="Generator" class="projects-config-option-icon" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Battery" position="bottom">
                          <button
                            type="button"
                            class="projects-config-option-btn"
                            onClick={() => openWizardAtStep("BATTERY")}
                            aria-label="Open Battery Setup"
                          >
                            <img src={batteryIcon} alt="Battery" class="projects-config-option-icon" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Solar" position="bottom">
                          <button
                            type="button"
                            class="projects-config-option-btn"
                            onClick={() => openWizardAtStep("SOLAR")}
                            aria-label="Open Solar Setup"
                          >
                            <img src={solarPanelIcon} alt="Solar" class="projects-config-option-icon" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Wind" position="bottom">
                          <button
                            type="button"
                            class="projects-config-option-btn"
                            onClick={() => openWizardAtStep("WIND")}
                            aria-label="Open Wind Setup"
                          >
                            <img src={windIcon} alt="Wind" class="projects-config-option-icon" />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeCraftTab === "graphs" && (
                <div class={`projects-filters-wrap ${graphFiltersOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    class="projects-btn projects-btn-config projects-btn-config--filters"
                    onClick={() => setGraphFiltersOpen((open) => !open)}
                    aria-label="Filters"
                    aria-expanded={graphFiltersOpen}
                  >
                    <img src={slidersHorizontalIcon} alt="" class="projects-btn-config-left-icon" />
                    <span class="projects-btn-label">Filters</span>
                    <img
                      src={graphFiltersOpen ? leftArrowIcon : rightArrowIcon}
                      alt=""
                      class="projects-btn-config-icon projects-btn-config-icon--filters"
                    />
                  </button>
                  {graphFiltersOpen && (
                    <div
                      class="projects-config-icons projects-config-icons--filters"
                      aria-label="Graph Filter Options"
                    />
                  )}
                </div>
              )}

              <div class="projects-spacer" />

              {activeCraftTab === "workbench" && (
                <button
                  type="button"
                  class="projects-btn projects-btn-run"
                  onClick={handleRunSimulation}
                  aria-label="Run Simulation"
                  disabled={simulationLoading}
                >
                  <img src={runIcon} alt="" class="projects-btn-run-icon" />
                  <span class="projects-btn-label">
                    {simulationLoading ? "Running…" : "Run Simulation"}
                  </span>
                </button>
              )}
            </div>
          </div>

          <main
            class={`projects-workspace projects-reveal projects-reveal--workspace ${revealReady ? "is-visible" : ""}`}
          >
            <div class="project-craft-content">
              {activeCraftTab === "data" && (
                <div class="project-craft-panel">
                  {simulationLoading ? (
                    <p class="project-craft-placeholder project-craft-placeholder--loading">
                      Running simulation…
                    </p>
                  ) : dataTabLoading ? (
                    <p class="project-craft-placeholder project-craft-placeholder--loading">
                      Loading stored data…
                    </p>
                  ) : simulationResult && Object.keys(simulationResult).length > 0 ? (
                    <SimulationResults
                      result={simulationResult}
                      onClear={() => setSimulationResult(null)}
                    />
                  ) : (
                    <p class="project-craft-placeholder">
                      Data — run a simulation from the toolbar to see CSV results here.
                    </p>
                  )}
                </div>
              )}
              {activeCraftTab === "workbench" && (
                <div class="project-craft-panel project-craft-panel--workbench">
                  <Workbench loads={workbenchLoads} setLoads={setWorkbenchLoads} />
                </div>
              )}
              {activeCraftTab === "graphs" && (
                <div class="project-craft-panel">
                  {simulationLoading ? (
                    <p class="project-craft-placeholder project-craft-placeholder--loading">
                      Running simulation…
                    </p>
                  ) : dataTabLoading ? (
                    <p class="project-craft-placeholder project-craft-placeholder--loading">
                      Loading stored graph data…
                    </p>
                  ) : simulationResult && Object.keys(simulationResult).length > 0 ? (
                    <SimulationGraphsPanel result={simulationResult} />
                  ) : (
                    <p class="project-craft-placeholder">
                      Graphs — run a simulation from the toolbar to see charted results here.
                    </p>
                  )}
                </div>
              )}
            </div>
          </main>
        </section>
      </div>
      {isWizardOpen && (
        <ProjectWizard 
          projectName = {activeProjectName}
          initialStep = {wizardInitialStep}

          initialData={(projects.find(p => p.id === activeProjectId) as any)?.wizardConfig || projects.find(p => p.id === activeProjectId)}

          onClose={() => setWizardOpen(false)}
          onFinish={async (wizardData) => {
            if (!auth.currentUser) return;

            if (wizardInitialStep !== "ONBOARDING_PROMPT") {
              try {
                await updateProject(auth.currentUser.uid, activeProjectId, {
                  wizardConfig: wizardData
              });

              await refreshProjects();
            } catch (e) {
              console.error("error updating project configuration", e);
              alert("Failed to save changes.");
            } finally {
              setWizardOpen(false);
              setWizardInitialStep("ONBOARDING_PROMPT");
            }
            return;
          }
            console.log("Wizard Completed with Data:", wizardData);
            setWizardOpen(false);

            if (!auth.currentUser) return;

            try {
              // 1. Create the new project in Firestore
              const newProjectId = await createProject(auth.currentUser.uid, {
                name: wizardData.name,
                ownerId: auth.currentUser.uid,
                description: "Created via Smart Wizard",
                wizardConfig: wizardData, 
              });

              // 2. Refresh the sidebar list to show the new project
              await refreshProjects();

              // 3. Automatically select the new project
              setActiveProjectId(newProjectId);

            } catch (e) {
              console.error("Error creating project:", e);
              alert("Failed to create project. See console for details.");
            } finally {
              setWizardInitialStep("ONBOARDING_PROMPT")
            }
          }} 
        />
      )}
    </div>
  );
}
