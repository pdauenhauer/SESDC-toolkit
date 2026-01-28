import { useState, useEffect } from "preact/hooks";
import { Timestamp } from "firebase/firestore";
import SESDCHeader from "../components/SESDCHeader";
import ProjectsList from "../components/ProjectsList";
import { listProjects } from "../database/firestore";
import { auth } from "../utils/firebase/firebase-init";
import { onAuthStateChanged } from "firebase/auth";
import "../css/projects.css";
import type { Project } from "../database/models/metadata";

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
  const [activeProjectId, setActiveProjectId] = useState<string>("1");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const HEADER_H = 80;

  // Fetch projects
  useEffect(() => {
    if (USE_DUMMY_DATA) {
      setProjects(dummyProjects);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userProjects = await listProjects(user.uid);
          setProjects(userProjects);
        } catch (error) {
          console.error("Error fetching projects:", error);
        }
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        {/* LEFT SIDEBAR */}
        <aside class="projects-sidebar">
          <ProjectsList 
            projects={projects}
            loading={loading}
            activeProjectId={activeProjectId}
            onProjectSelect={(id) => setActiveProjectId(id)}
            onProjectCreated={refreshProjects}
          />
        </aside>

        
        <section class="projects-main">
          {/*Cross bar*/}
          <div class="projects-toolbar">
            <div class="projects-toolbar-row">
              <button
                type="button"
                class="projects-btn projects-btn-add"
                onClick={() => console.log("Add new Component")}
              >
                <span class="projects-btn-plus">＋</span>
                Add new Component
              </button>

              <div class="projects-currentLoad">
                Current Total Load: <span class="projects-currentLoad-strong">   </span>
              </div>

              <div class="projects-spacer" />

              <button
                type="button"
                class="projects-btn projects-btn-run"
                onClick={() => console.log("Run Simulation")}
              >
                <span class="projects-btn-play">▶</span>
                Run Simulation
              </button>
            </div>
          </div>

          {/* Workspace */}
          <main class="projects-workspace" />
        </section>
      </div>
    </div>
  );
}
