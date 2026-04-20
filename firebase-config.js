import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ⚠️ REMPLACE CES VALEURS PAR LES TIENNES DE FIREBASE
const firebaseConfig = {
    apiKey: "TON_API_KEY",
    authDomain: "bde-polytech-marseille.firebaseapp.com",
    projectId: "bde-polytech-marseille",
    storageBucket: "bde-polytech-marseille.appspot.com",
    messagingSenderId: "TON_MESSAGE_SENDER_ID",
    appId: "TON_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);