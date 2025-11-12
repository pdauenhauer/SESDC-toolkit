import { initializeApp, getApps } from 'firebase/app';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// definitely move to a .env, but previous iteration had it in the open,
// so it might be ok for now
const firebaseConfig = {
    apiKey: "AIzaSyDa0W1i5K_3tnh26xUpO9xTEIQDeHgpnrA",
    authDomain: "sesdc-toolkit2.firebaseapp.com",
    projectId: "sesdc-toolkit2",
    storageBucket: "sesdc-toolkit2.firebasestorage.app",
    messagingSenderId: "987889774022",
    appId: "1:987889774022:web:a36f983b38c8d558c4d6c7"    
};

var app;
var storage: FirebaseStorage;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
} else {
    app = getApps()[0];
    storage = getStorage(app);
}

const auth = getAuth(app);
const db = getFirestore(app); 

export { app, storage, auth, db }