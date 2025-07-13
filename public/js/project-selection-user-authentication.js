import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const auth = getAuth(app);
const db = getFirestore(app);

window.addEventListener('load', (event) => {
    if (localStorage.getItem('loggedInUserId') === null) {
        window.location.href = "login.html";
    }
});

onAuthStateChanged(auth, (user) => {
    const loggedInUserId = localStorage.getItem('loggedInUserId');
    if (loggedInUserId) {
        const usersRef = doc(db, "users", loggedInUserId);
        getDoc(usersRef).then((docSnap) => {
        if(docSnap.exists()) {
            const userData = docSnap.data();
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
});