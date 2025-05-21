
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmEf6RYOFKTw9_VBKmrSr_Zqfca8tq4z0",
  authDomain: "aquatrack-d2b66.firebaseapp.com",
  projectId: "aquatrack-d2b66",
  storageBucket: "aquatrack-d2b66.firebasestorage.app",
  messagingSenderId: "591475688551",
  appId: "1:591475688551:web:b38028e0ac3fc4c12140c2",
  measurementId: "G-79XN9Z0M90"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);

export { app, db };
