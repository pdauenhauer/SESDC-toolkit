import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
//import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, getDoc, doc, FieldValue, setDoc, arrayUnion, collection } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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

export function openModal() {
    document.getElementById('addProjectModal').classList.add('active');
}


function closeModal() {
    document.getElementById('addProjectModal').classList.remove('active');
}

async function handleAddProject(event) {
    event.preventDefault();

    const userId = localStorage.getItem('loggedInUserId');

    var usersRef = doc(db, 'users', userId);

    await updateDoc(usersRef, {
        numprojects: FieldValue.increment(1)
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

    const projectRef = doc(collection(db, 'users', userId, 'projects'), newProject.id);
    await setDoc(projectRef, newProject);

    await updateDoc(usersRef, {
        projectids: arrayUnion(newProject.id),
    });

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