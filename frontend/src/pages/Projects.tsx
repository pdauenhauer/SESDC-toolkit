import { useState, useEffect, useRef } from "preact/hooks";
import { Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ProjectsSidebar from "../components/ProjectsSidebar";
import Workbench from "../components/Workbench";
import SimulationResults from "../components/SimulationResults";
import type { Load } from "../database/models/load";
import type { Project } from "../database/models/metadata";
import { createNewLoad } from "../utils/loadUtils";
import { auth } from "../utils/firebase/firebase-init";
import ProjectWizard from '../components/ProjectWizard';
import { addDoc, collection } from "firebase/firestore";
import { db } from "../utils/firebase/firebase-init";
import { listProjects, getProjectLoads, saveProjectLoads } from "../database/firestore";
import {
  buildSimulationPayload,
  fetchStoredSimulation,
  runSimulation,
  type SimulationResult,
} from "../services/simulation";
import menuIcon from "../media/layout-grid.svg";
import settingIcon from "../media/settings.svg";
import houseIcon from "../media/house.svg";
import boxesIcon from "../media/boxes.svg";
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
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCraftTab, setActiveCraftTab] = useState<CraftTabId>("workbench");
  const [workbenchLoads, setWorkbenchLoads] = useState<Load[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [dataTabLoading, setDataTabLoading] = useState(false);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const [isWizardOpen, setWizardOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleAddComponent = () => {
    setWorkbenchLoads((prev) => [...prev, createNewLoad(`Load ${prev.length + 1}`)]);
  };

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

  // 3) When on Data tab and active project changes, fetch stored data for that project only
  useEffect(() => {
    if (activeCraftTab !== "data") return;
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
          <aside class="projects-sidebar">
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
          <div class="projects-project-header">
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
                <Tooltip text="Home" position="right">
                  <button
                    type="button"
                    class="projects-toolbar-icon-btn projects-top-icon-btn"
                    onClick={() => (window.location.href = "/")}
                    aria-label="Home"
                    title="Home"
                  >
                    <img src={houseIcon} alt="" class="projects-toolbar-icon" />
                  </button>
                </Tooltip>
              </>
            </div>
            <div class="projects-project-header-title-wrap">
              <span class="projects-project-header-outer-box projects-project-header-outer-box--left" />
              <span class="projects-project-header-outer-box projects-project-header-outer-box--right" />
              <div class="projects-project-header-title" title={activeProjectName}>
                <img src={boxesIcon} alt="" class="projects-project-header-title-icon" />
                {activeProjectName}
              </div>
            </div>
            <div class="projects-project-header-side projects-project-header-side--right">
              <button
                type="button"
                class="projects-toolbar-icon-btn projects-top-icon-btn"
                onClick={() => console.log("Open Settings")}
                aria-label="Settings"
                title="Settings"
              >
                <img src={settingIcon} alt="" class="projects-toolbar-icon" />
              </button>
            </div>
          </div>

          <div class="projects-toolbar">
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
                    onClick={() => setActiveCraftTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div class="projects-spacer" />

              {activeCraftTab === "workbench" && (
                <button type="button" class="projects-btn projects-btn-add" onClick={handleAddComponent}>
                  <span class="projects-btn-plus">＋</span>
                  Add new Component
                </button>
              )}
              <button
                type="button"
                class="projects-btn projects-btn-run"
                onClick={handleRunSimulation}
                disabled={simulationLoading}
              >
                <span class="projects-btn-play">▶</span>
                {simulationLoading ? "Running…" : "Run Simulation"}
              </button>
            </div>
          </div>

          <main class="projects-workspace">
            <div class="project-craft-content">
              {activeCraftTab === "data" && (
                <div class="project-craft-panel">
                  {simulationResult ? (
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
                  <p class="project-craft-placeholder">
                    Graphs — simulation charts and visualizations.
                  </p>
                </div>
              )}
            </div>
          </main>
        </section>
      </div>
      {isWizardOpen && (
        <ProjectWizard 
          projectName=""
          onClose={() => setWizardOpen(false)}
          onFinish={async (wizardData) => {
            console.log("Wizard Completed with Data:", wizardData);
            setWizardOpen(false);

            if (!auth.currentUser) return;

            try {
              // 1. Create the new project in Firestore
              const newProjectRef = await addDoc(collection(db, "projects"), {
                name: wizardData.name,
                ownerId: auth.currentUser.uid,
                description: "Created via Smart Wizard",
                wizardConfig: wizardData, 
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });

              // 2. Refresh the sidebar list to show the new project
              await refreshProjects();

              // 3. Automatically select the new project
              setActiveProjectId(newProjectRef.id);

            } catch (e) {
              console.error("Error creating project:", e);
              alert("Failed to create project. See console for details.");
            }
          }} 
        />
      )}
    </div>
  );
}
