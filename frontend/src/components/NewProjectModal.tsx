import { useState } from "preact/hooks";
import { createProject } from "../database/firestore";
import { auth } from "../utils/firebase/firebase-init";
import "../css/ProjectsPage/new-project.css";



interface NewProjectModalProps {
    onClose: () => void;
    onProjectCreated?: (project: any) => void;
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
          const projectData = {
            name: projectName.trim(),
            description: projectDescription.trim(),
            ownerId: user.uid
          }
          
          const newProjectId = await createProject(user.uid, projectData);
          
          onProjectCreated?.({
            ...projectData,
            id: newProjectId
          });

          onClose();
        }catch (err) {
            console.error("Error creating project:", err);
            setError("Failed to create project. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
  <div class="np-card">
    <div class="np-header">
      <h2 class="np-title">New Project</h2>

      <button type="button" class="np-close" onClick={onClose} aria-label="Close">
        &times;
      </button>
    </div>

    <form onSubmit={handleSubmit}>
      <div class="np-group">
        <label class="np-label"> Project Name <span class="np-required">*</span>
        </label>
        <input
          type="text"
          class="np-input"
          placeholder="Enter project name"
          value={projectName}
          onInput={(e) => setProjectName((e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="np-group">
        <label class="np-label">Description</label>
        <textarea
          class="np-textarea"
          rows={3}
          placeholder="Enter project description (optional)"
          value={projectDescription}
          onInput={(e) =>
            setProjectDescription((e.target as HTMLTextAreaElement).value)
          }
        />
      </div>

      {error && <p class="np-error">{error}</p>}

      <div class="np-actions">
        <button type="button" class="np-btn np-btn-cancel" onClick={onClose}>
          Cancel
        </button>

        <button type="submit" disabled={loading} class="np-btn np-btn-primary">
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>
    </form>
  </div>
);


    

}

export default NewProjectModal;