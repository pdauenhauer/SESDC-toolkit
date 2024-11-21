import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { onSnapshot, getFirestore, getDoc, deleteDoc,doc, increment, setDoc, arrayUnion, arrayRemove, collection, updateDoc, where, query, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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
            const changes = {inputs: inputs};

            await updateDoc(projectRef, changes);

            await syncProjectChanges(projectId, changes);
    
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

    const projectsCollectionRef = collection(db, 'users', userId, 'projects');
    const newProjectRef = doc(projectsCollectionRef);
    const projectId = newProjectRef.id;

    const name = document.getElementById('projectName').value;
    const description = document.getElementById('projectDescription').value;
    
    const newProject = {
        name,
        description,
        created: new Date().toISOString().split('T')[0],
        id: projectId,
        isShared: false,
        projectOwner: userId,
        projectEditors: [],
        projectViewers: [],
    };

    await setDoc(newProjectRef, newProject);

    await updateDoc(usersRef, {
        projectids: arrayUnion(newProject.id.toString()),
        numprojects: increment(1)
    });

    projects.push(newProject);
    renderProjects();
    closeModal();
    event.target.reset();
})

function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    const userId = localStorage.getItem('loggedInUserId');

    if (!grid) {
        console.error('Projects grid element not found!');
        return;
    }

    const projectCards = projects.map(project => {

        const showShareButton = project.projectOwner === userId;
        const showSimulationButton = project.projectEditors.includes(userId) || project.projectOwner === userId;

        return `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <h3>${project.name}</h3>
                    ${showShareButton ? `
                        <button class='share-project-button'>
                            <i class='bx bxs-paper-plane share-project' style='color:#47d0d6'></i>
                        </button>
                    ` : ''}
                    <button class='delete-project-button'>
                        <i class='bx bxs-trash delete-project' style='color:#ff0303'></i>
                    </button>
                </div>
                <p>${project.description}</p>
                <div class="project-meta">
                    <span>Created: ${project.created}</span>
                </div>
                <div class="simulation-btn">
                    ${showSimulationButton ? `
                        <button id="simulationButton" class="simulation">Add Inputs</button>
                    ` : ''}
                </div>    
            </div>
        `;
    });

    grid.innerHTML = projectCards.join('');
    attachDeleteProjectListeners();
    attachShareProjectListeners();
    attachSimulationListeners();
}

async function loadProjects() {
    const userId = localStorage.getItem('loggedInUserId');
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        const projectIds = userDoc.data().projectids;
        
        projects = [];

        if (!projectIds || projectIds.length === 0) {
            return;
        }

        for (const projectId of projectIds) {
            const projectDoc = await getDoc(doc(db, 'users', userId, 'projects', projectId));
            if (projectDoc.exists()) {
                const data = projectDoc.data();
                const projectData = {
                    id: projectId,
                    name: data.name,
                    description: data.description,
                    created: data.created,
                    isShared: data.isShared || false,
                    projectOwner: data.projectOwner || userId,
                    projectEditors: data.projectEditors || [],
                    projectViewers: data.projectViewers || []
                }

                projects.push(projectData);

                if (projectData.isShared) {
                    setupProjectListener(projectId);
                }
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function setupProjectListener(projectId) {
    const userId = localStorage.getItem('loggedInUserId');
    const projectRef = doc(db, 'users', userId, 'projects', projectId);

    return onSnapshot(projectRef, (doc) => {
        if (doc.exists()) {
            const updatedProject = doc.data();

            const projectIndex = projects.findIndex(project => project.id === projectId);
            if (projectIndex !== -1) {
                projects[projectIndex] = updatedProject;
                renderProjects();
            }
        }
    });
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
            
            renderProjects();
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

function attachShareProjectListeners() {
    const shareButtons = document.querySelectorAll('.share-project-button');
    shareButtons.forEach(button => {
        button.addEventListener('click', function() {
            const projectCard = this.closest('.project-card');
            const projectId = projectCard.getAttribute('data-project-id');
            openShareProjectModal(projectId);
        });
    });
}

function openShareProjectModal(projectId) {
    const modal = document.getElementById('shareProjectModal');
    modal.classList.add('active');
    modal.setAttribute('data-project-id', projectId);
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

function closeShareProjectModal() {
    const modal = document.getElementById('shareProjectModal');
    modal.classList.remove('active');
}

document.getElementById('closeShareProjectModal').addEventListener('click', () => {
    closeShareProjectModal();
})

document.getElementById('shareProjectForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const projectId = document.getElementById('shareProjectModal').getAttribute('data-project-id');
    const userId = localStorage.getItem('loggedInUserId');
    const email = document.getElementById('shareEmail').value;
    const projectRole = document.getElementById('roleSelect').value;
    
    try {
        const usersRef = collection(db, 'users');
        const emailQuery = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(emailQuery);

        if (querySnapshot.empty) {
            throw new Error('User with this email is not found');
        }
        
        if (querySnapshot.docs[0].id === userId) {
            throw new Error('You cannot share a project with yourself');
        }

        const sharedUserId = querySnapshot.docs[0].id;

        const originalProjectRef = doc(db, 'users', userId, 'projects', projectId);
        const originalProjectDoc = await getDoc(originalProjectRef);
        const originalProjectData = originalProjectDoc.data();

        const isEditor = originalProjectData.projectEditors.includes(sharedUserId);
        const isViewer = originalProjectData.projectViewers.includes(sharedUserId);

        const sharedProjectRef = doc(db, 'users', sharedUserId, 'projects', projectId);

        await setDoc(sharedProjectRef, {
            ...originalProjectData,
            isShared: true,
        });
        
        let updateData = {};
        if (projectRole === 'owner') {
            updateData = {
                projectOwner: sharedUserId,
                projectEditors: arrayUnion(userId),
                projectViewers: originalProjectData.projectViewers || []
            }
        } else if (projectRole === 'editor') {
            if (isEditor) {
                throw new Error('That user is already an editor of this project');
            } else {
                updateData = {
                    projectOwner: originalProjectData.projectOwner,
                    projectEditors: arrayUnion(sharedUserId),
                    projectViewers: originalProjectData.projectViewers || []
                }
            }
        } else if (projectRole === 'viewer') {
            if (isViewer) {
                throw new Error('That user is already a viewer of this project');
            } else {
                updateData = {
                    projectOwner: originalProjectData.projectOwner,
                    projectEditors: originalProjectData.projectEditors || [],
                    projectViewers: arrayUnion(sharedUserId)
                }
            }
        }

        if(!originalProjectData.projectEditors) {
            updateData.projectEditors = [];
        }

        if(!originalProjectData.projectViewers) {
            updateData.projectViewers = [];
        }
        
        await updateDoc(originalProjectRef, {
            ...updateData,
            isShared: true,
        });

        await setDoc(sharedProjectRef, {
            ...originalProjectData,
            ...updateData,
            isShared: true,
        });

        await updateDoc(doc(db, 'users', sharedUserId), {
            projectids: arrayUnion(projectId)
        });
        
        closeShareProjectModal();
        console.log('Project shared successfully');
    } catch (error) {
        console.error('Error sharing project:', error);
    }
})

async function checkUserProjectRole(projectId) {
    const userId = localStorage.getItem('loggedInUserId');
    const projectRef = doc(db, 'users', userId, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        const isEditor = projectData.projectEditors.includes(userId);
        const isViewer = projectData.projectViewers.includes(userId);
        const isOwner = projectData.projectOwner === userId;

        if (isOwner) {
            return isOwner;
        } else if (isEditor) {
            return isEditor;
        } else if (isViewer) {
            return isViewer;
        }
    }
    return null;
}

async function syncProjectChanges(projectId, changes) {
    try {
        const userId = localStorage.getItem('loggedInUserId');
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        const projectData = projectDoc.data();

        const sharedUsers = [
            projectData.projectOwner,
            ...projectData.projectEditors,
            ...projectData.projectViewers
        ];

        const updatePromises = sharedUsers.map(async (sharedUserId) => {
            if (sharedUserId !== userId) {
                const sharedProjectRef = doc(db, 'users', sharedUserId, 'projects', projectId);
                await updateDoc(sharedProjectRef, changes);
            }
        });

        await Promise.all(updatePromises);
    } catch (error) {
        console.error('Error syncing project changes:', error);
        throw error;
    }
}
