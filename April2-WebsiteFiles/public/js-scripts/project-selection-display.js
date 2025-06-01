import { app, storage } from './firebase-init.js'
import { onSnapshot, getFirestore, getDoc, deleteDoc, doc, increment, setDoc, arrayUnion, arrayRemove, collection, updateDoc, where, query, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, deleteObject, uploadBytes, uploadString, listAll} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    renderProjects();
    
    document.getElementById('inputsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');
        const userId = localStorage.getItem('loggedInUserId');

        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        const data = projectDoc.data();
        // Wind Inputs
        const numTurbines = document.getElementById('wind-turbine-number').value;
        // Battery Inputs
        const chargeCapacity = document.getElementById('hourly-charge-capacity').value;
        const maxStorage = document.getElementById('maximum-storage').value;
        //Solar inputs
        const arrayWattage = document.getElementById('array-wattage').value;
        const wireLosses = document.getElementById('wire-losses').value;
        const moduleMismatch = document.getElementById('module-mismatch-losses').value;
        const moduleAging = document.getElementById('module-aging-losses').value;
        const dustDirt = document.getElementById('dust-dirt-losses').value;
        const converterLosses = document.getElementById('converter-losses').value;
        //const latitude = data.locationInputs.latitude;
        //const longitude = data.locationInputs.longitude;

        const mode = document.getElementById("mode-select").value;
    
        if (mode == "manual") {
            console.log("manual mode");
        } else if (mode == "csv"){
            try {            
                //http://127.0.0.1:5001/sesdc-function-test/us-central1/fetch_solar_data_function
                const response = await fetch('https://us-central1-sesdc-function-test.cloudfunctions.net/run_simulation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        //'Accept': 'application/json'
                    },
                    body: JSON.stringify ({
                        //latitude: latitude,
                        //longitude: longitude,
                        userId: userId,
                        projectId: projectId,
                        numTurbines: Number(numTurbines),
                        chargeCapacity: Number(chargeCapacity),
                        maxStorage: Number(maxStorage),
                        arrayWattage: Number(arrayWattage), 
                        wireLosses: Number(wireLosses),
                        moduleMismatch: Number(moduleMismatch),
                        moduleAging: Number(moduleAging),
                        dustDirt: Number(dustDirt),
                        converterLosses: Number(converterLosses)
                    })
                });

                const result = await response.text();
                alert(result);
    
                closeInputsModal();
            } catch (error) {
                console.error('Error saving inputs:', error);
            }
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

/*
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
*/

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

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        document.getElementById('file-label').textContent = files[0].name;
    }
})

dropArea.addEventListener('click', () => {
    fileInput.click();
});
*/

document.querySelectorAll('.input-buttons button').forEach(button => {
    button.addEventListener('click', function() {
        const inputsId = this.id.replace('Btn', '');
        const inputs = document.getElementById(inputsId);
        
        document.querySelectorAll('.form-group').forEach(section => {
            section.style.display = 'none';
        });

        inputs.style.display = 'block';

        document.querySelectorAll('.input-buttons button').forEach(btn => {
            btn.style.backgroundColor = '';
        })

        this.style.backgroundColor = '#00b600';
    });
});

/*
document.getElementById('save-battery-inputs').addEventListener('click', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

    const batteryInputs = {
        usingBattery: document.getElementById('using-battery').checked,
        batteryEfficiency: document.getElementById('efficiency-select').value,
        batteryType: document.getElementById('battery-type-select').value,
        maxDepthOfDischarge: document.getElementById('maximum-depth-of-discharge').value,
        batteryLifespan: document.getElementById('battery-lifespan').value,
        CAPEX: document.getElementById('capitol-cost-battery').value,
    };

    try {
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        await updateDoc(projectRef, {
            batteryInputs: batteryInputs
        });

        alert('Battery inputs saved successfully!');
    } catch (error) {
        console.error('Error saving battery inputs:', error);
    }
});

document.getElementById('save-generator-inputs').addEventListener('click', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

    const generatorInputs = {
        usingGenerator: document.getElementById('using-generator').checked,
        generatorType: document.getElementById('generator-type').value,
        generatorEfficiency: document.getElementById('generator-efficiency').value,
        generatorCapacity: document.getElementById('generator-capacity').value,
        CAPEX: document.getElementById('capital-cost-generator').value,
        fuelCost: document.getElementById('fuel-cost').value,
        maintenanceCost: document.getElementById('maintenance-cost-generator').value,
        generatorLifespan: document.getElementById('generator-lifetime').value,
    };

    try {
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        await updateDoc(projectRef, {
            generatorInputs: generatorInputs
        });

        alert('Generator inputs saved successfully!');
    } catch (error) {
        console.error('Error saving generator inputs:', error);
    }
});

document.getElementById('save-solar-panel-inputs').addEventListener('click', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

    const solarPanelInputs = {
        usingSolarPanel: document.getElementById('using-solar-panel').checked,
        solarPanelEfficiency: document.getElementById('solar-panel-efficiency').value,
        solarArraySize: document.getElementById('solar-array-size').value,
        otherLosses: document.getElementById('other-losses').value,
        CAPEX: document.getElementById('capital-cost-solar-panel').value,
        solarPanelLifespan: document.getElementById('solar-panel-lifespan').value,
    };

    try {
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        await updateDoc(projectRef, {
            solarPanelInputs: solarPanelInputs
        });

        alert('Solar panel inputs saved successfully!');
    } catch (error) {
        console.error('Error saving solar panel inputs:', error);
    }
});

document.getElementById('save-wind-turbine-inputs').addEventListener('click', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

    const windTurbineInputs = {
        usingWindTurbine: document.getElementById('using-wind-turbine').checked,
        windTurbineCapacity: document.getElementById('wind-turbine-capacity').value,
        windTurbineLossFactor: document.getElementById('wind-turbine-loss-factor').value,
        cutInSpeed: document.getElementById('cut-in-speed').value,
        cutOutSpeed: document.getElementById('cut-out-speed').value,
        CAPEX: document.getElementById('capitol-cost-wind-turbine').value,
        windTurbineLifespan: document.getElementById('wind-turbine-lifespan').value,
        maintenanceCost: document.getElementById('maintenance-cost-turbine').value,
    };

    try {
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        await updateDoc(projectRef, {
            windTurbineInputs: windTurbineInputs
        });

        alert('Wind turbine inputs saved successfully!');
    } catch (error) {
        console.error('Error saving wind turbine inputs:', error);
    }
});
*/
document.getElementById('save-location-inputs').addEventListener('click', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('loggedInUserId');
    const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

    const locationInputs = {
        latitude: parseFloat(document.getElementById('location-latitude').value),
        longitude: parseFloat(document.getElementById('location-longitude').value),
    };

    try {
        const projectRef = doc(db, 'users', userId, 'projects', projectId);
        await updateDoc(projectRef, {
            locationInputs: locationInputs
        });

        alert('Location inputs saved successfully!');
    } catch (error) {
        console.error('Error saving location inputs:', error);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const redirectButton = document.querySelector('.redirect-btn');

    redirectButton.addEventListener('click', function() {
        const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');
        window.location.href = 'project-outputs.html?projectId=' + encodeURIComponent(projectId);
    });
	
});

document.addEventListener('DOMContentLoaded', function() {
    const addCsvBtn = document.getElementById("addCsvBtn");

    addCsvBtn.addEventListener("click", function(e) {
    	e.preventDefault();
    	// Get the CSV container
    	const csvContainer = document.getElementById("addCsv");
    	// If the container is hidden, show it
    	if (csvContainer.style.display === "none" || csvContainer.style.display === "") {
      	    csvContainer.style.display = "block";
    	}
    	// Trigger the file input's click to open the file selection dialog
    	const fileInput = document.getElementById("fileInput");
    	fileInput.click();
    });
	
});

document.addEventListener('DOMContentLoaded', () => {
    const saveCsvButton = document.getElementById('save-csv');
    if (!saveCsvButton) {
        console.error("Save CSV button not found.");
        return;
    }

    saveCsvButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem('loggedInUserId');
        const projectId = document.getElementById('inputsModal').getAttribute('data-project-id');

        const fileInput = document.getElementById('fileInput');
        if (!fileInput) {
            console.error("File input element not found.");
            return;
        }

        const file = fileInput.files[0];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension !== 'csv') {
            alert('Please upload a valid CSV file.');
            return;
        }

        try {
            const fileRef = ref(storage, `${userId}/${projectId}/simulation-csv`);
            await uploadBytes(fileRef, file);

            //const projectRef = doc(db, 'users', userId, 'projects', projectId);
            //await updateDoc(projectRef, {
            //    uploadedCsv: true
            //});

            alert('File uploaded successfully!');
        } catch (error) {
            console.error('Error saving CSV', error);
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const modeSelect = document.getElementById("mode-select");

    const csvButton = document.getElementById("addCsvBtn");
    const locationButton = document.getElementById("locationInputsBtn");
    const batteryButton = document.getElementById("batteryInputsBtn");
    const generatorButton = document.getElementById("generatorInputsBtn");
    const solarButton = document.getElementById("solarPanelInputsBtn");
    const windButton = document.getElementById("windTurbineInputsBtn");

    const sections = {
        location: document.getElementById("locationInputs"),
        battery: document.getElementById("batteryInputs"),
        generator: document.getElementById("generatorInputs"),
        solar: document.getElementById("solarPanelInputs"),
        wind: document.getElementById("windTurbineInputs"),
        csv: document.getElementById("addCsv")
    };


    function updateButtonsForMode(mode) {
        if (mode === "manual") {
            locationButton.style.display = "inline-block";
            windButton.style.display = "inline-block";
            solarButton.style.display = "inline-block";
            generatorButton.style.display = "inline-block";
            batteryButton.style.display = "inline-block";
            csvButton.style.display = "none";
        } else if (mode === "csv") {
            locationButton.style.display = "none";
            windButton.style.display = "inline-block";
            solarButton.style.display = "inline-block";
            generatorButton.style.display = "inline-block";
            batteryButton.style.display = "inline-block";
            csvButton.style.display = "inline-block";
        }
    }

    function showOnly(sectionId) {
        Object.values(sections).forEach(sec => sec.style.display = "none");
        if (sections[sectionId]) {
            sections[sectionId].style.display = "block";
        }
    }

    //button click handlers
    locationButton.addEventListener("click", () => showOnly("location"));
    batteryButton.addEventListener("click", () => showOnly("battery"));
    generatorButton.addEventListener("click", () => showOnly("generator"));
    solarButton.addEventListener("click", () => showOnly("solar"));
    windButton.addEventListener("click", () => showOnly("wind"));
    csvButton.addEventListener("click", () => showOnly("csv"));

    //initial setup
    updateButtonsForMode(modeSelect.value);

    if (modeSelect.value === "manual") {
        showOnly("location");
    } else {
        showOnly("csv");
    }

    // Update on mode change
    modeSelect.addEventListener("change", () => {
        updateButtonsForMode(modeSelect.value);
        if (modeSelect.value === "manual") {
            showOnly("location");
        } else {
            showOnly("csv");
        }
    });
});
