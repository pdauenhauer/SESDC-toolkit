import type { Project } from "../database/models/metadata";
import { useState, useMemo, useEffect } from "preact/hooks";
import NewProjectModal from "./NewProjectModal";
import exitIcon from "../media/cross.png";
import projectIcon from "../media/project.png";
import optionIcon from "../media/option.png";

interface ProjectsListProps {
    projects: Project[];
    loading: boolean;
    activeProjectId?: string;
    onProjectSelect?: (projectId: string) => void;
    onProjectCreated?: () => void;
    onNewProjectClick?: () => void;
}

function ProjectsList({ 
    projects, 
    loading, 
    activeProjectId, 
    onProjectSelect, 
    onProjectCreated,
    onNewProjectClick 
}: ProjectsListProps) {
    const [openOptionsProject, setOpenOptionsProject] = useState<string | null>(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [query, setQuery] = useState("");

    // Filter projects based on search query
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter((p) => p.name.toLowerCase().includes(q));
    }, [projects, query]);

    useEffect(() => {
        if (!openOptionsProject) return;
        const handleClickOutside = () => setOpenOptionsProject(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [openOptionsProject]);


    return (
        <>
            {/* Header with title and search */}
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

            {/* Projects list */}
            <div class="projects-sidebar-content">
                <div class="projects-group">
                    <div class="projects-group-title">My Projects</div>
                    <div class="projects-list">
                        {loading ? (
                            <div class="projects-item" style="opacity: 0.7; cursor: default;">
                                <span class="projects-item-label">Loading...</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div class="projects-item" style="opacity: 0.7; cursor: default;">
                                <span class="projects-item-label">No projects yet</span>
                            </div>
                        ) : (
                            filtered.map((project) => (
                                <button
                                    key={project.id}
                                    type="button"
                                    class={[
                                        "projects-item",
                                        project.id === activeProjectId ? "is-active" : "",
                                    ].join(" ")}
                                    onClick={() => onProjectSelect?.(project.id)}
                                >
                                    <img src={projectIcon} alt="" class="projects-item-icon" />
                                    <span class="projects-item-label">{project.name}</span>

                                    <button
                                    type="button"
                                    class="projects-item-options"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenOptionsProject((prev) => (prev === project.id ? null : project.id));
                                    }}
                                        aria-label="Options"
                                        >
                                          <img src={optionIcon} alt="" class="projects-item-icon" />

                                        </button>
                                        
                                        {openOptionsProject === project.id && (
                                          <div
                                            class="projects-item-menu"
                                            onClick={(e) => e.stopPropagation()} 
                                          >
                                            <button type="button" class="projects-item-menu-item">
                                              Rename
                                            </button>

                                            <button type="button" class="projects-item-menu-item">
                                              Project Info
                                            </button>

                                            <div class="projects-item-menu-divider" />
                                            <button type="button" class="projects-item-menu-item is-danger">
                                              Delete
                                            </button>
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* New Project button at bottom */}
            <div class="projects-sidebar-footer">
                {!showNewProjectModal ? (
                    <button
                       type="button"
                       class="projects-new-btn"
                       onClick={() => setShowNewProjectModal(true)}
                    >
                        <span class="projects-new-plus">＋</span>
                        New Project
                    </button>
                    ) : (
                        <NewProjectModal
                        onClose={() => setShowNewProjectModal(false)}
                        onProjectCreated={() => {
                        onProjectCreated?.();
                        setShowNewProjectModal(false);
                        }}
                    />
                )}
            </div>
        </>
    );
}

export default ProjectsList;
