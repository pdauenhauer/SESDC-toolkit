import { useState, useEffect, useRef } from "preact/hooks";
import { Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import SESDCHeader from "../components/SESDCHeader";
import ProjectsList from "../components/ProjectsList";
import ProjectCraftArea, { type CraftTabId } from "../components/ProjectCraftArea";
import type { Load } from "../database/models/load";
import type { Project } from "../database/models/metadata";
import { createNewLoad } from "../utils/loadUtils";
import { auth } from "../utils/firebase/firebase-init";
import ProjectWizard from '../components/ProjectWizard';
import { addDoc, collection } from "firebase/firestore";
import { db } from "../utils/firebase/firebase-init";
import { listProjects, getProjectLoads, saveProjectLoads } from "../database/firestore";
import "../css/projects.css";

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
export default function Projects() {
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCraftTab, setActiveCraftTab] = useState<CraftTabId>("workbench");
  const [workbenchLoads, setWorkbenchLoads] = useState<Load[]>([]);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const [isWizardOpen, setWizardOpen] = useState(false);

  const HEADER_H = 80;

  // const handleAddComponent = () => {
  //   setWorkbenchLoads((prev) => [...prev, createNewLoad(`Load ${prev.length + 1}`)]);
  // };

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

  // 3) load loads when active project changes
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

  return (
    <div class="projects-page" style={{ paddingTop: `${HEADER_H}px` }}>
      <SESDCHeader />

      <div class="projects-layout" style={{ height: `calc(100vh - ${HEADER_H}px)` }}>
        <aside class="projects-sidebar">
          <ProjectsList
            projects={projects}
            loading={loading}
            activeProjectId={activeProjectId}
            onProjectSelect={(id) => setActiveProjectId(id)}
            onProjectCreated={refreshProjects}
            onNewProjectClick={() => setWizardOpen(true)}
          />
        </aside>

        <section class="projects-main">
          <div class="projects-toolbar">
            <div class="projects-toolbar-row">
              {activeCraftTab === "workbench" && (
                <button type="button" class="projects-btn projects-btn-add" onClick={() => setWizardOpen(true)}>
                  Add new Component
                </button>
              )}
                  <span class="projects-btn-plus">＋</span>
              <div class="projects-currentLoad">
                Current Total Load: <span class="projects-currentLoad-strong"> </span>
              </div>

              <div class="projects-spacer" />

              <button type="button" class="projects-btn projects-btn-run" onClick={() => console.log("Run Simulation")}>
                <span class="projects-btn-play">▶</span>
                Run Simulation
              </button>
            </div>
          </div>

          <main class="projects-workspace">
            <ProjectCraftArea
              activeTab={activeCraftTab}
              onTabChange={setActiveCraftTab}
              workbenchLoads={workbenchLoads}
              setWorkbenchLoads={setWorkbenchLoads}
            />
          </main>
        </section>
      </div>
      {isWizardOpen && (
        <ProjectWizard 
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