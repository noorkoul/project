// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion
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

// Global variables
let calendar;
let currentUser = null;
let cycleData = {
  lastPeriodDate: null,
  cycleLength: 28,
  periodLength: 5
};

// Initialize period predictor
let periodPredictor = null;

// Water intake counter
let waterCount = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeCalendar();
  initializeAuth();
  initializeEventListeners();
  loadWaterCount();
  
  // Initialize period predictor
  try {
    periodPredictor = new PeriodPredictor();
    console.log('Period predictor initialized successfully');
  } catch (error) {
    console.error('Error initializing period predictor:', error);
  }
});

// Initialize event listeners
function initializeEventListeners() {
  // Logout modal
  const logoutBtn = document.getElementById('openLogoutModal');
  const logoutModal = document.getElementById('logoutModal');
  const closeLogoutBtn = document.getElementById('closeLogoutModal');
  const confirmLogoutBtn = document.getElementById('confirmLogout');
  const cancelLogoutBtn = document.getElementById('cancelLogout');

  if (logoutBtn) logoutBtn.onclick = () => logoutModal.style.display = 'block';
  if (closeLogoutBtn) closeLogoutBtn.onclick = () => logoutModal.style.display = 'none';
  if (cancelLogoutBtn) cancelLogoutBtn.onclick = () => logoutModal.style.display = 'none';
  if (confirmLogoutBtn) {
    confirmLogoutBtn.onclick = async () => {
      try {
        await signOut(auth);
        window.location.href = 'welcomePage.html';
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };
  }

  // Make functions globally available
  window.updateCycleTracking = updateCycleTracking;
  window.saveSymptoms = saveSymptoms;
  window.calculatePCOSRisk = calculatePCOSRisk;
  window.addWaterGlass = addWaterGlass;
  window.resetWaterCount = resetWaterCount;
  window.openSection = openSection;
  window.openArticle = openArticle;
  window.closeArticleModal = closeArticleModal;
  window.generatePrediction = generatePrediction;
}

// Authentication handling
function initializeAuth() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadUserData();
    } else {
      window.location.href = 'welcomePage.html';
    }
  });
}

// Load user data from Firebase
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.cycleData) {
        cycleData = userData.cycleData;
        updateInputFields();
        updateCycleTracking();
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Update input fields with saved data
function updateInputFields() {
  if (cycleData.lastPeriodDate) {
    document.getElementById('lastPeriodDate').value = cycleData.lastPeriodDate;
  }
  document.getElementById('cycleLength').value = cycleData.cycleLength || 28;
  document.getElementById('periodLength').value = cycleData.periodLength || 5;
}

// Initialize calendar
function initializeCalendar() {
  const calendarEl = document.getElementById('calendar');
  
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    events: [],
    dateClick: function(info) {
      handleDateClick(info);
    }
  });
  
  calendar.render();
}

// Handle date clicks for period tracking
function handleDateClick(info) {
  const clickedDate = info.dateStr;
  const today = new Date().toISOString().split('T')[0];
  
  if (clickedDate <= today) {
    const isConfirmed = confirm(`Mark ${clickedDate} as a period day?`);
    if (isConfirmed) {
      markPeriodDay(clickedDate);
    }
  }
}

// Mark a day as period day
async function markPeriodDay(date) {
  if (!currentUser) return;
  
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      [`periodDays.${date}`]: true
    });
    
    // Add event to calendar
    calendar.addEvent({
      title: 'Period',
      start: date,
      display: 'background',
      className: 'fc-event-period'
    });
  } catch (error) {
    console.error('Error marking period day:', error);
  }
}

// Update cycle tracking
async function updateCycleTracking() {
  const lastPeriodInput = document.getElementById('lastPeriodDate');
  const cycleLengthInput = document.getElementById('cycleLength');
  const periodLengthInput = document.getElementById('periodLength');
  
  const lastPeriodDate = lastPeriodInput.value;
  const cycleLength = parseInt(cycleLengthInput.value) || 28;
  const periodLength = parseInt(periodLengthInput.value) || 5;
  
  if (!lastPeriodDate) {
    alert('Please enter your last period start date');
    return;
  }
  
  // Update global cycle data
  cycleData = {
    lastPeriodDate,
    cycleLength,
    periodLength
  };
  
  // Save to Firebase
  if (currentUser) {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        cycleData: cycleData
      });
    } catch (error) {
      console.error('Error saving cycle data:', error);
    }
  }
  
  // Calculate and display cycle events
  calculateCycleEvents(lastPeriodDate, cycleLength, periodLength);
}

// Calculate cycle events
function calculateCycleEvents(startDate, cycleLength, periodLength) {
  // Clear existing events
  calendar.removeAllEvents();
  
  const start = new Date(startDate);
  const events = [];
  
  // Generate events for next 12 months
  for (let i = 0; i < 12; i++) {
    const cycleStart = new Date(start);
    cycleStart.setDate(start.getDate() + (i * cycleLength));
    
    // Period days
    for (let j = 0; j < periodLength; j++) {
      const periodDate = new Date(cycleStart);
      periodDate.setDate(cycleStart.getDate() + j);
      
      events.push({
        title: 'Period',
        start: periodDate.toISOString().split('T')[0],
        display: 'background',
        className: 'fc-event-period'
      });
    }
    
    // Ovulation (typically 14 days before next period)
    const ovulationDate = new Date(cycleStart);
    ovulationDate.setDate(cycleStart.getDate() + cycleLength - 14);
    
    events.push({
      title: 'Ovulation',
      start: ovulationDate.toISOString().split('T')[0],
      display: 'background',
      className: 'fc-event-ovulation'
    });
    
    // Fertile window (5 days before ovulation + ovulation day)
    for (let k = -4; k <= 1; k++) {
      if (k === 0) continue; // Skip ovulation day itself
      const fertileDate = new Date(ovulationDate);
      fertileDate.setDate(ovulationDate.getDate() + k);
      
      events.push({
        title: 'Fertile',
        start: fertileDate.toISOString().split('T')[0],
        display: 'background',
        className: 'fc-event-fertile'
      });
    }
    
    // PMS days (5 days before period)
    for (let l = -5; l < 0; l++) {
      const pmsDate = new Date(cycleStart);
      pmsDate.setDate(cycleStart.getDate() + l);
      
      events.push({
        title: 'PMS',
        start: pmsDate.toISOString().split('T')[0],
        display: 'background',
        className: 'fc-event-pms'
      });
    }
  }
  
  // Add events to calendar
  events.forEach(event => calendar.addEvent(event));
}

// Save symptoms
async function saveSymptoms() {
  if (!currentUser) return;
  
  const symptoms = [];
  const checkboxes = document.querySelectorAll('.symptom-check:checked');
  checkboxes.forEach(checkbox => {
    symptoms.push(checkbox.dataset.symptom);
  });
  
  const flowIntensity = document.getElementById('flowIntensity').value;
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      [`symptoms.${today}`]: {
        symptoms,
        flow: flowIntensity,
        timestamp: new Date()
      }
    });
    
    alert('Symptoms saved successfully!');
    
    // Clear form
    checkboxes.forEach(checkbox => checkbox.checked = false);
    document.getElementById('flowIntensity').value = '';
    
  } catch (error) {
    console.error('Error saving symptoms:', error);
    alert('Error saving symptoms. Please try again.');
  }
}

// Calculate PCOS risk
function calculatePCOSRisk() {
  const questions = ['q1', 'q2', 'q3', 'q4'];
  let score = 0;
  
  questions.forEach(q => {
    const selected = document.querySelector(`input[name="${q}"]:checked`);
    if (selected && selected.value === 'yes') {
      score++;
    }
  });
  
  const resultDiv = document.getElementById('riskResult');
  let riskLevel, message, className;
  
  if (score <= 1) {
    riskLevel = 'Low';
    message = 'Your symptoms suggest a low risk for PCOS. Continue maintaining a healthy lifestyle and regular check-ups.';
    className = 'low';
  } else if (score <= 2) {
    riskLevel = 'Moderate';
    message = 'You have some symptoms that may be associated with PCOS. Consider discussing these with your healthcare provider.';
    className = 'moderate';
  } else {
    riskLevel = 'High';
    message = 'Multiple symptoms suggest you should consult with a healthcare provider for proper evaluation and potential PCOS screening.';
    className = 'high';
  }
  
  resultDiv.innerHTML = `
    <h4>Risk Assessment: ${riskLevel}</h4>
    <p>${message}</p>
  `;
  resultDiv.className = `risk-result ${className}`;
  resultDiv.style.display = 'block';
}

// Water intake functions
function addWaterGlass() {
  waterCount++;
  updateWaterDisplay();
  saveWaterCount();
}

function resetWaterCount() {
  waterCount = 0;
  updateWaterDisplay();
  saveWaterCount();
}

function updateWaterDisplay() {
  document.getElementById('waterCount').textContent = waterCount;
}

function saveWaterCount() {
  localStorage.setItem('waterCount', waterCount.toString());
  localStorage.setItem('waterDate', new Date().toDateString());
}

function loadWaterCount() {
  const savedDate = localStorage.getItem('waterDate');
  const today = new Date().toDateString();
  
  if (savedDate === today) {
    waterCount = parseInt(localStorage.getItem('waterCount')) || 0;
  } else {
    waterCount = 0;
    saveWaterCount();
  }
  updateWaterDisplay();
}

// Section navigation
function openSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll('.feature-card');
  sections.forEach(section => section.classList.add('hidden'));
  
  // Show selected section
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
}

// Article functions
function openArticle(articleType) {
  const articles = {
    hormones: {
      title: "Understanding Your Hormones",
      content: `
        <h2>Understanding Your Hormones</h2>
        <p>Your menstrual cycle is orchestrated by a complex interplay of hormones that regulate everything from your mood to your energy levels.</p>
        
        <h3>Key Hormones in Your Cycle:</h3>
        
        <h4>Estrogen</h4>
        <p>Rises during the follicular phase, peaks just before ovulation. Responsible for:</p>
        <ul>
          <li>Building the uterine lining</li>
          <li>Boosting energy and mood</li>
          <li>Improving skin clarity</li>
          <li>Enhancing cognitive function</li>
        </ul>
        
        <h4>Progesterone</h4>
        <p>Rises after ovulation during the luteal phase. Effects include:</p>
        <ul>
          <li>Maintaining the uterine lining</li>
          <li>Promoting relaxation and sleep</li>
          <li>Can cause mood changes if levels drop suddenly</li>
          <li>Increases body temperature slightly</li>
        </ul>
        
        <h4>FSH (Follicle Stimulating Hormone)</h4>
        <p>Stimulates egg development in your ovaries at the beginning of each cycle.</p>
        
        <h4>LH (Luteinizing Hormone)</h4>
        <p>Triggers ovulation when it surges mid-cycle.</p>
        
        <h3>How Hormones Affect You Daily:</h3>
        <p><strong>Week 1 (Menstrual):</strong> All hormones are low. You may feel introspective and need more rest.</p>
        <p><strong>Week 2 (Follicular):</strong> Estrogen rises. Energy increases, mood improves, skin glows.</p>
        <p><strong>Week 3 (Ovulatory):</strong> Peak estrogen and LH surge. You feel most confident and energetic.</p>
        <p><strong>Week 4 (Luteal):</strong> Progesterone dominates. You may feel more calm but also more sensitive to stress.</p>
      `
    },
    exercise: {
      title: "Exercise and Your Cycle",
      content: `
        <h2>Exercise and Your Cycle</h2>
        <p>Syncing your workouts with your menstrual cycle can help optimize performance and reduce injury risk.</p>
        
        <h3>Menstrual Phase (Days 1-5)</h3>
        <p><strong>How you feel:</strong> Lower energy, possible cramps, fatigue</p>
        <p><strong>Best exercises:</strong></p>
        <ul>
          <li>Gentle yoga or stretching</li>
          <li>Light walking</li>
          <li>Swimming (if comfortable)</li>
          <li>Meditation and breathwork</li>
        </ul>
        
        <h3>Follicular Phase (Days 1-13)</h3>
        <p><strong>How you feel:</strong> Energy gradually increasing</p>
        <p><strong>Best exercises:</strong></p>
        <ul>
          <li>Cardio workouts</li>
          <li>Running or cycling</li>
          <li>Dance fitness</li>
          <li>Strength training with lighter weights</li>
        </ul>
        
        <h3>Ovulatory Phase (Days 12-16)</h3>
        <p><strong>How you feel:</strong> Peak energy and strength</p>
        <p><strong>Best exercises:</strong></p>
        <ul>
          <li>High-intensity interval training (HIIT)</li>
          <li>Heavy strength training</li>
          <li>Competitive sports</li>
          <li>Challenging group fitness classes</li>
        </ul>
        
        <h3>Luteal Phase (Days 17-28)</h3>
        <p><strong>How you feel:</strong> Gradually decreasing energy, possible PMS</p>
        <p><strong>Best exercises:</strong></p>
        <ul>
          <li>Pilates</li>
          <li>Moderate strength training</li>
          <li>Yoga</li>
          <li>Walking or light jogging</li>
        </ul>
      `
    },
    fertility: {
      title: "Understanding Fertility",
      content: `
        <h2>Understanding Fertility</h2>
        <p>Fertility awareness helps you understand your body's natural rhythm and can be used for both conception and natural family planning.</p>
        
        <h3>The Fertile Window</h3>
        <p>You can only get pregnant during a small window each cycle - about 6 days total:</p>
        <ul>
          <li>5 days before ovulation (sperm can survive this long)</li>
          <li>The day of ovulation (egg survives about 24 hours)</li>
        </ul>
        
        <h3>Signs of Ovulation:</h3>
        <h4>Cervical Mucus Changes</h4>
        <ul>
          <li><strong>After period:</strong> Dry or little mucus</li>
          <li><strong>Before ovulation:</strong> Sticky, cloudy mucus</li>
          <li><strong>Around ovulation:</strong> Clear, stretchy mucus (like egg white)</li>
          <li><strong>After ovulation:</strong> Thick, cloudy mucus or dry</li>
        </ul>
      `
    },
    pms: {
      title: "Managing PMS Naturally",
      content: `
        <h2>Managing PMS Naturally</h2>
        <p>Premenstrual syndrome affects up to 75% of women. Natural remedies can significantly reduce symptoms.</p>
        
        <h3>Natural Remedies:</h3>
        <h4>Dietary Changes</h4>
        <ul>
          <li><strong>Reduce salt:</strong> Helps with bloating</li>
          <li><strong>Limit caffeine:</strong> Can worsen anxiety and breast tenderness</li>
          <li><strong>Increase magnesium:</strong> Nuts, seeds, dark chocolate</li>
          <li><strong>Complex carbs:</strong> Help stabilize mood</li>
        </ul>
      `
    },
    myths: {
      title: "Period Myths Debunked",
      content: `
        <h2>Period Myths Debunked</h2>
        <p>Let's separate fact from fiction about menstruation and women's health.</p>
        
        <h3>Common Myths:</h3>
        <p><strong>❌ MYTH:</strong> You can't get pregnant during your period</p>
        <p><strong>✅ REALITY:</strong> While unlikely, it's possible, especially if you have short cycles.</p>
        
        <p><strong>❌ MYTH:</strong> You shouldn't exercise during your period</p>
        <p><strong>✅ REALITY:</strong> Exercise can actually help reduce cramps and improve mood.</p>
      `
    },
    'mental-health': {
      title: "Mental Health & Cycles",
      content: `
        <h2>Mental Health & Your Menstrual Cycle</h2>
        <p>Your menstrual cycle has a profound impact on your mental and emotional well-being.</p>
        
        <h3>How Hormones Affect Your Mind</h3>
        <p><strong>Estrogen:</strong> Boosts serotonin, improves mood and cognitive function</p>
        <p><strong>Progesterone:</strong> Has calming effects but can cause mood swings when levels fluctuate</p>
        
        <h3>Self-Care Throughout Your Cycle</h3>
        <p>Understanding these changes helps you practice better self-care and manage your mental health more effectively.</p>
      `
    }
  };
  
  const article = articles[articleType];
  if (article) {
    document.getElementById('articleContent').innerHTML = article.content;
    document.getElementById('articleModal').style.display = 'block';
  }
}

function closeArticleModal() {
  document.getElementById('articleModal').style.display = 'none';
}

// Generate AI-powered period prediction
async function generatePrediction() {
  if (!periodPredictor) {
    alert('Period predictor not initialized. Please refresh the page.');
    return;
  }

  // Get user cycle data
  const lastPeriodInput = document.getElementById('lastPeriodDate');
  const cycleLengthInput = document.getElementById('cycleLength');
  const periodLengthInput = document.getElementById('periodLength');

  if (!lastPeriodInput.value) {
    alert('Please enter your last period start date first');
    return;
  }

  // Simulate getting additional user data (in a real app, this would come from user profile)
  const userData = {
    lastPeriodDate: lastPeriodInput.value,
    cycleHistory: getCycleHistory(), // Get from stored data
    age: 28, // Could be from user profile
    stressLevel: 0.5, // Could be from recent symptoms
    bmi: 22, // Could be from user profile
    exerciseFrequency: 0.6 // Could be from activity tracking
  };

  try {
    const prediction = periodPredictor.predict(userData);
    
    // Display prediction results
    displayPredictionResults(prediction);
    
    // Save prediction for future reference
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          [`predictions.${new Date().toISOString().split('T')[0]}`]: {
            ...prediction,
            nextPeriodDate: prediction.nextPeriodDate.toISOString(),
            ovulationDate: prediction.ovulationDate.toISOString(),
            fertileWindow: {
              start: prediction.fertileWindow.start.toISOString(),
              end: prediction.fertileWindow.end.toISOString()
            },
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Error saving prediction:', error);
      }
    }
    
  } catch (error) {
    console.error('Error generating prediction:', error);
    alert('Error generating prediction. Please try again.');
  }
}

// Get cycle history from stored data
function getCycleHistory() {
  // In a real implementation, this would fetch from Firebase/local storage
  // For now, return some sample data or extract from calendar events
  const sampleHistory = [28, 30, 27, 29, 28, 26, 31, 28]; // Last 8 cycles
  return sampleHistory;
}

// Display prediction results
function displayPredictionResults(prediction) {
  const resultDiv = document.getElementById('predictionResult');
  const contentDiv = document.getElementById('predictionContent');
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  contentDiv.innerHTML = `
    <div style="display: grid; gap: 15px;">
      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px;">
        <strong>📅 Next Period Prediction:</strong><br>
        <span style="font-size: 1.1em; color: #fff3cd;">${formatDate(prediction.nextPeriodDate)}</span>
      </div>
      
      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px;">
        <strong>🔮 Prediction Details:</strong><br>
        • Expected cycle length: <strong>${prediction.predictedCycleLength} days</strong><br>
        • Confidence level: <strong>${prediction.accuracy}</strong><br>
        • Ovulation expected: <strong>${formatDate(prediction.ovulationDate)}</strong>
      </div>
      
      <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px;">
        <strong>💡 Fertile Window:</strong><br>
        ${formatDate(prediction.fertileWindow.start)} - ${formatDate(prediction.fertileWindow.end)}
      </div>
      
      <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; font-size: 0.9em;">
        <strong>🧠 AI Analysis Factors:</strong><br>
        • Age consideration: ${Math.round(prediction.factors.age)} years<br>
        • Stress level impact: ${Math.round(prediction.factors.stress * 100)}%<br>
        • Exercise frequency: ${Math.round(prediction.factors.exercise * 100)}%<br>
        • Cycle regularity: ${Math.round(prediction.factors.regularity * 100)}%
      </div>
    </div>
  `;
  
  resultDiv.style.display = 'block';
  
  // Smooth scroll to results
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}