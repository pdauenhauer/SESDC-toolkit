import type { Project } from "../database/models/metadata";
import { Timestamp } from "firebase/firestore";

// Dummy projects list - will be replaced with DB fetch later
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
    return (
        <aside 
            class="bg-[#808080] w-[250px] min-h-[calc(100vh-80px)] py-5 fixed left-0 top-[80px] z-[100] shadow-[2px_0_5px_rgba(0,0,0,0.1)] overflow-y-auto"
        >
            <div class="px-5 pb-5 border-b border-white/20 mb-5">
                <h2 class="text-[#F7F9F1] text-2xl font-semibold m-0">Projects</h2>
            </div>
            <ul class="list-none p-0 m-0">
                {dummyProjects.map((project) => (
                    <li key={project.id} class="flex items-center px-5 py-3 cursor-pointer transition-[background-color] duration-200 ease-in-out text-[#F7F9F1] hover:bg-white/10">
                        <i class="bx bx-folder text-2xl mr-3" style="color: #EDD16E;"></i>
                        <span class="text-base font-normal flex-1" style="color: #F7F9F1;">{project.name}</span>
                    </li>
                ))}
            </ul>
        </aside>
    );
}

export default ProjectsList;