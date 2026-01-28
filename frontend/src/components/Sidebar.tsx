import { h } from 'preact';
import { useState } from 'preact/hooks';
import '../css/Sidebar.scss';

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
}

interface SidebarProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
}

export default function Sidebar({ projects, selectedProjectId, onSelectProject, onAddProject }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Simple filter logic
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div class="sidebar-container">
      <h2>Projects</h2>
      
      {/* Search Bar */}
      <div class="search-box">
        <input 
          type="text" 
          placeholder="Search Q" 
          value={searchTerm}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
        />
      </div>

      {/* Project List */}
      <ul class="project-list">
        {filteredProjects.map((project) => (
          <li 
            key={project.id} 
            class={selectedProjectId === project.id ? 'active' : ''}
            onClick={() => onSelectProject(project.id)}
          >
            <span class="folder-icon">📁</span>
            {project.name}
          </li>
        ))}
        
        {filteredProjects.length === 0 && (
          <li style={{ fontStyle: 'italic', opacity: 0.5 }}>No projects found</li>
        )}
      </ul>

      {/* Add Button at Bottom */}
      <button class="add-project-btn" onClick={onAddProject}>
        <span>+</span> Add Project
      </button>
    </div>
  );
}