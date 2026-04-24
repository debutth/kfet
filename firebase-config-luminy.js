// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Your web app's Firebase configuration for KFET Luminy
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "kfet-luminy.firebaseapp.com",
  projectId: "kfet-luminy",
  storageBucket: "kfet-luminy.firebasestorage.app",
  messagingSenderId: "PLACEHOLDER_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID",
  measurementId: "PLACEHOLDER_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Make them global for main.js
window.db = db;
window.auth = auth;

export { db, auth };