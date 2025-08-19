import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Your Firebase config
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

// ===== Logout Modal Handling =====
const logoutBtn = document.getElementById("openLogoutModal");
const logoutModal = document.getElementById("logoutModal");
const closeLogoutModal = document.getElementById("closeLogoutModal");
const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");

logoutBtn.onclick = () => {
  logoutModal.style.display = "block";
};
closeLogoutModal.onclick = () => {
  logoutModal.style.display = "none";
};
cancelLogout.onclick = () => {
  logoutModal.style.display = "none";
};
confirmLogout.onclick = async () => {
  await signOut(auth);
  window.location.href = "welcomePage.html"; // or your welcome/landing page
};

// ===== Give Your Info Modal Handling =====
document.getElementById("give-info-btn").addEventListener("click", () => {
  document.getElementById("info-modal").style.display = "block";
});

window.closeModal = function (id) {
  document.getElementById(id).style.display = "none";
};

// ===== Submit Info =====
window.submitInfo = async function () {
  const ageGroup = document.getElementById("age-group").value;
  const conditions = [];
  if (document.getElementById("pcos").checked) conditions.push("PCOS");
  if (document.getElementById("pcod").checked) conditions.push("PCOD");
  if (document.getElementById("other").checked) conditions.push("Other");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          profile: {
            ageGroup: ageGroup,
            conditions: conditions
          }
        });
        alert("Your info has been saved!");
        closeModal("info-modal");
      } catch (error) {
        console.error("Error saving info:", error);
        alert("Failed to save your info.");
      }
    } else {
      alert("No user is signed in.");
    }
  });
};

// CALENDER

document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    events: [
      // Placeholder: add logged period days here (manually or from Firebase)
      {
        title: 'Period',
        start: '2025-06-21',
        display: 'background',
        backgroundColor: '#ffe4ec',
        borderColor: '#f08080'
      },
      {
        title: 'Period',
        start: '2025-06-22',
        display: 'background',
        backgroundColor: '#ffe4ec',
        borderColor: '#f08080'
      }
    ]
  });

  calendar.render();
});

// Navigation placeholders
function goToCyclePage() {
  window.location.href = 'dashboard.html';
}

function goToPCODPage() {
  window.location.href = 'dashboard.html';
}
