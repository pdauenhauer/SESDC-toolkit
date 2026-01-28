import { h } from 'preact';
import { useState } from 'preact/hooks';

import Sidebar, { Project } from '../components/Sidebar';
import ProjectWizard from '../components/ProjectWizard';

import '../css/Sidebar.scss';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([
    { id: '1', name: 'Tester', updatedAt: '2025-10-20' },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleWizardFinish = (newProjectData: any) => {
    console.log("Wizard Finished with data:", newProjectData);
    
//Adds the new project to the list (Mock logic)
    const newId = Math.random().toString(36).substr(2, 9);
    const newProject: Project = {
      id: newId,
      name: newProjectData.name,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    setProjects([newProject, ...projects]); // Add to top of list
    setSelectedId(newId); // Auto-select the new project
  };

  return (
    <div class="app-layout">
      {/* Show Wizard if state is true */}
      {isWizardOpen && (
        <ProjectWizard 
          onClose={() => setIsWizardOpen(false)} 
          onFinish={handleWizardFinish} 
        />
      )}

      <Sidebar 
        projects={projects}
        selectedProjectId={selectedId}
        onSelectProject={setSelectedId}
        onAddProject={() => setIsWizardOpen(true)}
      />

      <div class="main-content">
        {selectedId ? (
          <div>
             {}
            <h1>{projects.find(p => p.id === selectedId)?.name}</h1>
            <p>Components enabled would appear here...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
            <h2>Select a project to begin</h2>
          </div>
        )}
      </div>
    </div>
  );
}