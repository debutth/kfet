// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";

import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {

  apiKey: "AIzaSyC-ZsriKsw7DbtrOkgV5ByEcb4FdZiP4CQ",

  authDomain: "kfet-stje.firebaseapp.com",

  projectId: "kfet-stje",

  storageBucket: "kfet-stje.firebasestorage.app",

  messagingSenderId: "812434401817",

  appId: "1:812434401817:web:9321d2ea1e4934a0e91888",

  measurementId: "G-KF6MDWVYKM"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);