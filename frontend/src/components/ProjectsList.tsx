import type { Project } from "../database/models/metadata";
import { useState, useEffect } from "preact/hooks";
import { Timestamp } from "firebase/firestore";
import { listProjects } from "../database/firestore";
import { auth } from "../utils/firebase/firebase-init";
import { onAuthStateChanged } from "firebase/auth";
import NewProjectModal from "./NewProjectModal";

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

function ProjectsList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);

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

    return (
        <aside 
            class="bg-[#808080] w-[250px] min-h-[calc(100vh-80px)] py-5 fixed left-0 top-[80px] z-[100] shadow-[2px_0_5px_rgba(0,0,0,0.1)] overflow-y-auto flex flex-col"
        >
            <div class="px-5 pb-5 border-b border-white/20 mb-5">
                <h2 class="text-[#F7F9F1] text-2xl font-semibold m-0">Projects</h2>
            </div>
            
            <ul class="list-none flex-1">
                {loading ? (
                    <li class="px-5 py-3 text-[#F7F9F1] opacity-70">Loading...</li>
                ) : projects.length === 0 ? (
                    <li class="px-5 py-3 text-[#F7F9F1] opacity-70">No projects yet</li>
                ) : (
                    projects.map((project) => (
                        <li key={project.id} class="flex items-center px-5 py-3 cursor-pointer transition-[background-color] duration-200 ease-in-out text-[#F7F9F1] hover:bg-white/10">
                            <i class="bx bx-folder text-2xl mr-3" style="color: #EDD16E;"></i>
                            <span class="text-base font-normal flex-1">{project.name}</span>
                        </li>
                    ))
                )}
            </ul>

            <div class="px-5 py-4 border-t border-white/20 mt-auto">
                <button class="bg-[#037F6F] text-[#F7F9F1] px-4 py-2 rounded-lg text-sm font-bold cursor-pointer border-none w-full hover:bg-[#05B39C] transition-colors duration-300" onClick={() => setShowNewProjectModal(true)}>
                    + Add Project
                </button>
            </div>

            {showNewProjectModal && <NewProjectModal />}
        </aside>
    );
}

export default ProjectsList;