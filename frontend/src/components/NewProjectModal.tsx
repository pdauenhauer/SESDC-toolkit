import { useState } from "preact/hooks";
import { createProject } from "../database/firestore";
import { auth } from "../utils/firebase/firebase-init";

interface NewProjectModalProps {
    onClose: () => void;
    onProjectCreated?: () => void;
}

function NewProjectModal({ onClose, onProjectCreated }: NewProjectModalProps) {
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        
        if (!projectName.trim()) {
            setError("Project name is required");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            setError("You must be logged in to create a project");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await createProject(user.uid, {
                name: projectName.trim(),
                description: projectDescription.trim(),
                ownerId: user.uid,
            });
            onProjectCreated?.();
            onClose();
        } catch (err) {
            console.error("Error creating project:", err);
            setError("Failed to create project. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            class="fixed inset-0 bg-black/50 flex justify-center items-center z-[200] p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div class="bg-[#F7F9F1] rounded-lg p-6 w-full max-w-md shadow-lg">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold text-[#0A090C]">New Project</h2>
                    <button 
                        type="button"
                        class="text-2xl text-[#4a5568] hover:text-[#0A090C] bg-transparent border-none cursor-pointer"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-[#4a5568] mb-1">
                            Project Name *
                        </label>
                        <input
                            type="text"
                            placeholder="Enter project name"
                            value={projectName}
                            onInput={(e) => setProjectName((e.target as HTMLInputElement).value)}
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#0A090C] focus:outline-none focus:border-[#037F6F]"
                        />
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium text-[#4a5568] mb-1">
                            Description
                        </label>
                        <textarea
                            placeholder="Enter project description (optional)"
                            value={projectDescription}
                            onInput={(e) => setProjectDescription((e.target as HTMLTextAreaElement).value)}
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#0A090C] focus:outline-none focus:border-[#037F6F] resize-none"
                            rows={3}
                        />
                    </div>

                    {error && (
                        <p class="text-red-500 text-sm mb-4">{error}</p>
                    )}

                    <div class="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            class="px-4 py-2 rounded-lg text-[#4a5568] bg-gray-200 hover:bg-gray-300 border-none cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            class="px-4 py-2 rounded-lg text-[#F7F9F1] bg-[#037F6F] hover:bg-[#05B39C] border-none cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewProjectModal;