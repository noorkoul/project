// =====================
// Calendar Initialization
// =====================
document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    events: [
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
        end: '2025-06-26', // exclusive
        display: 'background',
        color: '#ffe4ec'
      }
    ]
  });

  calendar.render();
});

// =====================
// Navigation Functions
// =====================
function goToCyclePage() {
  window.location.href = 'dashboard.html';
}

function goToPCODPage() {
  window.location.href = 'dashboard.html'; 
}

// =====================
// Logout Modal Handling
// =====================
document.addEventListener('DOMContentLoaded', function () {
  const modal = document.getElementById('logoutModal');
  const openBtn = document.getElementById('openLogoutModal');
  const closeBtn = document.getElementById('closeLogoutModal');
  const cancelBtn = document.getElementById('cancelLogout');
  const confirmBtn = document.getElementById('confirmLogout');

  if (openBtn && closeBtn && cancelBtn && confirmBtn && modal) {
    openBtn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    cancelBtn.onclick = () => modal.style.display = 'none';
    confirmBtn.onclick = () => {
      modal.style.display = 'none';
      window.location.href = 'welcomePage.html'; // or Firebase logout logic
    };
  }
});
