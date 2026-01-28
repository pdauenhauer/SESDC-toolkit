import type { Project } from "../database/models/metadata";
import { useState, useEffect, useMemo } from "preact/hooks";
import { Timestamp } from "firebase/firestore";
import { listProjects } from "../database/firestore";
import { auth } from "../utils/firebase/firebase-init";
import { onAuthStateChanged } from "firebase/auth";
import NewProjectModal from "./NewProjectModal";
import exitIcon from "../media/cross.png";
import projectIcon from "../media/project.png";

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

interface ProjectsListProps {
    activeProjectId?: string;
    onProjectSelect?: (projectId: string) => void;
}

function ProjectsList({ activeProjectId, onProjectSelect }: ProjectsListProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [query, setQuery] = useState("");

    useEffect(() => {
        // Use dummy data for testing
        if (USE_DUMMY_DATA) {
            setProjects(dummyProjects);
            setLoading(false);
            return;
        }

        // Listen for auth state changes
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

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    // Filter projects based on search query
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter((p) => p.name.toLowerCase().includes(q));
    }, [projects, query]);

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
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* New Project button at bottom */}
            <div class="projects-sidebar-footer">
                <button
                    type="button"
                    class="projects-new-btn"
                    onClick={() => setShowNewProjectModal(true)}
                >
                    <span class="projects-new-plus">＋</span>
                    New Project
                </button>
            </div>

            {showNewProjectModal && (
                <NewProjectModal 
                    onClose={() => setShowNewProjectModal(false)}
                    onProjectCreated={async () => {
                        // Refresh projects list after creating a new one
                        if (USE_DUMMY_DATA) return;
                        const user = auth.currentUser;
                        if (user) {
                            const userProjects = await listProjects(user.uid);
                            setProjects(userProjects);
                        }
                    }}
                />
            )}
        </>
    );
}

export default ProjectsList;