import { initializeApp, getApps } from 'firebase/app';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// see .env
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID   
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