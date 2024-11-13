import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
//import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, getDoc, doc, increment, setDoc, arrayUnion, collection, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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
//const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function() {
    renderProjects();
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
    

    const newProject = {
        name,
        description,
        created: new Date().toISOString().split('T')[0],
        id: projectId, 
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
        <div class="project-card">
            <div class="project-header">
                <h3>${project.name}</h3>
                <i id="delete-project" class='bx bxs-trash' style='color:#ff0303'></i>
            </div>
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