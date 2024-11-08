import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
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

const logout = document.querySelector("#logout");
logout.addEventListener("click", (e) => {
    e.preventDefault();
    auth.signOut().then(() => {
        console.log("User has logged out");
    })
})

const loginForm = document.querySelector("#login-form");
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById("enterEmail").value;
    const password = document.getElementById("enterPassword").value;

    console.log(e);

    //signInWithEmailAndPassword(auth, email, password).then(cred => {
        //console.log(cred.user);
        //window.location.href = "projects.html";
    //})
})

/*
document.addEventListener("DOMContentLoaded", function() {
    var insertBtn = document.querySelector("#login");
    insertBtn.addEventListener("click", function(event) {
        event.preventDefault(); // Prevent default behavior of the button
        loginData().then(() => {
        // Navigate to projects.html after successful login
        window.location.href = "login.html";
        }).catch(error => {
            console.error("Login failed:", error);
        });
    });
});
*/

/*
function loginData() {
    var email = document.querySelector("#enterEmail"); 
    var username = document.querySelector("#enterUsername");
    var password = document.querySelector("#enterPassword");

    return set(ref(db, "People/" + username.value), {
        Username: enterUsername.value,
        Password: enterPassword.value,
        Email: enterEmail.value,
    })
    .then(()=>{
        alert("Data added Successfully!")
    })
    .catch(()=>{
        alert(error)
    } )
}
*/