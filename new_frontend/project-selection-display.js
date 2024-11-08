document.addEventListener('DOMContentLoaded', function() {
    renderProjects();
});

let projects = [,
];

function openModal() {
document.getElementById('addProjectModal').classList.add('active');
}

function closeModal() {
    document.getElementById('addProjectModal').classList.remove('active');
}

function handleAddProject(event) {
    event.preventDefault();

    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;

    const newProject = {
        name,
        description,
        created: new Date().toISOString().split('T')[0],
    };

    projects.push(newProject);
    renderProjects();
    closeModal();
    event.target.reset();
}

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) {
        console.error('Projects grid element not found!');
        return;
    }
    grid.innerHTML = projects.map(project => `
        <div class="project-card">
            <h3>${project.name}</h3>
            <p>${project.description}</p>
            <div class="project-meta">
                <span>Created: ${project.created}</span>
            </div>
            <div class="simulation-btn">
                <a href="simulation-inputs.html">
                <button class="simulation">Simulate</button>
                </a>
            </div>    
        </div>
    `).join('');
}