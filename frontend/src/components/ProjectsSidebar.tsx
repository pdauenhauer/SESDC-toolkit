import { auth } from "../utils/firebase/firebase-init";
import type { Project } from "../database/models/metadata";
import { updateProject, deleteProject } from "../database/firestore";
import { projectPatchFromWizardData } from "../database/projectPayload";
import { deleteField } from "firebase/firestore";
import { useState, useMemo, useEffect } from "preact/hooks";
import NewProjectModal from "./NewProjectModal";
import exitIcon from "../media/circle-x.svg";
import plusIcon from "../media/plus.svg";
import projectIcon from "../media/boxes.svg";
import optionIcon from "../media/option.png";
import hideIcon from "../media/x.svg";
import ProjectWizard from "./ProjectWizard";
import Tooltip from "./Tooltip";
import "../css/ProjectsPage/sideBar.css";

interface ProjectsSidebarProps {
    projects: Project[];
    loading: boolean;
    activeProjectId?: string;
    onProjectSelect?: (projectId: string) => void;
    onProjectCreated?: () => void;
    onNewProjectClick?: () => void;
    onHideSidebar?: () => void;
}

function ProjectsList({ 
    projects, 
    loading, 
    activeProjectId, 
    onProjectSelect, 
    onProjectCreated,
    onHideSidebar,

}: 
ProjectsSidebarProps) {
    const [infoProject, setInfoProject] = useState<Project | null>(null);
    const [editingProjectName, setEditingProjectName] = useState(false);
    const [projectNameDraft, setProjectNameDraft] = useState("");
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [query, setQuery] = useState("");

    const [showWizard, setShowWizard] = useState(false);
    const [justCreatedProject, setJustCreatedProject] = useState<Project | null>(null);
    // Filter projects based on search query
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter((p) => p.name.toLowerCase().includes(q));
    }, [projects, query]);

    const handleWizardFinish = async (wizardData: any) => {
        // Debugging logs to see exactly what we caught!
    console.log("Data from Wizard:", wizardData);
    console.log("Just Created Project state:", justCreatedProject);

        if (!justCreatedProject || !auth.currentUser) return;
        
        const projectId = typeof justCreatedProject === 'string' 
        ? justCreatedProject 
        : justCreatedProject.id;

        if (!projectId) {
        console.error("Critical Error: Missing Project ID!");
        alert("Failed to save wizard data: Project ID is missing.");
        return;
        }

        try {
            const patch = projectPatchFromWizardData(wizardData);
            await updateProject(auth.currentUser.uid, projectId, {
              ...patch,
              wizardConfig: deleteField()
            } as Partial<Project>);
            onProjectCreated?.();
        } catch (error) {
            console.error("Failed to save wizard data", error);
        }
        
        setShowWizard(false);
        setJustCreatedProject(null);
    };

    const userPermission = () => {
        const user = auth.currentUser;
        if(!user) {
            alert("You must be logged in");
            return null;
        }
        return user;
    };

    const deleteHandler = async (project: Project) => {
        const user = userPermission();
        if(!user) return;

        const confirm = window.confirm(`Delete project ${project.name}? This cannot be undone.`);
        if(!confirm) return;

        try{
            await deleteProject(user.uid, project.id);

            if(activeProjectId === project.id){
                onProjectSelect?.("");
            }

            if (infoProject?.id === project.id) {
                setInfoProject(null);
                setEditingProjectName(false);
            }
            onProjectCreated?.();
        } catch (err){
            console.error("Delete failed: ", err);
        }
    };

    const infoHandler = (project: Project) => {
        setInfoProject(project);
        setEditingProjectName(false);
        setProjectNameDraft(project.name);
    }

    const formatProjectDate = (value: unknown) => {
        if (
            value &&
            typeof value === "object" &&
            "toDate" in value &&
            typeof (value as { toDate: () => Date }).toDate === "function"
        ) {
            return (value as { toDate: () => Date }).toDate().toLocaleString();
        }
        return "Not available";
    };

    const saveProjectName = async () => {
        if (!infoProject) {
            setEditingProjectName(false);
            return;
        }

        const name = projectNameDraft.trim();
        if (!name) {
            setProjectNameDraft(infoProject.name);
            setEditingProjectName(false);
            return;
        }

        if (name === infoProject.name) {
            setEditingProjectName(false);
            return;
        }

        const user = userPermission();
        if (!user) {
            setProjectNameDraft(infoProject.name);
            setEditingProjectName(false);
            return;
        }

        try {
            await updateProject(user.uid, infoProject.id, { name });
            setInfoProject({ ...infoProject, name });
            onProjectCreated?.();
        } catch (err) {
            console.error("Rename failed: ", err);
            setProjectNameDraft(infoProject.name);
        } finally {
            setEditingProjectName(false);
        }
    };

    return (
        <>
            {/* Header with title and search*/ }
            <div class="projects-sidebar-header">
                <div class="projects-sidebar-header-row">
                    <div class="projects-sidebar-title">Projects</div>
                    <Tooltip text="Hide Projects" position="bottom" className="projects-hide-tooltip">
                        <button
                            type="button"
                            class="projects-sidebar-toggle-btn"
                            onClick={() => onHideSidebar?.()}
                            aria-label="Hide Projects"
                        >
                            <img src={hideIcon} alt="" class="projects-sidebar-toggle-icon" />
                        </button>
                    </Tooltip>
                </div>
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
                    >
                        <img src={exitIcon} alt="Clear search" class="projects-search-clear-icon" />
                    </button>
                </div>
            </div>

            {/* Projects list*/ }
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
                                <div
                                    key={project.id}
                                    role="button"
                                    tabIndex={0}
                                    class={[
                                        "projects-item",
                                        project.id === activeProjectId ? "is-active" : "",
                                    ].join(" ")}
                                    onClick={() => onProjectSelect?.(project.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onProjectSelect?.(project.id);
                                        }
                                    }}
                                >
                                    <img src={projectIcon} alt="" class="projects-item-icon" />
                                    <span class="projects-item-label">{project.name}</span>

                                    <button
                                        type="button"
                                        class="projects-item-options"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (infoProject?.id === project.id) {
                                                setInfoProject(null);
                                                setEditingProjectName(false);
                                            } else {
                                                infoHandler(project);
                                            }
                                        }}
                                        aria-label="Project Info"
                                    >
                                        <img src={optionIcon} alt="" class="projects-item-icon" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* New Project button at bottom*/ }
            <div class="projects-sidebar-footer">
                {!showNewProjectModal ? (
                    <button
                       type="button"
                       class="projects-new-btn"
                       onClick={() => setShowNewProjectModal(true)}
                    >
                        <img src={plusIcon} alt="" class="projects-new-plus-icon" />
                        New Project
                    </button>
                    ) : (
                        <NewProjectModal
                        onClose={() => setShowNewProjectModal(false)}
                        onProjectCreated={(newProject: any) => {
                        onProjectCreated?.();
                        if(newProject){
                            setJustCreatedProject(newProject);
                            setShowNewProjectModal(false);
                            setShowWizard(true);
                        } else {
                            setShowNewProjectModal(false);
                        }
                        }}
                    />
                )}
            </div>
            {showWizard && justCreatedProject && (
                <ProjectWizard 
                    projectName={justCreatedProject.name}
                    onClose={() => {
                        setShowWizard(false);
                        setJustCreatedProject(null);
                    }}
                    onFinish={handleWizardFinish}
                />
            )}

            {infoProject && (
            <div
                class="projects-modal-backdrop"
                onClick={() => setInfoProject(null)}
            >
                <div
                class="projects-modal"
                onClick={(e) => e.stopPropagation()}
                >
                <div class="projects-modal-header">
                    <div class="projects-modal-title-wrap">
                        <img src={projectIcon} alt="" class="projects-modal-title-icon" />
                        {editingProjectName ? (
                            <input
                                type="text"
                                class="projects-modal-title-input"
                                value={projectNameDraft}
                                onInput={(e) => setProjectNameDraft((e.currentTarget as HTMLInputElement).value)}
                                onBlur={() => { void saveProjectName(); }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        void saveProjectName();
                                    }
                                    if (e.key === "Escape") {
                                        setProjectNameDraft(infoProject.name);
                                        setEditingProjectName(false);
                                    }
                                }}
                                autoFocus
                            />
                        ) : (
                            <Tooltip text="Edit Name" position="right">
                                <button
                                    type="button"
                                    class="projects-modal-title-button"
                                    onClick={() => setEditingProjectName(true)}
                                >
                                    {infoProject.name}
                                </button>
                            </Tooltip>
                        )}
                    </div>
                    <button
                    type="button"
                    class="projects-modal-close"
                    onClick={() => setInfoProject(null)}
                    aria-label="Close"
                    >
                        <img src={hideIcon} alt="" class="projects-modal-close-icon" />
                    </button>
                </div>

                <div class="projects-modal-body">
                    <div class="projects-modal-section-label">Description</div>
                    <div class="projects-modal-description">
                        {infoProject.description?.toString().trim()
                            ? infoProject.description?.toString()
                            : "No description yet."}
                    </div>
                    <div class="projects-modal-divider" />
                    <div class="projects-modal-meta">
                        <div class="projects-modal-meta-row">
                            <span class="projects-modal-meta-key">Created</span>
                            <span class="projects-modal-meta-value">{formatProjectDate(infoProject.createdAt)}</span>
                        </div>
                        <div class="projects-modal-meta-row">
                            <span class="projects-modal-meta-key">Last Updated</span>
                            <span class="projects-modal-meta-value">{formatProjectDate(infoProject.updatedAt)}</span>
                        </div>
                    </div>
                    <div class="projects-modal-actions">
                        <button
                            type="button"
                            class="projects-modal-delete-btn"
                            onClick={() => deleteHandler(infoProject)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
                </div>
            </div>
            )}
        </>
    );
}

export default ProjectsList;
