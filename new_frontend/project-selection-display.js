import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, getDoc, deleteDoc,doc, increment, setDoc, arrayUnion, arrayRemove, collection, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDG7rEfTtegzIBHFvL6W2rV7HNmmMlkNcQ",
    authDomain: "sesdc-micro-design-tool.firebaseapp.com",
    projectId: "sesdc-micro-design-tool",
    storageBucket: "sesdc-micro-design-tool.firebasestorage.app",
    messagingSenderId: "99363626334",
    appId: "1:99363626334:web:6aaa35b53358a235fc43cf",
    measurementId: "G-7DMVG3X5Y6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    renderProjects();

    document.getElementById('inputsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');
        const userId = localStorage.getItem('loggedInUserId');
    
        const inputs = {
            electricalLoad: document.getElementById('electrical-load').value,
            solarArraySize: document.getElementById('solar-array-size').value,
        }
    
        try {
            const projectRef = doc(db, 'users', userId, 'projects', projectId);
            await updateDoc(projectRef, {
                inputs: inputs,
            });
    
            closeInputsModal();
        } catch (error) {
            console.error('Error saving inputs:', error);
        }
    })
    
    document.getElementById('closeInputsModal').addEventListener('click', () => {
        closeInputsModal();
    })
});

let projects = [,
];

document.getElementById('add-project').addEventListener('click', () => {
    openModal();
})

function openModal() {
    document.getElementById('addProjectModal').classList.add('active');
}

document.getElementById('closeModal').addEventListener('click', () => {
    closeModal();
})

function closeModal() {
    document.getElementById('addProjectModal').classList.remove('active');
}

document.getElementById('addProjectForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const userId = localStorage.getItem('loggedInUserId');

    var usersRef = doc(db, 'users', userId);

    await updateDoc(usersRef, {
        numprojects: increment(1)
    });

    const userDoc = await getDoc(usersRef);

    const projectId = userDoc.data().numprojects;
    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;
    const projectOwner = userId;
    const projectEditors = [userId];
    const projectViewers = [];
    

    const newProject = {
        name,
        description,
        created: new Date().toISOString().split('T')[0],
        id: projectId,
        projectOwner,
        projectEditors,
        projectViewers 
    };

    const projectRef = doc(db, 'users', userId, 'projects', newProject.id.toString());
    await setDoc(projectRef, newProject);

    await updateDoc(usersRef, {
        projectids: arrayUnion(newProject.id.toString()),
    });

    projects.push(newProject);
    renderProjects();
    closeModal();
    event.target.reset();
})

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) {
        console.error('Projects grid element not found!');
        return;
    }
    grid.innerHTML = projects.map(project => `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-header">
                <h3>${project.name}</h3>
                <button class='share-project-button'>
                    <box-icon name='paper-plane' type='solid' color='#31b9a5' ></box-icon>
                </button>
                <button class='delete-project-button'>
                    <i class='bx bxs-trash delete-project' style='color:#ff0303'></i>
                </button>
            </div>
            <p>${project.description}</p>
            <div class="project-meta">
                <span>Created: ${project.created}</span>
            </div>
            <div class="simulation-btn">
                <button id="simulationButton" class="simulation">Add Inputs</button>
            </div>    
        </div>
    `).join('');
    attachDeleteProjectListeners();
    attachSimulationListeners();
}

async function loadProjects() {
    const userId = localStorage.getItem('loggedInUserId');
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const projectIds = userDoc.data().projectids;
        
        projects = [];

        for (const projectId of projectIds) {
            const projectDoc = await getDoc(doc(db, 'users', userId, 'projects', projectId));
            if (projectDoc.exists()) {
                const data = projectDoc.data();
                projects.push({
                    id: projectId,
                    name: data.name,
                    description: data.description,
                    created: data.created
                });
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}


async function attachDeleteProjectListeners() {
    const deleteButtons = document.querySelectorAll('.delete-project-button');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const projectCard = this.closest('.project-card');
            const projectId = projectCard.getAttribute('data-project-id');
            openDeleteConfirmationModal(projectId);
        });
    });

    document.getElementById('cancelDelete').addEventListener('click', () => {
        closeDeleteConfirmationModal();
    })

    document.getElementById('confirmDelete').addEventListener('click', async function() {
        const modal = document.getElementById('deleteConfirmationModal');
        const userId = localStorage.getItem('loggedInUserId');
        const projectId = modal.getAttribute('data-project-id');
        
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            const currentNumProjects = userDoc.data().numprojects;

            const projectRef = doc(db, 'users', userId, 'projects', projectId);
            await deleteDoc(projectRef);
                
            await updateDoc(userRef, {
                projectids: arrayRemove(projectId),
                numprojects: currentNumProjects - 1
            });

            const projectIndex = projects.findIndex(project => project.id.toString() === projectId);
            if (projectIndex !== -1) {
                projects.splice(projectIndex, 1);
            }
            
            document.querySelector('.project-card[data-project-id="' + projectId + '"]').remove();
            closeDeleteConfirmationModal();
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    })
}

function openInputsModal(projectId) {
    const modal = document.getElementById('inputsModal');

    modal.classList.add('active');
    modal.setAttribute('data-project-id', projectId);
}

function closeInputsModal() {
    const modal = document.getElementById('inputsModal');
    modal.classList.remove('active');
}

function attachSimulationListeners() {
    const simulationButtons = document.querySelectorAll('.simulation');
    simulationButtons.forEach(button => {
        button.addEventListener('click', function() {
            const projectCard = this.closest('.project-card');
            const projectId = projectCard.getAttribute('data-project-id');
            openInputsModal(projectId);
        });
    });
}

function openDeleteConfirmationModal(projectId) {
    const modal = document.getElementById('deleteConfirmationModal');
    modal.classList.add('active');
    modal.setAttribute('data-project-id', projectId);
}

function closeDeleteConfirmationModal() {
    const modal = document.getElementById('deleteConfirmationModal');
    modal.classList.remove('active');
}