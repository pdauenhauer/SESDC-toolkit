import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';

const firebaseConfig = {
    apiKey: "AIzaSyDuSw6zzkG-7X4NOXJakQrlaVHzonkW2S8",
    authDomain: "sesdc-function-test.firebaseapp.com",
    projectId: "sesdc-function-test",
    storageBucket: "sesdc-function-test.firebasestorage.app",
    messagingSenderId: "6731663427",
    appId: "1:6731663427:web:40933de3294dee728aecf6",
    measurementId: "G-TG3CVW2MJ3"
};

let app;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

export { app }