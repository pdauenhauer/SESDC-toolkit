import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (registerForm.classList.contains('visible')) {
            const email = signupForm['enterEmail'].value;
            const password = signupForm['enterPassword'].value;

            createUserWithEmailAndPassword(auth, email, password).then(cred => {
                showForm(loginForm, registerForm);
            });
        }
    });
});

const logout = document.querySelector("#logout");
logout.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log("User has logged out");
    })
})

document.addEventListener('DOMContentLoaded', () => {
    const toggleLinks = document.querySelectorAll('.toggle-form');
    
    toggleLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
        
            if (loginForm.classList.contains('visible')) {
                showForm(registerForm, loginForm);
            } else {
                showForm(loginForm, registerForm);
            }
        });
    });
});

function showForm(formToShow, formToHide) {
    formToHide.classList.remove('visible');
    formToHide.classList.add('hidden');
    formToShow.classList.remove('hidden');
    formToShow.classList.add('visible');
}
