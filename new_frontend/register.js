// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDG7rEfTtegzIBHFvL6W2rV7HNmmMlkNcQ",
    authDomain: "sesdc-micro-design-tool.firebaseapp.com",
    projectId: "sesdc-micro-design-tool",
    storageBucket: "sesdc-micro-design-tool.firebasestorage.app",
    messagingSenderId: "99363626334",
    appId: "1:99363626334:web:6aaa35b53358a235fc43cf",
    measurementId: "G-7DMVG3X5Y6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

import {getDatabase, set, get, update, remove, ref, child}
from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js"

const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", function() {
    var insertBtn = document.querySelector("#register");
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

