// welcomePage.js

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBo_jmSZd5CvN_Wg4jBi7ljDV2TcRr1TR8",
  authDomain: "shesync-65f98.firebaseapp.com",
  projectId: "shesync-65f98",
  storageBucket: "shesync-65f98.appspot.com",
  messagingSenderId: "678101028946",
  appId: "1:678101028946:web:74ec3f3f918cd12cf80f8b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------ Modal Logic ------------------

function openModal(id) {
  document.getElementById(id).style.display = "block";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

window.openModal = openModal;
window.closeModal = closeModal;

// Close modal when clicking outside
window.onclick = function (event) {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
};

// ------------------ SIGN UP HANDLING ------------------

const signupForm = document.getElementById("signup-form");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store basic user data in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
        symptoms: [],
        profile: {}
      });

      // Redirect to SIGNUP-specific home page
      window.location.href = "signupHome.html";
    } catch (error) {
      console.error("Signup error:", error.message);
      alert("Sign up failed: " + error.message);
    }
  });
}

// ------------------ LOGIN HANDLING ------------------

const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Redirect to LOGIN-specific home page
      window.location.href = "loginHome.html";
    } catch (error) {
      console.error("Login error:", error.message);
      alert("Login failed: " + error.message);
    }
  });
}








