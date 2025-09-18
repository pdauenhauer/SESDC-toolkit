import { app, storage } from './firebase-init.js'
import { onSnapshot, getFirestore, getDoc, deleteDoc, doc, increment, setDoc, arrayUnion, arrayRemove, collection, updateDoc, where, query, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, deleteObject, uploadBytes, uploadString, listAll, getDownloadURL} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    renderProjects();
    
    document.querySelector('.save-submit-btn').addEventListener('click', async (e) => {
        e.preventDefault();

        const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');
        const userId = localStorage.getItem('loggedInUserId');
    
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        const data = projectDoc.data();
         
        const locationInputs = data.locationInputs || {};
        const batteryInputs = data.batteryInputs || {};
        const generatorInputs = data.generatorInputs || {};
        const solarPanelInputs = data.solarPanelInputs || {};
        const windTurbineInputs = data.windTurbineInputs || {};
        const loadInputs = data.loadInputs || [];
        const projectSettings = data.projectSettings || {};

        const submitBtn = document.querySelector('.save-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Running Simulation...';
        submitBtn.disabled = true;

        // /fetch_solar_data_function
        // http://127.0.0.1:5001/sesdc-function-test/us-central1/fetch_solar_data_function
        // https://us-central1-sesdc-function-test.cloudfunctions.net/fetch_solar_data_function
        // https://fetch-solar-data-function-2e75hqar4q-uc.a.run.app
        // https://us-central1-sesdc-function-test.cloudfunctions.net/fetch_solar_data_function
        const simulationResponse = await fetch('https://fetch-solar-data-function-efucnne2ja-uc.a.run.app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                projectId: projectId,

                // Load parameters
                loadInputs: loadInputs,
                // Location parameters
                latitude: projectSettings.latitude,
                longitude: projectSettings.longitude,

                // Financial parameters
                laborCost: projectSettings.laborCost || 0,
                landLeasingCost: projectSettings.landLeasingCost || 0,
                licensingCost: projectSettings.licensingCost || 0,
                otherCapex: projectSettings.otherCapitalCosts || 0,
                inflation: projectSettings.inflation || 3.0,
                energyPrice: projectSettings.energyPrice || 0.15,
                    
                // Battery parameters
                usingBattery: batteryInputs.usingBattery || false,
                chargeCapacity: batteryInputs.chargeCapacity,
                maximumStorage: batteryInputs.maximumStorage,
                batteryType: batteryInputs.batteryType,
                batteryCapex: batteryInputs.capex,
                batteryOpex: batteryInputs.opex,
                batteryLifespan: batteryInputs.lifespan,
                batteryReplacement: batteryInputs.replacement,
                    
                // Generator parameters
                usingGenerator: generatorInputs.usingGenerator,
                generatorCapacity: generatorInputs.capacity,
                generatorCapex: generatorInputs.capex,
                generatorOpex: generatorInputs.opex,
                generatorLifespan: generatorInputs.lifespan,
                generatorReplacement: generatorInputs.replacement,
                    
                // Solar Panel parameters
                usingSolarPanel: solarPanelInputs.usingSolarPanel,
                solarArraySize: solarPanelInputs.solarArraySize,
                wireLosses: solarPanelInputs.wireLosses,
                moduleMismatch: solarPanelInputs.moduleMismatch,
                moduleAging: solarPanelInputs.moduleAging,
                dustDirt: solarPanelInputs.dustDirt,
                converter: solarPanelInputs.converter,
                solarCapex: solarPanelInputs.capex,
                solarOpex: solarPanelInputs.opex,
                solarLifespan: solarPanelInputs.lifespan,
                solarReplacement: solarPanelInputs.replacement,
                    
                // Wind Turbine parameters
                usingWindTurbine: windTurbineInputs.usingWindTurbine,
                namePlateCapacity: windTurbineInputs.namePlateCapacity,
                ratedPower: windTurbineInputs.ratedPower,
                cutInSpeed: windTurbineInputs.cutInSpeed,
                ratedSpeed: windTurbineInputs.ratedSpeed,
                cutOutSpeed: windTurbineInputs.cutOutSpeed,
                windCapex: windTurbineInputs.capex,
                windOpex: windTurbineInputs.opex,
                windLifespan: windTurbineInputs.lifespan,
                windReplacement: windTurbineInputs.replacement
            })
        });
        const result = await simulationResponse.text();
        alert(result);

        const redirectButton = document.querySelector('.redirect-btn');
        redirectButton.style.display = 'block';

        await updateDoc(projectRef, {
            simulationRan: true
        });

        submitBtn.textContent = originalText;
    });
    
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
        simulationRan: false,
    };

    await setDoc(newProjectRef, newProject);

    await updateDoc(usersRef, {
        projectids: arrayUnion(newProject.id.toString()),
        numprojects: increment(1)
    });

    const emptyFileRef = ref(storage, `${userId}/${projectId}/_empty`);
    await uploadBytes(emptyFileRef, new Blob([])); 

    //const folderPath = `${userId}/${projectId}/.temp`; 
    //const folderRef = ref(storage, folderPath);
    //await uploadString(folderRef, '');

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

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            console.log("No projects found for this user.");
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
}

document.getElementById('confirmDelete').addEventListener('click', async function() {
    const modal = document.getElementById('deleteConfirmationModal');
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = modal.getAttribute('data-project-id');
    
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        const currentNumProjects = userDoc.data().numprojects;

        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        const projectData = projectDoc.data();
        const isShared = projectData.isShared;

        if (isShared) {
            const sharedUsers = [
                ...projectData.projectEditors,
                ...projectData.projectViewers
            ];

            for (const sharedUserId of sharedUsers) {
                const sharedProjectRef = doc(db, 'users', sharedUserId, 'projects', projectId);
                await deleteDoc(sharedProjectRef);
            }
        }
        await deleteDoc(projectRef);
            
        await updateDoc(userRef, {
            projectids: arrayRemove(projectId),
            numprojects: currentNumProjects - 1
        });

        const folderPath = `${userId}/${projectId}`; 
        const folderRef = ref(storage, folderPath);

        await deleteFolder(folderRef);

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

async function deleteFolder(folderRef) {
    try {
        const listResult = await listAll(folderRef).catch(() => null);
        if (!listResult) return;
    
        const { items, prefixes } = listResult;
    
        await Promise.all(items.map(async (fileRef) => {
            try {
                await deleteObject(fileRef);
            } catch (error) {
                if (error.code !== 'storage/object-not-found' && error.code !== 404) {
                    console.error(`Failed to delete ${fileRef.fullPath}:`, error.message);
                }
            }
        }));
    
        await Promise.all(prefixes.map(async (folderRef) => {
            await deleteFolder(folderRef);
        }));
    } catch (error) {
        if (error.code !== 'storage/object-not-found' && error.code !== 404) {
            console.error('Error deleting folder:', error);
        }
    }
}

async function openInputsModal(projectId) {
    const modal = document.getElementById('inputsModal');
    modal.setAttribute('data-project-id', projectId);
    modal.classList.add('active');
    
    // Load project settings from Firebase when modal opens
    if (window.projectSettings) {
        window.projectSettings.setProjectId(projectId).catch(console.error);
    }

    try {
        const userId = localStorage.getItem('loggedInUserId');
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);

        if (projectDoc.exists()) {
            const projectData = projectDoc.data();
            const redirectButton = document.querySelector('.redirect-btn');

            if (projectData.simulationRan === true) {
                redirectButton.style.display = 'block';
            } else {
                redirectButton.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error checking simulation status:', error);
        const redirectButton = document.querySelector('.redirect-btn');
        redirectButton.style.display = 'none';
    }
}

function closeInputsModal() {
    const modal = document.getElementById('inputsModal');
    modal.classList.remove('active');
}

function attachSimulationListeners() {
    const simulationButtons = document.querySelectorAll('.simulation');
    simulationButtons.forEach(button => {
        button.addEventListener('click', async function() {
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
    const shareForm = document.getElementById('shareProjectForm');
    const removeForm = document.getElementById('removeUserForm');
    const btn = document.getElementById('btn');

    modal.classList.add('active');
    modal.setAttribute('data-project-id', projectId);

    shareForm.style.display = 'block';
    removeForm.style.display = 'none';
    btn.style.left = '0';
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
            numprojects: increment(1),
            projectids: arrayUnion(projectId)
        });
        
        closeShareProjectModal();
        console.log('Project shared successfully');
    } catch (error) {
        console.error('Error sharing project:', error);
    }
})

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

document.addEventListener('DOMContentLoaded', function() {
    const shareFormBtn = document.getElementById('shareFormBtn');
    const removeUserFormBtn = document.getElementById('removeUserFormBtn');
    const shareForm = document.getElementById('shareProjectForm');
    const removeForm = document.getElementById('removeUserForm');

    if (shareForm && removeForm) {
        removeForm.style.display = 'none';
        shareForm.style.display = 'block';
    }

    if (shareFormBtn) {
        shareFormBtn.addEventListener('click', function() {
            const formWrapper = document.querySelector('.form-wrapper');
            const btn = document.getElementById('btn');
            formWrapper.style.transform = 'translateX(0)';
            btn.style.left = '0';

            shareForm.style.display = 'block';
            removeForm.style.display = 'none';
        });
    }

    if (removeUserFormBtn) {
        removeUserFormBtn.addEventListener('click', function() {
            const formWrapper = document.querySelector('.form-wrapper');
            const btn = document.getElementById('btn');
            btn.style.left = '110px';

            shareForm.style.display = 'none';
            removeForm.style.display = 'block';
        });
    }
});

document.getElementById('removeUserForm').addEventListener('submit', async(e) => {
    e.preventDefault();

    const projectId = document.getElementById('shareProjectModal').getAttribute('data-project-id');
    const userId = localStorage.getItem('loggedInUserId');
    const email = document.getElementById('removeEmail').value;

    try {
        const usersRef = collection(db, 'users');
        const emailQuery = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(emailQuery);

        if (querySnapshot.empty) {
            throw new Error('User with this email is not found');
        }

        const removedUserId = querySnapshot.docs[0].id;

        if (removedUserId === userId) {
            throw new Error('You cannot remove the owner from the project');
        }

        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        const projectData = projectDoc.data();

        const isEditor = projectData.projectEditors.includes(removedUserId);
        const isViewer = projectData.projectViewers.includes(removedUserId);
        
        if (!isEditor && !isViewer) {
            throw new Error('That user is not a part of this project');
        }

        let updateData = {};
        if (isEditor) {
            updateData.projectEditors = arrayRemove(removedUserId);
        } else if (isViewer) {
            updateData.projectViewers = arrayRemove(removedUserId);
        }

        await updateDoc(projectRef, updateData);
        const removedUserProjectRef = doc(db, 'users', removedUserId, 'projects', projectId);
        await deleteDoc(removedUserProjectRef);

        await updateDoc(doc(db, 'users', removedUserId), {
            projectids: arrayRemove(projectId)
        });

        closeShareProjectModal();
        console.log('User removed from project successfully');
    } catch (error) {
        console.error('Error removing user from project:', error);
    }
});

/*
const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('fileInput');
let fileInputTriggered = false;

dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('hover')
})

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('hover');
})

dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('hover');

    if (fileInputTriggered) {
        fileInputTriggered = false;
        return;
    }

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        document.getElementById('file-label').textContent = files[0].name;
    }
})

fileInput.addEventListener('click', (event) => {
    event.stopPropagation();
});

dropArea.addEventListener('click', () => {
    if (!fileInputTriggered) {
        fileInputTriggered = true;
        fileInput.click();
    }
});

fileInput.addEventListener('change', () => {
    fileInputTriggered = false; 
    if (fileInput.files.length > 0) {
        document.getElementById('file-label').textContent = fileInput.files[0].name;
    }
});
*/

document.querySelectorAll('#loadInputButtons button').forEach(button => {
    button.addEventListener('click', function (e) {
        e.preventDefault();
        const inputsId = this.id.replace('Btn', '');
        const inputs = document.getElementById(inputsId);

        document.querySelectorAll('.form-group').forEach(section => {
            // Don't hide form groups that are inside settings content
            const isInSettings = section.closest('#projectSettingsContent');
            if (!isInSettings) {
                section.style.display = 'none';
            }
        });

        if (inputs) {
            inputs.style.display = 'block';
        }

        if (this.id === 'addLoadBtn') {
            document.getElementById('loadInputsContainer').style.display = 'block';
        } else {
            document.getElementById('loadInputsContainer').style.display = 'none';
        }

        document.querySelectorAll('#loadInputButtons button').forEach(btn => {
            btn.style.backgroundColor = '';
        });

        this.style.backgroundColor = '#05B39C';
    });
});

document.querySelectorAll('.input-buttons button').forEach(button => {
    button.addEventListener('click', function() {
        const inputsId = this.id.replace('Btn', '');
        const inputs = document.getElementById(inputsId);
        
        document.querySelectorAll('.form-group').forEach(section => {
        // Don't hide form groups that are inside settings content
            const isInSettings = section.closest('#projectSettingsContent');
            if (!isInSettings) {
                section.style.display = 'none';
            }
        });

        if (inputs) {
            inputs.style.display = 'block';
        } else {
            console.error(`Element with ID "${inputsId}" not found.`);
        }

        document.querySelectorAll('.input-buttons button').forEach(btn => {
            btn.style.backgroundColor = '';
        })

        this.style.backgroundColor = '#05B39C';
    });
});

document.getElementById('save-manual-inputs').addEventListener('click', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

    // Use the global ProjectSettings instance if available
    let projectSettings;
    if (window.projectSettings) {
        projectSettings = window.projectSettings;
        await projectSettings.setProjectId(projectId);
    } else {
        console.warn('ProjectSettings not yet available, using defaults');
        projectSettings = {
            currentSettings: {
                latitude: null,
                longitude: null,
                inflation: 3.0
            }
        };
    }

    // Battery inputs - corrected for dual-input system
    const batteryInputs = {
        usingBattery: document.getElementById('using-battery')?.checked || false,
        chargeCapacity: parseFloat(document.getElementById('charge-capacity')?.value) || null,
        maximumStorage: parseFloat(document.getElementById('maximum-storage')?.value) || null,
        batteryType: document.getElementById('battery-type')?.value || null,
        capex: parseFloat(document.getElementById('battery-capex')?.value) || null,
        // For dual inputs, use dollar amounts (or calculate from percentage)
        opex: parseFloat(document.getElementById('battery-opex-dollar')?.value) || 
              (parseFloat(document.getElementById('battery-opex-percent')?.value) * parseFloat(document.getElementById('battery-capex')?.value) / 100) || null,
        replacement: parseFloat(document.getElementById('battery-replacement-dollar')?.value) || 
                    (parseFloat(document.getElementById('battery-replacement-percent')?.value) * parseFloat(document.getElementById('battery-capex')?.value) / 100) || null,
        lifespan: parseFloat(document.getElementById('battery-lifespan')?.value) || null
    };

    // Generator inputs - corrected for dual-input system
    const generatorInputs = {
        usingGenerator: document.getElementById('using-generator')?.checked || false,
        capacity: parseFloat(document.getElementById('diesel-capacity')?.value) || null,
        capex: parseFloat(document.getElementById('generator-capex')?.value) || null,
        // For dual inputs, use dollar amounts (or calculate from percentage)
        opex: parseFloat(document.getElementById('generator-opex-dollar')?.value) || 
              (parseFloat(document.getElementById('generator-opex-percent')?.value) * parseFloat(document.getElementById('generator-capex')?.value) / 100) || null,
        replacement: parseFloat(document.getElementById('generator-replacement-dollar')?.value) || 
                    (parseFloat(document.getElementById('generator-replacement-percent')?.value) * parseFloat(document.getElementById('generator-capex')?.value) / 100) || null,
        lifespan: parseFloat(document.getElementById('generator-lifespan')?.value) || null
    };

    // Solar panel inputs - corrected for dual-input system
    const solarPanelInputs = {
        usingSolarPanel: document.getElementById('using-solar-panel')?.checked || false,
        solarArraySize: parseFloat(document.getElementById('solar-array-size')?.value) || null,
        wireLosses: parseFloat(document.getElementById('wire-losses')?.value) || 10,
        moduleMismatch: parseFloat(document.getElementById('module-mismatch')?.value) || 10,
        moduleAging: parseFloat(document.getElementById('module-aging')?.value) || 8,
        dustDirt: parseFloat(document.getElementById('dust-dirt')?.value) || 11,
        converter: parseFloat(document.getElementById('converter')?.value) || 5,
        capex: parseFloat(document.getElementById('solar-capex')?.value) || null,
        // For dual inputs, use dollar amounts (or calculate from percentage)
        opex: parseFloat(document.getElementById('solar-opex-dollar')?.value) || 
              (parseFloat(document.getElementById('solar-opex-percent')?.value) * parseFloat(document.getElementById('solar-capex')?.value) / 100) || null,
        replacement: parseFloat(document.getElementById('solar-replacement-dollar')?.value) || 
                    (parseFloat(document.getElementById('solar-replacement-percent')?.value) * parseFloat(document.getElementById('solar-capex')?.value) / 100) || null,
        lifespan: parseFloat(document.getElementById('solar-lifespan')?.value) || null
    };

    // Wind turbine inputs - corrected for dual-input system
    const windTurbineInputs = {
        usingWindTurbine: document.getElementById('using-wind-turbine')?.checked || false,
        namePlateCapacity: parseFloat(document.getElementById('name-plate-capacity')?.value) || null,
        ratedPower: parseFloat(document.getElementById('rated-power')?.value) || null,
        cutInSpeed: parseFloat(document.getElementById('cut-in-speed')?.value) || null,
        ratedSpeed: parseFloat(document.getElementById('rated-speed')?.value) || null,
        cutOutSpeed: parseFloat(document.getElementById('cut-out-speed')?.value) || null,
        capex: parseFloat(document.getElementById('wind-capex')?.value) || null,
        // For dual inputs, use dollar amounts (or calculate from percentage)
        opex: parseFloat(document.getElementById('wind-opex-dollar')?.value) || 
              (parseFloat(document.getElementById('wind-opex-percent')?.value) * parseFloat(document.getElementById('wind-capex')?.value) / 100) || null,
        replacement: parseFloat(document.getElementById('wind-replacement-dollar')?.value) || 
                    (parseFloat(document.getElementById('wind-replacement-percent')?.value) * parseFloat(document.getElementById('wind-capex')?.value) / 100) || null,
        lifespan: parseFloat(document.getElementById('wind-lifespan')?.value) || null
    };

    // Load inputs - collect hourly load data
    const loadInputs = [];
    for (let i = 0; i < 24; i++) {
        const element = document.getElementById(`hour-${i}`);
        if (element && element.value) {
            const loadValue = parseFloat(element.value);
            if (!isNaN(loadValue)) {
                loadInputs.push(loadValue);
            }
        }
    }

    try {
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        await updateDoc(projectRef, {
            batteryInputs,
            generatorInputs,
            solarPanelInputs,
            windTurbineInputs,
            loadInputs,
            projectSettings: projectSettings.currentSettings,
            addedLocationData: true, 
            lastModified: new Date().toISOString()
        });

        alert('All manual inputs have been saved successfully!');

    } catch (error) {
        console.error('Error saving manual inputs:', error);
        alert('Error saving inputs. Please try again.');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const redirectButton = document.querySelector('.redirect-btn');

    redirectButton.addEventListener('click', function() {
        const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');
        window.location.href = 'project-outputs.html?projectId=' + encodeURIComponent(projectId);
    });
});

document.getElementById('loadInputsContainerBtn').addEventListener('click', function () {
    const loadInputsContainer = document.getElementById('loadInputsContainer');
    loadInputsContainer.style.display = 'block';

    const hourlyLoadInputs = document.getElementById('hourlyLoadInputs');
    hourlyLoadInputs.innerHTML = '';

    for (let i = 0; i < 24; i++) {
        const inputGroup = document.createElement('div');
        inputGroup.classList.add('hourly-load-group');

        const label = document.createElement('label');
        label.textContent = `Hour ${i + 1}:`;
        label.setAttribute('for', `hour-${i}`);

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `hour-${i}`;
        input.name = `hour-${i}`;
        input.placeholder = `Load for Hour ${i + 1}`;
        input.required = true;

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        hourlyLoadInputs.appendChild(inputGroup);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const checkboxInputs = document.querySelectorAll('.custom-checkbox-input');
    
    checkboxInputs.forEach(input => {
        input.addEventListener('change', function() {
            const label = this.nextElementSibling;
            
            if (this.checked) {
                // Add a temporary class for extra animation
                label.classList.add('just-checked');
                setTimeout(() => {
                    label.classList.remove('just-checked');
                }, 600);
                
                // Optional: Add haptic feedback on mobile
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }
        });
        
        // Add keyboard navigation enhancement
        input.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.checked = !this.checked;
                this.dispatchEvent(new Event('change'));
            }
        });
    });
});

function safeGetElementValue(elementId, defaultValue = null) {
    const element = document.getElementById(elementId);
    if (element) {
        return element.value;
    }
    console.warn(`Element with ID '${elementId}' not found, using default value: ${defaultValue}`);
    return defaultValue;
}

// Helper function to safely get checkbox state
function safeGetCheckboxState(elementId, defaultValue = false) {
    const element = document.getElementById(elementId);
    if (element) {
        return element.checked;
    }
    console.warn(`Checkbox with ID '${elementId}' not found, using default value: ${defaultValue}`);
    return defaultValue;
}

// Helper function to safely parse numeric values
function safeParseFloat(value, defaultValue = null) {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}