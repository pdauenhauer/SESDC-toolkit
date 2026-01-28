import { useState } from "preact/hooks";
import SESDCHeader from "../components/SESDCHeader";
import ProjectsList from "../components/ProjectsList";
import "../css/projects.css";

export default function Projects() {
  const [activeProjectId, setActiveProjectId] = useState<string>("1");
  const HEADER_H = 80;

  return (
    <div class="projects-page" style={{ paddingTop: `${HEADER_H}px` }}>
      <SESDCHeader />

      <div class="projects-layout" style={{ height: `calc(100vh - ${HEADER_H}px)` }}>
        {/* LEFT SIDEBAR */}
        <aside class="projects-sidebar">
          <ProjectsList 
            activeProjectId={activeProjectId}
            onProjectSelect={(id) => setActiveProjectId(id)}
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
