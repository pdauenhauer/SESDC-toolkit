import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyDa0W1i5K_3tnh26xUpO9xTEIQDeHgpnrA",
    authDomain: "sesdc-toolkit2.firebaseapp.com",
    projectId: "sesdc-toolkit2",
    storageBucket: "sesdc-toolkit2.firebasestorage.app",
    messagingSenderId: "987889774022",
    appId: "1:987889774022:web:a36f983b38c8d558c4d6c7"    
};

let app;
let storage;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
} else {
    app = getApps()[0];
    storage = getStorage(app);
}

export { app, storage }
