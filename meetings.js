'use strict';

// ============================================
// MEETINGS
// ============================================
function addMeetingEntry() {
  const name = prompt('Tipul întrunirii (ex: Turnul de Veghe, Viața creștină și predicarea):');
  if (!name) return;
  const date = prompt('Data (YYYY-MM-DD):') || new Date().toISOString().split('T')[0];

  state.meetings.push({
    id: Date.now().toString(),
    name, date,
    progress: 0,
  });
  saveState();
  renderMeetings();
  showToast('Întrunire adăugată! 📅', 'success');
}

function renderMeetings() {
  const container = document.getElementById('meetingsCalendar');
  if (!container) return;

  // Update progress bars
  const lastWt = state.wtStudies[state.wtStudies.length - 1];
  const lastWb = state.workbooks[state.workbooks.length - 1];

  const wpEl = document.getElementById('weekendProgress');
  const wpBar = document.getElementById('weekendProgressBar');
  const prog1 = lastWt?.progress || 0;
  if (wpEl) wpEl.textContent = `${prog1}%`;
  if (wpBar) wpBar.style.width = `${prog1}%`;

  const wdEl = document.getElementById('weekdayProgress');
  const wdBar = document.getElementById('weekdayProgressBar');
  const prog2 = lastWb?.progress || 0;
  if (wdEl) wdEl.textContent = `${prog2}%`;
  if (wdBar) wdBar.style.width = `${prog2}%`;

  if (state.meetings.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Nicio întrunire planificată. Apasă „+ Adaugă Întrunire".</div>';
    return;
  }

  const sorted = [...state.meetings].sort((a,b) => new Date(a.date) - new Date(b.date));
  container.innerHTML = sorted.map(m => `
    <div class="meeting-calendar-item">
      <span class="meeting-cal-date">${formatDate(m.date)}</span>
      <span class="meeting-cal-name">${escHtml(m.name)}</span>
      <span class="meeting-cal-progress">${m.progress}%</span>
      <button class="delete-btn" onclick="deleteMeeting('${m.id}')">🗑</button>
    </div>
  `).join('');
}

function deleteMeeting(id) {
  state.meetings = state.meetings.filter(m => m.id !== id);
  saveState();
  renderMeetings();
}

// ============================================
