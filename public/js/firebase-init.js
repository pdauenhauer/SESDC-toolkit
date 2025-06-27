import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

const firebaseConfig = {
    // Need to add your Firebase configuration here
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
