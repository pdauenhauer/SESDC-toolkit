import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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

onAuthStateChanged(auth, (user) => {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    if (loggedInUserId) {
        const docRef = doc(db, "users", loggedInUserId);
        getDoc(docRef).then((docSnap) => {
            if(docSnap.exists()) {
                const userData = docSnap.data;
                document.getElementById('logged-in-username').innerText = userData.username;
            } else {
                console.log("No document found matching id");
            }
        })
        .catch ((error) => {
            console.log("Error getting document");
        })
    } else {
        console.log("UserId not found in local storage");
    }
})