import { app, storage } from './firebase-init.js';
import { getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    sendSignInLinkToEmail,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, setDoc, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { ref, uploadString, deleteObject, listAll } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const auth = getAuth(app);
const db = getFirestore(app);
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Function to show and hide forms
function showForm(formToShow, formToHide) {
    formToHide.classList.remove('visible');
    formToHide.classList.add('hidden');
    formToShow.classList.remove('hidden');
    formToShow.classList.add('visible');
}

// Function to display messages with animation
function showMessage(message, divId) {
    var messageDiv = document.getElementById(divId);
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    messageDiv.style.animation = 'fade-out 5s forwards';
}

// Sign up form submission
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

                // Send email verification
                sendEmailVerification(user)
                    .then(() => {
                        showMessage('Account created! Please check your email to verify your account. Then log in!', 'account-creation-message');
                        auth.signOut(); // Sign out the user after sending verification email
                    })
                    .catch((error) => {
                        console.error("Error sending verification email:", error);
                        showMessage('Account created, but failed to send verification email.', 'account-creation-message', true);
                    });

                const usersRef = doc(db, "users", user.uid);
                setDoc(usersRef, userData).then(() => {
                    setTimeout(() => {
                    showForm(loginForm, registerForm);
                    }, 3000);
                })
                .catch((error) => {
                    console.error("error writing document", error);
                });
            })
            .catch((error) => {
                const errorCode = error.code;
                if (errorCode === 'auth/email-already-in-use') {
                    showMessage('Email already Exists', 'account-creation-message', true);
                } else {
                    showMessage('Unable to Create User', 'account-creation-message', true);
                }           
            });
        }
    });
});

// Sign in form submission
const signIn = document.getElementById('login-form');
signIn.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signIn['loginEmail'].value;
    const password = signIn['loginPassword'].value;

    signInWithEmailAndPassword(auth, email, password).then((cred) => {
        const user = cred.user;
        // Check if email is verified
        if (!user.emailVerified) {
            showMessage('Please verify your email before logging in.', 'account-login-message', true);
            auth.signOut();
            return;
        }
        showMessage('Login was Successful!', 'account-login-message');
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
});

// Toggle between login and register forms
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

// Create folder in Firebase Storage
async function createFolder(folder_path) {
    const folderRef = ref(storage, `${folder_path}/`);
    const fileRef = ref(storage, `${folder_path}/.temp`);
    await uploadString(fileRef, '');
    console.log(`Folder created: ${folder_path}`);
}

// Handle forgot password link click
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForm(forgotPasswordForm, loginForm);
        });
    }

    // Back to login from any form
    document.querySelectorAll('.back-to-login').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Find which visible form we're navigating from
            const visibleForm = document.querySelector('.form-container.visible');
            if (visibleForm) {
                showForm(loginForm, visibleForm);
            }
        });
    });

    // Handle password reset form submission
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = resetForm['resetEmail'].value;

            sendPasswordResetEmail(auth, email)
                .then(() => {
                    showMessage('Password reset email sent! Check your inbox.', 'reset-message');
                    setTimeout(() => {
                        showForm(loginForm, forgotPasswordForm);
                    }, 3000);
                })
                .catch((error) => {
                    console.error("Password reset error:", error);
                    showMessage(`Password reset failed: ${error.message}`, 'reset-message', true);
                });
        });
    }
});


