// dashboard.js - Fixed version (realtime chart + achievements + improvements)
document.addEventListener("DOMContentLoaded", () => {
  console.log("DreamSync Dashboard Loading...");

  // Check if user is logged in
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  // Initialize everything
  initDashboard();
  setupEventListeners();
  loadAllData();

  console.log("Dashboard initialized successfully");
});

function loadAllData() {
  loadSleepRecords();
  // Show latest record's quality if available
  const currentUser = localStorage.getItem("currentUser");
  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);
  if (storedRecords) {
    try {
      const records = JSON.parse(storedRecords);
      if (records.length > 0) {
        const last = records[records.length - 1];
        if (last.qualityScore !== undefined) updateQualityDisplay(last);
      }
    } catch (err) {
      console.error("Error parsing records for quality display", err);
    }
  }
  updateSleepChart();
  updateSleepDebtDisplay();
  updateNotificationBadge();
  checkAndUnlockAchievements();
}

// ==================== FIXED SLEEP QUALITY SYSTEM ====================

function calculateSleepQuality(sleepRecord) {
  const duration = Number(parseFloat(sleepRecord.duration) || 0);

  // Better scoring system - 11 hours should be good!
  // Use deterministic-ish score with slight randomness for variation
  if (duration >= 7 && duration <= 9) return 85 + Math.random() * 10; // 85-95 (Excellent)
  if (duration >= 6 && duration <= 10) return 75 + Math.random() * 10; // 75-85 (Very Good)
  if (duration >= 5 && duration <= 11) return 65 + Math.random() * 10; // 65-75 (Good)
  if (duration >= 4 && duration <= 12) return 55 + Math.random() * 10; // 55-65 (Fair)
  return 40 + Math.random() * 10; // 40-50 (Poor)
}

function getSleepQualityLabel(score) {
  const s = Number(score);
  if (s >= 85) return { label: "Excellent", emoji: "🌟", color: "#10b981" };
  if (s >= 75) return { label: "Very Good", emoji: "😊", color: "#84cc16" };
  if (s >= 65) return { label: "Good", emoji: "🙂", color: "#f59e0b" };
  if (s >= 50) return { label: "Fair", emoji: "😐", color: "#f97316" };
  return { label: "Poor", emoji: "😢", color: "#ef4444" };
}

function updateQualityDisplay(sleepRecord) {
  const qualityDisplay = document.getElementById('qualityDisplay');
  const qualityScore = document.getElementById('qualityScore');
  const qualityLabel = document.getElementById('qualityLabel');

  if (!qualityDisplay || !qualityScore || !qualityLabel) return;

  const qualityInfo = getSleepQualityLabel(sleepRecord.qualityScore);
  qualityScore.textContent = Math.round(sleepRecord.qualityScore);
  qualityLabel.textContent = qualityInfo.label;
  qualityScore.style.color = qualityInfo.color;
  qualityDisplay.classList.remove('hidden');

  // Update progress bars
  updateProgressBars(sleepRecord);
}

function updateProgressBars(sleepRecord) {
  const duration = Number(parseFloat(sleepRecord.duration) || 0);
  const durationFill = document.getElementById('durationFill');
  const consistencyFill = document.getElementById('consistencyFill');
  const environmentFill = document.getElementById('environmentFill');

  // Duration bar (0-12 hours scale)
  if (durationFill) {
    const durationPercent = Math.min(100, (duration / 12) * 100);
    durationFill.style.width = durationPercent + '%';
    durationFill.style.backgroundColor = duration >= 7 ? '#10b981' : duration >= 6 ? '#f59e0b' : '#ef4444';
  }

  // Consistency bar
  if (consistencyFill) {
    const consistencyScore = calculateConsistencyScore();
    consistencyFill.style.width = consistencyScore + '%';
    consistencyFill.style.backgroundColor = consistencyScore >= 80 ? '#10b981' : consistencyScore >= 60 ? '#f59e0b' : '#ef4444';
  }

  // Environment bar (static placeholder for now)
  if (environmentFill) {
    const environmentScore = 75;
    environmentFill.style.width = environmentScore + '%';
    environmentFill.style.backgroundColor = environmentScore >= 70 ? '#10b981' : '#f59e0b';
  }
}

function calculateConsistencyScore() {
  const currentUser = localStorage.getItem("currentUser");
  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);

  if (!storedRecords) return 70;

  try {
    const records = JSON.parse(storedRecords);
    if (!Array.isArray(records) || records.length < 2) return 70;

    const bedtimes = records
      .map(record => {
        if (!record.sleepTime) return null;
        const parts = record.sleepTime.split(':').map(Number);
        if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
        return parts[0] * 60 + parts[1];
      })
      .filter(v => v !== null);

    if (bedtimes.length < 2) return 70;

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const deviations = bedtimes.map(time => Math.abs(time - avgBedtime));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

    const maxDeviation = 120; // minutes
    const consistency = Math.max(30, 100 - (avgDeviation / maxDeviation * 100));

    return Math.round(consistency);
  } catch (error) {
    console.error("Error calculating consistency:", error);
    return 70;
  }
}

// ==================== FIXED GRAPHS ====================

function updateSleepChart() {
  console.log("Updating sleep chart...");

  let canvas = document.getElementById('sleepChart');
  if (!canvas) {
    console.log("Sleep chart canvas not found, creating one...");
    canvas = createSleepChartCanvas();
    // don't return — continue to build chart now that canvas exists
  }

  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx) {
    console.error("Unable to get canvas context for sleep chart");
    return;
  }

  const currentUser = localStorage.getItem("currentUser");
  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);
  let records = [];

  if (storedRecords) {
    try {
      records = JSON.parse(storedRecords);
      if (!Array.isArray(records)) records = [];
    } catch (error) {
      console.error("Error parsing sleep records:", error);
      records = [];
    }
  }

  // Get last 7 records
  const recentRecords = records.slice(-7);
  const labels = recentRecords.map((record, index) => record.date || `Day ${index + 1}`);
  const data = recentRecords.map(record => Number(parseFloat(record.duration) || 0));

  console.log("Chart data to display:", { labels, data });

  // Destroy existing chart if present
  if (window.sleepChart && typeof window.sleepChart.destroy === 'function') {
    try {
      window.sleepChart.destroy();
    } catch (err) {
      console.warn("Error destroying previous chart:", err);
    }
    window.sleepChart = null;
  }

  // If there are no recent records, show empty chart with placeholder
  const displayLabels = labels.length ? labels : ['No data'];
  const displayData = data.length ? data : [0];

  // Create new chart (requires Chart.js to be loaded globally)
  try {
    window.sleepChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Sleep Duration (hours)',
          data: displayData,
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderColor: '#7c3aed',
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 12,
            ticks: {
              callback: function (value) { return value + 'h'; }
            }
          }
        }
      }
    });
    console.log("Sleep chart updated successfully!");
  } catch (err) {
    console.error("Error creating Chart.js chart. Make sure Chart.js is loaded.", err);
  }
}

function createSleepChartCanvas() {
  // Create canvas element if it doesn't exist
  const chartContainer = document.querySelector('.chart-container');
  if (!chartContainer) {
    console.error("Chart container not found");
    // try to find a fallback place
    const fallback = document.body;
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-container';
    fallback.appendChild(wrapper);
    const canvas = document.createElement('canvas');
    canvas.id = 'sleepChart';
    canvas.height = 250;
    wrapper.appendChild(canvas);
    return canvas;
  }

  // Clear and create canvas
  chartContainer.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'sleepChart';
  canvas.height = 250;
  canvas.style.width = '100%';
  canvas.style.height = '250px';
  chartContainer.appendChild(canvas);
  return canvas;
}

// ==================== SLEEP RECORDS ====================

function loadSleepRecords() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;

  const recordsBody = document.getElementById("recordsBody");
  if (!recordsBody) return;

  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);
  let records = [];

  if (storedRecords) {
    try {
      records = JSON.parse(storedRecords);
      if (!Array.isArray(records)) records = [];
    } catch (error) {
      console.error("Error parsing sleep records:", error);
      records = [];
    }
  }

  // Update weekly average
  updateWeeklyAverage(records);

  recordsBody.innerHTML = "";

  if (records.length === 0) {
    recordsBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No sleep records yet. Start tracking your sleep!</td></tr>';
    return;
  }

  // Display records (most recent first)
  records.slice().reverse().forEach((record, index) => {
    const originalIndex = records.length - 1 - index;
    const qualityInfo = getSleepQualityLabel(record.qualityScore || 0);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${record.date || '-'}</td>
      <td>${record.sleepTime || '-'}</td>
      <td>${record.wakeTime || '-'}</td>
      <td>${record.duration ? record.duration + 'h' : '-'}</td>
      <td><span style="color: ${qualityInfo.color}; font-weight: 600;">${qualityInfo.emoji} ${qualityInfo.label}</span></td>
      <td><span class="delete-btn" data-index="${originalIndex}" style="color: #ef4444; cursor: pointer;">Delete</span></td>
    `;
    recordsBody.appendChild(row);
  });

  // Add delete event listeners
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.getAttribute("data-index"), 10);
      deleteSleepRecord(index);
    });
  });
}

function updateWeeklyAverage(records) {
  const weeklyAvg = document.getElementById("weeklyAvg");
  if (!weeklyAvg) return;

  if (records && records.length > 0) {
    const lastWeekRecords = records.slice(-7);
    const totalDuration = lastWeekRecords.reduce((sum, record) => sum + (parseFloat(record.duration) || 0), 0);
    const avgDuration = (totalDuration / lastWeekRecords.length).toFixed(1);
    weeklyAvg.textContent = `${avgDuration}h avg`;
  } else {
    weeklyAvg.textContent = "No data";
  }
}

function deleteSleepRecord(index) {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;

  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);
  if (!storedRecords) return;

  try {
    let records = JSON.parse(storedRecords);
    if (!Array.isArray(records)) records = [];

    if (index >= 0 && index < records.length) {
      if (confirm("Are you sure you want to delete this sleep record?")) {
        records.splice(index, 1);
        localStorage.setItem(`${currentUser}_sleepRecords`, JSON.stringify(records));
        loadAllData();
        alert("Sleep record deleted successfully!");
      }
    }
  } catch (error) {
    console.error("Error deleting sleep record:", error);
    alert("Error deleting sleep record. Please try again.");
  }
}

// ==================== ACHIEVEMENTS SYSTEM ====================

const achievementSystem = {
  achievements: {
    firstNight: {
      id: 'firstNight',
      name: 'First Night',
      description: 'Track your first sleep session',
      icon: 'fa-bed',
      color: '#7c3aed',
      unlocked: false,
      progress: 0,
      target: 1
    },
    sleepScholar: {
      id: 'sleepScholar',
      name: 'Sleep Scholar',
      description: 'Track sleep for 7 days',
      icon: 'fa-graduation-cap',
      color: '#10b981',
      unlocked: false,
      progress: 0,
      target: 7
    },
    earlyBird: {
      id: 'earlyBird',
      name: 'Early Bird',
      description: 'Wake up before 6 AM for 3 days',
      icon: 'fa-sun',
      color: '#f59e0b',
      unlocked: false,
      progress: 0,
      target: 3
    }
  },

  checkAndUnlock(records) {
    const unlocked = [];

    // protect against invalid input
    if (!Array.isArray(records)) records = [];

    // First Night Achievement
    if (records.length >= 1 && !this.achievements.firstNight.unlocked) {
      this.unlockAchievement('firstNight');
      unlocked.push(this.achievements.firstNight);
    }

    // Sleep Scholar Achievement
    this.achievements.sleepScholar.progress = Math.min(records.length, this.achievements.sleepScholar.target);
    if (records.length >= 7 && !this.achievements.sleepScholar.unlocked) {
      this.unlockAchievement('sleepScholar');
      unlocked.push(this.achievements.sleepScholar);
    }

    // Early Bird Achievement
    const earlyWakeups = records.filter(record => {
      if (!record.wakeTime) return false;
      const hourPart = record.wakeTime.split(':')[0];
      const wakeHour = parseInt(hourPart, 10);
      if (isNaN(wakeHour)) return false;
      return wakeHour < 6;
    }).length;

    this.achievements.earlyBird.progress = earlyWakeups;
    if (earlyWakeups >= 3 && !this.achievements.earlyBird.unlocked) {
      this.unlockAchievement('earlyBird');
      unlocked.push(this.achievements.earlyBird);
    }

    // always save current progress even if nothing new unlocked
    this.saveAchievements();

    // Re-render achievements page if visible
    loadAchievementsPage();

    return unlocked;
  },

  unlockAchievement(achievementId) {
    if (this.achievements[achievementId] && !this.achievements[achievementId].unlocked) {
      this.achievements[achievementId].unlocked = true;
      this.showAchievementNotification(this.achievements[achievementId]);
      this.saveAchievements();
    }
  },

  showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-icon" style="color: ${achievement.color}">
        <i class="fas ${achievement.icon}"></i>
      </div>
      <div class="achievement-content">
        <div class="achievement-title">Achievement Unlocked! 🎉</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-desc">${achievement.description}</div>
      </div>
    `;

    document.body.appendChild(notification);

    // animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // hide after 4s
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) document.body.removeChild(notification);
      }, 500);
    }, 4000);
  },

  renderAchievementsPage() {
    return `
      <div class="achievements-grid">
        ${Object.values(this.achievements).map(achievement => `
          <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon" style="color: ${achievement.unlocked ? achievement.color : '#94a3b8'}">
              <i class="fas ${achievement.icon}"></i>
            </div>
            <div class="achievement-info">
              <h3>${achievement.name}</h3>
              <p>${achievement.description}</p>
              ${!achievement.unlocked ? `
                <div class="achievement-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(Math.min(achievement.progress, achievement.target) / achievement.target) * 100}%"></div>
                  </div>
                  <span class="progress-text">${achievement.progress}/${achievement.target}</span>
                </div>
              ` : `
                <div class="achievement-unlocked">
                  <i class="fas fa-check"></i> Unlocked!
                </div>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  saveAchievements() {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      try {
        localStorage.setItem(`${currentUser}_achievements`, JSON.stringify(this.achievements));
      } catch (err) {
        console.error("Error saving achievements:", err);
      }
    }
  },

  loadAchievements() {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      const saved = localStorage.getItem(`${currentUser}_achievements`);
      if (saved) {
        try {
          const savedAchievements = JSON.parse(saved);
          Object.keys(this.achievements).forEach(key => {
            if (savedAchievements[key]) {
              this.achievements[key].unlocked = !!savedAchievements[key].unlocked;
              this.achievements[key].progress = Number(savedAchievements[key].progress) || 0;
            }
          });
        } catch (err) {
          console.error("Error loading achievements:", err);
        }
      }
    }
  }
};

function checkAndUnlockAchievements() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;
  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);

  if (storedRecords) {
    try {
      const records = JSON.parse(storedRecords);
      achievementSystem.checkAndUnlock(records);
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  } else {
    // still re-render achievements (progress 0)
    achievementSystem.checkAndUnlock([]);
  }
}

// ==================== SLEEP DEBT CALCULATOR ====================

class SleepDebtCalculator {
  constructor() {
    this.idealSleepHours = 7.5;
  }

  calculateSleepDebt(records) {
    if (!Array.isArray(records) || records.length === 0) return 0;

    const lastWeekRecords = records.slice(-7);
    let totalDebt = 0;

    lastWeekRecords.forEach(record => {
      const dailyDebt = (parseFloat(record.duration) || 0) - this.idealSleepHours;
      totalDebt += dailyDebt;
    });

    return Number(totalDebt.toFixed(1));
  }

  getDebtStatus(totalDebt) {
    if (totalDebt >= 3) return { status: "Sleep Surplus", emoji: "🌟", color: "#10b981" };
    if (totalDebt >= -3) return { status: "Balanced", emoji: "⚖️", color: "#f59e0b" };
    if (totalDebt >= -7) return { status: "Mild Debt", emoji: "😕", color: "#f97316" };
    return { status: "High Debt", emoji: "😴", color: "#ef4444" };
  }

  renderDebtDisplay() {
    const currentUser = localStorage.getItem("currentUser");
    const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);

    if (!storedRecords) return;

    let records = [];
    try {
      records = JSON.parse(storedRecords);
      if (!Array.isArray(records) || records.length === 0) return;
    } catch (err) {
      console.error("Error parsing records for debt display:", err);
      return;
    }

    const totalDebt = this.calculateSleepDebt(records);
    const debtStatus = this.getDebtStatus(totalDebt);

    let debtDisplay = document.getElementById('sleepDebtDisplay');
    if (!debtDisplay) {
      debtDisplay = document.createElement('div');
      debtDisplay.id = 'sleepDebtDisplay';
      debtDisplay.className = 'sleep-debt-card';
      const dashboardGrid = document.querySelector('.dashboard-grid');
      if (dashboardGrid) {
        dashboardGrid.parentNode.insertBefore(debtDisplay, dashboardGrid.nextSibling);
      } else {
        document.body.appendChild(debtDisplay);
      }
    }

    const last7 = records.slice(-7);
    const lastWeekAvg = (last7.reduce((sum, r) => sum + (parseFloat(r.duration) || 0), 0) / Math.min(7, last7.length)).toFixed(1);

    debtDisplay.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-calculator"></i> Sleep Debt</h2>
        </div>
        <div class="debt-content">
          <div class="debt-main ${totalDebt >= 0 ? 'positive' : 'negative'}">
            <span class="debt-emoji">${debtStatus.emoji}</span>
            <span class="debt-amount">${totalDebt > 0 ? '+' : ''}${totalDebt.toFixed(1)}h</span>
            <span class="debt-status">${debtStatus.status}</span>
          </div>
          <div class="debt-breakdown">
            <div class="debt-item">
              <span class="debt-label">Ideal Sleep/Night:</span>
              <span class="debt-value">${this.idealSleepHours}h</span>
            </div>
            <div class="debt-item">
              <span class="debt-label">Last Week Avg:</span>
              <span class="debt-value">${isNaN(lastWeekAvg) ? 'N/A' : lastWeekAvg + 'h'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

const sleepDebtCalculator = new SleepDebtCalculator();

function updateSleepDebtDisplay() {
  sleepDebtCalculator.renderDebtDisplay();
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Profile menu
  const profileMenuBtn = document.getElementById("profileMenuBtn");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileMenuBtn && profileDropdown) {
    profileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("show");
    });

    document.addEventListener("click", () => {
      profileDropdown.classList.remove("show");
    });
  }

  // Dark mode
  const toggleDark = document.getElementById("toggleDark");
  if (toggleDark) {
    toggleDark.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem("darkMode", isDark);
      toggleDark.innerHTML = isDark ?
        '<i class="fas fa-sun"></i> Light Mode' :
        '<i class="fas fa-moon"></i> Dark Mode';
    });

    const darkMode = localStorage.getItem("darkMode") === "true";
    if (darkMode) {
      document.body.classList.add("dark");
      toggleDark.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }
  }

  // Sleep plan buttons
  document.getElementById("btnSetPlan")?.addEventListener("click", setSleepPlan);
  document.getElementById("btnClearPlan")?.addEventListener("click", clearSleepPlan);
  document.getElementById("btnTestNotif")?.addEventListener("click", testNotification);

  // Save actual sleep - MAIN FUNCTION
  const btnSaveActual = document.getElementById("btnSaveActual");
  if (btnSaveActual) {
    btnSaveActual.addEventListener("click", saveActualSleep);
  }

  // Other buttons
  document.getElementById("saveProfileBtn")?.addEventListener("click", saveProfile);
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  // Export buttons if present
  document.getElementById("exportCsv")?.addEventListener("click", () => exportData('csv'));
  document.getElementById("exportJson")?.addEventListener("click", () => exportData('json'));

  console.log("Event listeners setup complete");
}

// ==================== MAIN SLEEP SAVE FUNCTION ====================

function saveActualSleep() {
  console.log("Saving actual sleep...");

  const sleepTimeEl = document.getElementById("actualSleep");
  const wakeTimeEl = document.getElementById("actualWake");
  const notesEl = document.getElementById("sleepNotes");

  const sleepTime = sleepTimeEl ? sleepTimeEl.value : '';
  const wakeTime = wakeTimeEl ? wakeTimeEl.value : '';
  const notes = notesEl ? notesEl.value : '';

  if (!sleepTime || !wakeTime) {
    alert("Please enter both sleep and wake times");
    return;
  }

  // Calculate duration
  const sleepParts = sleepTime.split(":").map(Number);
  const wakeParts = wakeTime.split(":").map(Number);

  if (sleepParts.length < 2 || wakeParts.length < 2 || sleepParts.some(isNaN) || wakeParts.some(isNaN)) {
    alert("Invalid time format. Use HH:MM");
    return;
  }

  let sleepDate = new Date();
  sleepDate.setHours(sleepParts[0], sleepParts[1], 0, 0);

  let wakeDate = new Date();
  wakeDate.setHours(wakeParts[0], wakeParts[1], 0, 0);

  // Handle overnight sleep
  if (wakeDate <= sleepDate) {
    wakeDate.setDate(wakeDate.getDate() + 1);
  }

  const durationMs = wakeDate - sleepDate;
  const durationHours = (durationMs / (1000 * 60 * 60));
  const durationRounded = durationHours ? durationHours.toFixed(1) : '0.0';

  const currentUser = localStorage.getItem("currentUser");
  const today = new Date().toLocaleDateString();

  // Create sleep record
  const sleepRecord = {
    date: today,
    sleepTime,
    wakeTime,
    duration: durationRounded,
    notes
  };

  // Calculate sleep quality - FIXED: 11 hours will be GOOD now!
  const qualityScore = calculateSleepQuality(sleepRecord);
  sleepRecord.qualityScore = Math.round(qualityScore);

  console.log("New sleep record:", sleepRecord);

  // Save to localStorage
  let records = [];
  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);
  if (storedRecords) {
    try {
      records = JSON.parse(storedRecords);
      if (!Array.isArray(records)) records = [];
    } catch (error) {
      console.error("Error parsing sleep records:", error);
      records = [];
    }
  }

  records.push(sleepRecord);

  // Keep only last 30 records
  if (records.length > 30) {
    records = records.slice(-30);
  }

  try {
    localStorage.setItem(`${currentUser}_sleepRecords`, JSON.stringify(records));
  } catch (err) {
    console.error("Error saving sleep records:", err);
    alert("Could not save record (Storage error).");
    return;
  }

  // Clear form
  if (sleepTimeEl) sleepTimeEl.value = "";
  if (wakeTimeEl) wakeTimeEl.value = "";
  if (notesEl) notesEl.value = "";

  // UPDATE EVERYTHING IN REAL-TIME
  updateQualityDisplay(sleepRecord);
  loadSleepRecords();
  updateSleepChart(); // This will now work!
  updateSleepDebtDisplay();
  checkAndUnlockAchievements();

  const qualityLabel = getSleepQualityLabel(sleepRecord.qualityScore);
  alert(`Sleep record saved! 🎉\nDuration: ${durationRounded}h\nQuality: ${qualityLabel.label} (${sleepRecord.qualityScore}/100)`);
}

// ==================== OTHER FUNCTIONS ====================

function initDashboard() {
  console.log("Initializing dashboard...");
  achievementSystem.loadAchievements();
}

function setSleepPlan() {
  const bedtime = document.getElementById("plannedSleep")?.value;
  const wakeTime = document.getElementById("plannedWake")?.value;

  if (!bedtime || !wakeTime) {
    alert("Please set both bedtime and wake time");
    return;
  }

  const currentUser = localStorage.getItem("currentUser");
  const sleepPlan = { bedtime, wakeTime };

  localStorage.setItem(`${currentUser}_sleepPlan`, JSON.stringify(sleepPlan));

  const planBadge = document.getElementById("planBadge");
  if (planBadge) {
    planBadge.textContent = "Active";
    planBadge.className = "badge badge-success";
  }
  const planInfo = document.getElementById("planInfo");
  if (planInfo) {
    planInfo.textContent = `Next reminder at ${bedtime}`;
    planInfo.classList.remove("hidden");
  }

  alert(`Sleep plan set! You'll get reminders at ${bedtime}`);
}

function clearSleepPlan() {
  const currentUser = localStorage.getItem("currentUser");
  localStorage.removeItem(`${currentUser}_sleepPlan`);

  const plannedSleep = document.getElementById("plannedSleep");
  const plannedWake = document.getElementById("plannedWake");
  if (plannedSleep) plannedSleep.value = "22:30";
  if (plannedWake) plannedWake.value = "06:30";
  const planBadge = document.getElementById("planBadge");
  if (planBadge) {
    planBadge.textContent = "No plan";
    planBadge.className = "badge badge-info";
  }
  const planInfo = document.getElementById("planInfo");
  if (planInfo) planInfo.classList.add("hidden");

  alert("Sleep plan cleared");
}

function testNotification() {
  if (Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        showTestNotification();
      } else {
        alert("Permission denied for notifications.");
      }
    });
  } else if (Notification.permission === "granted") {
    showTestNotification();
  } else {
    alert("Please enable notifications in your browser settings");
  }
}

function showTestNotification() {
  if (Notification.permission === "granted") {
    new Notification("DreamSync Reminder", {
      body: "This is a test notification. Time to prepare for bed!",
      icon: "/favicon.ico"
    });
  }
}

function saveProfile() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;

  const userData = localStorage.getItem(currentUser);
  if (!userData) return;

  try {
    const user = JSON.parse(userData);

    user.name = document.getElementById("fullName")?.value || user.name;
    user.age = document.getElementById("age")?.value || user.age;
    user.gender = document.getElementById("gender")?.value || user.gender;
    user.address = document.getElementById("address")?.value || user.address;
    user.sleepGoal = document.getElementById("sleepGoal")?.value || user.sleepGoal;
    user.wakeTimeGoal = document.getElementById("wakeTimeGoal")?.value || user.wakeTimeGoal;

    localStorage.setItem(currentUser, JSON.stringify(user));
    hidePage("personal-details");
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Error updating profile. Please try again.");
  }
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// ==================== PAGE NAVIGATION ====================

function showPage(pageId) {
  const page = document.getElementById(`${pageId}-page`);
  if (page) page.classList.add('active');

  if (pageId === 'achievements') {
    loadAchievementsPage();
  }
}

function hidePage(pageId) {
  const page = document.getElementById(`${pageId}-page`);
  if (page) page.classList.remove('active');
}

function loadAchievementsPage() {
  const achievementsContent = document.getElementById('achievementsContent');
  if (achievementsContent) {
    achievementsContent.innerHTML = achievementSystem.renderAchievementsPage();
  }
}

// ==================== NOTIFICATION SYSTEM ====================

function addNotification(title, message, type = "info") {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;

  const notification = {
    id: Date.now(),
    title,
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  };

  let notifications = [];
  const storedNotifications = localStorage.getItem(`${currentUser}_notifications`);
  if (storedNotifications) {
    try {
      notifications = JSON.parse(storedNotifications);
      if (!Array.isArray(notifications)) notifications = [];
    } catch (error) {
      console.error("Error parsing notifications:", error);
      notifications = [];
    }
  }

  notifications.unshift(notification);

  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }

  localStorage.setItem(`${currentUser}_notifications`, JSON.stringify(notifications));
  updateNotificationBadge();
}

function updateNotificationBadge() {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;

  let notifications = [];
  const storedNotifications = localStorage.getItem(`${currentUser}_notifications`);
  if (storedNotifications) {
    try {
      notifications = JSON.parse(storedNotifications);
      if (!Array.isArray(notifications)) notifications = [];
    } catch (error) {
      console.error("Error parsing notifications:", error);
      notifications = [];
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notificationBadge');

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// ==================== EXPORT FUNCTION ====================

function exportData(format) {
  const currentUser = localStorage.getItem("currentUser");
  if (!currentUser) return;

  const storedRecords = localStorage.getItem(`${currentUser}_sleepRecords`);
  let records = [];

  if (storedRecords) {
    try {
      records = JSON.parse(storedRecords);
      if (!Array.isArray(records)) records = [];
    } catch (error) {
      console.error("Error parsing sleep records:", error);
      alert("Error exporting data");
      return;
    }
  }

  if (records.length === 0) {
    alert("No data to export");
    return;
  }

  let dataStr, fileType, fileName;

  if (format === 'csv') {
    const headers = ['Date', 'Sleep Time', 'Wake Time', 'Duration (hours)', 'Quality Score', 'Notes'];
    const csvRows = [headers.join(',')];

    records.forEach(record => {
      const row = [
        record.date || '',
        record.sleepTime || '',
        record.wakeTime || '',
        record.duration || '',
        record.qualityScore || '',
        '"' + (record.notes || '').replace(/"/g, '""') + '"'
      ];
      csvRows.push(row.join(','));
    });

    dataStr = csvRows.join('\n');
    fileType = 'text/csv';
    fileName = 'dreamsync_sleep_data.csv';
  } else {
    dataStr = JSON.stringify(records, null, 2);
    fileType = 'application/json';
    fileName = 'dreamsync_sleep_data.json';
  }

  const blob = new Blob([dataStr], { type: fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert(`Data exported as ${format.toUpperCase()}`);
}

console.log("Dashboard.js loaded successfully");
// ======================================================
// 🗓️ WEEKLY REPORT SYSTEM (Dashboard Feature)
// ======================================================

// --- Helper: Format Date Range ---
function getWeekRange(date) {
  const start = new Date(date);
  start.setDate(start.getDate() - 6);
  const end = new Date(date);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

// --- Generate Dummy Weekly Data ---
// (If you have real data, replace this with actual logs)
function generateDummyWeeklyData() {
  const data = [];
  for (let i = 0; i < 7; i++) {
    const hours = Math.floor(Math.random() * 4) + 5; // 5–8 hrs
    data.push({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      hours
    });
  }
  return data;
}

// --- Create Weekly Report Object ---
function createWeeklyReport() {
  const today = new Date();
  const weekRange = getWeekRange(today);
  const weeklyData = generateDummyWeeklyData();

  const avgHours = (
    weeklyData.reduce((sum, d) => sum + d.hours, 0) / 7
  ).toFixed(1);
  const bestDay = weeklyData.reduce((a, b) => (a.hours > b.hours ? a : b)).day;
  const totalSleep = weeklyData.reduce((sum, d) => sum + d.hours, 0);

  const report = {
    date: today.toLocaleDateString(),
    weekRange,
    avgHours,
    bestDay,
    totalSleep,
    weeklyData
  };

  saveWeeklyReport(report);
  renderWeeklyReport(report);
}

// --- Save Report to localStorage ---
function saveWeeklyReport(report) {
  let reports = JSON.parse(localStorage.getItem("weeklyReports")) || [];
  reports.push(report);
  localStorage.setItem("weeklyReports", JSON.stringify(reports));
  localStorage.setItem("lastReportDate", report.date);
}

// --- Load Last Report (on Page Load) ---
function loadLastWeeklyReport() {
  const reports = JSON.parse(localStorage.getItem("weeklyReports")) || [];
  if (reports.length > 0) {
    renderWeeklyReport(reports[reports.length - 1]);
  } else {
    createWeeklyReport(); // create first one
  }
}

// --- Check if a New Week Started ---
function checkForNewWeek() {
  const lastDate = localStorage.getItem("lastReportDate");
  if (!lastDate) return createWeeklyReport();

  const diffDays = Math.floor(
    (new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24)
  );
  if (diffDays >= 7) createWeeklyReport();
}

// --- Render Weekly Report in HTML ---
function renderWeeklyReport(report) {
  const container = document.getElementById("weeklyReportContent");
  if (!container) return;

  container.innerHTML = `
    <div class="weekly-summary">
      <div class="report-card">
        <h3>Week: ${report.weekRange}</h3>
        <p><strong>Total Sleep:</strong> ${report.totalSleep} hrs</p>
        <p><strong>Average per Night:</strong> ${report.avgHours} hrs</p>
        <p><strong>Best Sleep Day:</strong> ${report.bestDay}</p>
      </div>

      <canvas id="weeklyChart" style="width:100%;max-width:500px;margin-top:20px;"></canvas>

      <h4 style="margin-top:20px;">Weekly Insights</h4>
      <ul class="insights">
        <li>✅ Consistency improving this week.</li>
        <li>💡 Best sleep recorded on <strong>${report.bestDay}</strong>.</li>
        <li>🌙 Keep aiming for 7+ hours for better recovery.</li>
      </ul>

      <button id="viewHistoryBtn" class="view-history-btn">View Report History</button>
      <div id="reportHistory" style="display:none;margin-top:20px;"></div>
    </div>
  `;

  renderWeeklyChart(report.weeklyData);

  // History button toggle
  document.getElementById("viewHistoryBtn").addEventListener("click", () => {
    toggleReportHistory();
  });
}

// --- Render Chart using Chart.js ---
function renderWeeklyChart(weeklyData) {
  const ctx = document.getElementById("weeklyChart").getContext("2d");
  if (window.weeklyChart) window.weeklyChart.destroy();

  window.weeklyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: weeklyData.map(d => d.day),
      datasets: [
        {
          label: "Sleep Hours",
          data: weeklyData.map(d => d.hours),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Hours" }
        }
      }
    }
  });
}

// --- Toggle Report History ---
function toggleReportHistory() {
  const historyDiv = document.getElementById("reportHistory");
  const reports = JSON.parse(localStorage.getItem("weeklyReports")) || [];

  if (historyDiv.style.display === "block") {
    historyDiv.style.display = "none";
    return;
  }

  historyDiv.style.display = "block";
  historyDiv.innerHTML = reports
    .map(
      (r, i) => `
      <div class="history-card">
        <h4>Week ${i + 1}: ${r.weekRange}</h4>
        <p>Average: ${r.avgHours} hrs | Total: ${r.totalSleep} hrs | Best Day: ${r.bestDay}</p>
      </div>
    `
    )
    .join("");
}

// --- Initialize on Load ---
window.addEventListener("DOMContentLoaded", () => {
  checkForNewWeek();
  loadLastWeeklyReport();
});
