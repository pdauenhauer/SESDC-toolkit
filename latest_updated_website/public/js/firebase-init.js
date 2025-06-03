import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

console.log("Main JS loaded");

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
let storage;

// Initialize Firebase app if not already initialized
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  storage = getStorage(app);
} else {
  app = getApps()[0];
  storage = getStorage(app);
}

export { app, storage };

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".contact-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // prevent default form submission

    const formData = new FormData(form);

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Form submitted successfully!");

        // Clear the form
        form.reset();
      } else {
        alert("Failed to submit form. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong!");
    }
  });
});

