// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyDG7rEfTtegzIBHFvL6W2rV7HNmmMlkNcQ",

  authDomain: "sesdc-micro-design-tool.firebaseapp.com",

  databaseURL: "https://sesdc-micro-design-tool-default-rtdb.firebaseio.com",

  projectId: "sesdc-micro-design-tool",

  storageBucket: "sesdc-micro-design-tool.firebasestorage.app",

  messagingSenderId: "99363626334",

  appId: "1:99363626334:web:6aaa35b53358a235fc43cf",

  measurementId: "G-7DMVG3X5Y6"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
export { auth, app };