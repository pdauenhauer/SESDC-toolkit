import { app, storage } from './firebase-init.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, setDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadString, deleteObject } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const auth = getAuth(app);
const db = getFirestore(app);
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

function showForm(formToShow, formToHide) {
    formToHide.classList.remove('visible');
    formToHide.classList.add('hidden');
    formToShow.classList.remove('hidden');
    formToShow.classList.add('visible');
}

function showMessage(message, divId) {
    var messageDiv = document.getElementById(divId);
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.animation = 'fade-out 5s forwards';
}

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (registerForm.classList.contains('visible')) {
            const email = signupForm['enterEmail'].value;
            const password = signupForm['enterPassword'].value;
            const username = signupForm['enterUsername'].value;
            const numprojects = 0;


            createUserWithEmailAndPassword(auth, email, password).then(cred => {
                const user = cred.user;
                const userData = {
                    username: username,
                    email: email,
                    numprojects: numprojects,
                };
                createFolder(user.uid);
                showMessage('Account Created Successfully!', 'account-creation-message');
                const usersRef = doc(db, "users", user.uid);
                setDoc(usersRef, userData).then(() => {
                    showForm(loginForm, registerForm);
                })
                .catch((error) => {
                    console.error("error writing document", error);
                });
            })
            .catch((error) => {
                const errorCode = error.code;
                if (errorCode === 'auth/email-already-in-use') {
                    showMessage('Email already Exists', 'account-creation-message');
                } else {
                    showMessage('Unable to Create User', 'account-creation-message');
                }           
            });
        }
    });
});

const signIn = document.getElementById('login-form');
signIn.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signIn['loginEmail'].value;
    const password = signIn['loginPassword'].value;

    signInWithEmailAndPassword(auth, email, password).then((cred) => {
        showMessage('Login was Successful!', 'account-login-message');
        const user = cred.user;
        localStorage.setItem('loggedInUserId', user.uid);
        console.log("Redirecting to: project-selection.html");
        window.location.href = "project-selection.html";
    })
    .catch((error) => {
        const errorCode = error.code;
        if (errorCode === 'auth/invalid-credential') {
            showMessage('Incorrect Email or Password', 'account-login-message');
        } else {
            showMessage('Account does not Exist', 'account-login-message');
        }
    })
})

//const logout = document.querySelector("#logout");
//logout.addEventListener("click", (e) => {
//    e.preventDefault();
//    auth.signOut().then(() => {
//        console.log("User has logged out");
//    })
//})

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

async function createFolder(folder_path) {
    const folderRef = ref(storage, `${folder_path}/`);
    const fileRef = ref(storage, `${folder_path}/.temp`);
    await uploadString(fileRef, '');
    console.log(`Folder created: ${folder_path}`);
}