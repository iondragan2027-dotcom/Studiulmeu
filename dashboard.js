'use strict';

// ============================================
// GREETING & DATE
// ============================================
function updateGreeting() {
  const now = new Date();
  const hours = now.getHours();
  let greeting;
  if (hours < 12) greeting = 'Bună dimineața! 🌅';
  else if (hours < 18) greeting = 'Bună ziua! 🌿';
  else greeting = 'Bună seara! 🌙';

  document.getElementById('greetingText').textContent = greeting;

  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('greetingDate').textContent =
    now.toLocaleDateString('ro-RO', opts);

  // Set default date fields
  const today = now.toISOString().split('T')[0];
  const dateInputs = ['wt-date', 'wb-date', 'fs-date'];
  dateInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });
}

// ============================================
// DASHBOARD RENDER
// ============================================
function renderDashboard() {
  // Stats
  document.getElementById('stat-articles').textContent = state.wtStudies.length;
  document.getElementById('stat-notes').textContent = state.notes.length;
  document.getElementById('stat-meetings').textContent = state.meetings.length;
  document.getElementById('stat-verses').textContent = state.verses.length;

  // Streak
  updateStreak();
  document.getElementById('streakCount').textContent = `${state.streak} zile studiu`;

  // Next meeting
  updateNextMeeting();

  // Recent notes
  renderRecentNotes();
}

function updateStreak() {
  const today = new Date().toDateString();
  if (state.lastStudyDate === today) return;
  // Just show the current streak from state
  const el = document.getElementById('streakCount');
  if (el) el.textContent = `${state.streak} zile studiu`;
}

function updateNextMeeting() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // Duminică (0)
  let daysUntilSun = (0 - day + 7) % 7;
  let nextSun = new Date(today);
  nextSun.setDate(today.getDate() + daysUntilSun);

  // Joi (4)
  let daysUntilThu = (4 - day + 7) % 7;
  let nextThu = new Date(today);
  nextThu.setDate(today.getDate() + daysUntilThu);

  let nextMeeting, nextName;
  if (nextThu < nextSun) {
    nextMeeting = nextThu;
    nextName = 'Viața și Activitatea Creștină';
  } else {
    nextMeeting = nextSun;
    nextName = 'Studierea Turnului de Veghe';
  }

  const nameEl = document.getElementById('nextMeetingName');
  const dateEl = document.getElementById('nextMeetingDate');
  if (nameEl) nameEl.textContent = nextName;
  if (dateEl) {
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    const diff = Math.round((nextMeeting - today) / (1000 * 60 * 60 * 24));
    let dateStr = nextMeeting.toLocaleDateString('ro-RO', opts);
    if (diff === 0) {
      dateStr += ' (astăzi)';
    } else if (diff === 1) {
      dateStr += ' (mâine)';
    } else {
      dateStr += ` (în ${diff} zile)`;
    }
    dateEl.textContent = dateStr;
  }

  // Progress
  const lastStudy = nextName.includes('Turnul') ? state.wtStudies[state.wtStudies.length - 1] : state.workbooks[state.workbooks.length - 1];
  const prog = lastStudy ? (lastStudy.progress || 0) : 0;
  const progressEl = document.getElementById('nextMeetingProgress');
  const barEl = document.getElementById('nextMeetingProgressBar');
  if (progressEl) progressEl.textContent = `${prog}%`;
  if (barEl) barEl.style.width = `${prog}%`;
}

function renderRecentNotes() {
  const container = document.getElementById('recentNotesList');
  if (!container) return;

  const recent = [...state.notes].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4);

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Nicio notiță încă. Începe studiul!</div>';
    return;
  }

  const colors = { watchtower: '#4f8ef7', workbook: '#10c9a0', bible: '#a855f7', general: '#f97b4f', fieldservice: '#ec4899' };

  container.innerHTML = recent.map(note => `
    <div class="recent-item" onclick="openNoteCard('${note.id}')">
      <div class="recent-item-dot" style="background:${colors[note.category] || '#4f8ef7'}"></div>
      <span class="recent-item-title">${escHtml(note.title)}</span>
      <span class="recent-item-date">${formatDate(note.date)}</span>
    </div>
  `).join('');
}

// ============================================
// ============================================
// BIBLE BUTTON
// ============================================
function readVerseInBible() {
  navigateTo('biblereader');
}

// ============================================
// ============================================
// STREAK
// ============================================
function markStudyDay() {
  const today = new Date().toDateString();
  if (state.lastStudyDate !== today) {
    state.streak = (state.lastStudyDate === new Date(Date.now() - 86400000).toDateString())
      ? state.streak + 1 : 1;
    state.lastStudyDate = today;
  }
}

// ============================================
