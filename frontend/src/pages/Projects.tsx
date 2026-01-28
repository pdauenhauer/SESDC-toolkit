import { useMemo, useState } from "preact/hooks";
import SESDCHeader from "../components/SESDCHeader";
import exitIcon from "../media/cross.png";
import projectIcon from "../media/project.png";
import "../css/projects.css";

type ProjectItem = {
  id: string;
  name: string;
  group: "Projects" | "Demo Projects";
};

export default function Projects() {
  const [query, setQuery] = useState("");
  const [activeProjectId, setActiveProjectId] = useState<string>("p1");
  const HEADER_H = 80;

  // temp data
  const projects: ProjectItem[] = useMemo(
    () => [
      { id: "p1", name: "Test", group: "Projects" },
      { id: "p2", name: "New idea", group: "Projects" },
      { id: "p3", name: "Ideal setup", group: "Projects" },
      { id: "d1", name: "User Example", group: "Demo Projects" },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <div class="projects-page" style={{ paddingTop: `${HEADER_H}px` }}>
      <SESDCHeader />

      <div class="projects-layout" style={{ height: `calc(100vh - ${HEADER_H}px)` }}>
        {/* LEFT SIDEBAR */}
        <aside class="projects-sidebar">
          
          <div class="projects-sidebar-header">
            <div class="projects-sidebar-title">Projects</div>
            <div class="projects-search">
              <input
                class="projects-search-input"
                placeholder="Search Projects"
                value={query}
                onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
              />

              <button
                type="button"
                class="projects-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear"
              >
                <img src={exitIcon} alt="Clear search" class="projects-search-clear-icon" />
              </button>
            </div>
          </div>

          {/* Lists */}
          <div class="projects-sidebar-content">
            {/* Projects group */}
            <div class="projects-group">
              <div class="projects-group-title">Projects</div>
              <div class="projects-list">
                {filtered
                  .filter((p) => p.group === "Projects")
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      class={[
                        "projects-item",
                        p.id === activeProjectId ? "is-active" : "",
                      ].join(" ")}
                      onClick={() => setActiveProjectId(p.id)}
                    >
                      <img src={projectIcon} alt="" class="projects-item-icon" />
                      <span class="projects-item-label">{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>
            <div class="projects-divider" />

            {/* Demo Projects group */}
            <div class="projects-group">
              <div class="projects-group-title">Demo Projects</div>
              <div class="projects-list">
                {filtered
                  .filter((p) => p.group === "Demo Projects")
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      class={[
                        "projects-item",
                        p.id === activeProjectId ? "is-active" : "",
                      ].join(" ")}
                      onClick={() => setActiveProjectId(p.id)}
                    >
                      <img src={projectIcon} alt="" class="projects-item-icon" />
                      <span class="projects-item-label">{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* New Project at bottom */}
          <div class="projects-sidebar-footer">
            <button
              type="button"
              class="projects-new-btn"
              onClick={() => console.log("New Project")}
            >
              <span class="projects-new-plus">＋</span>
              New Project
            </button>
          </div>
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
