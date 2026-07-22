'use strict';

// ============================================
// TEMĂ PENTRU CURSANT (S-89-M)
// Pagină de sine stătătoare: fiecare cursant care primește aplicația
// își poate nota propriile date de temă, le poate salva (persistă local
// pe dispozitivul lui), le poate vedea într-un calendar și le poate
// printa în formatul fișei oficiale.
// ============================================

let tcEditingId = null;
let tcCalendarViewDate = new Date();

const TC_SALA_LABELS = {
  principala: 'Sala principală',
  secundara1: 'Prima sală secundară',
  secundara2: 'A doua sală secundară',
};

function renderTemaCursantPage() {
  if (!state.temeCursant) state.temeCursant = [];
  resetTemaCursantForm();
  tcCalendarViewDate = new Date();
  renderTemaCursantCalendar();
  renderTcList();
}

function resetTemaCursantForm() {
  tcEditingId = null;
  const nume = document.getElementById('tc-nume');
  const partener = document.getElementById('tc-partener');
  const data = document.getElementById('tc-data');
  const temanr = document.getElementById('tc-temanr');
  const sala = document.getElementById('tc-sala');
  if (nume) nume.value = '';
  if (partener) partener.value = '';
  if (data) data.value = new Date().toISOString().split('T')[0];
  if (temanr) temanr.value = '';
  if (sala) sala.value = 'principala';
  const deleteBtn = document.getElementById('tcDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = 'none';
}

function saveTemaCursant() {
  const nume = document.getElementById('tc-nume')?.value?.trim();
  const partener = document.getElementById('tc-partener')?.value?.trim() || '';
  const data = document.getElementById('tc-data')?.value || new Date().toISOString().split('T')[0];
  const temanr = document.getElementById('tc-temanr')?.value?.trim() || '';
  const sala = document.getElementById('tc-sala')?.value || 'principala';

  if (!nume) {
    showToast('Completează numele.', 'error');
    document.getElementById('tc-nume')?.focus();
    return;
  }

  if (!state.temeCursant) state.temeCursant = [];

  if (tcEditingId) {
    const entry = state.temeCursant.find(t => t.id === tcEditingId);
    if (entry) {
      entry.nume = nume;
      entry.partener = partener;
      entry.data = data;
      entry.temanr = temanr;
      entry.sala = sala;
    }
  } else {
    state.temeCursant.push({
      id: Date.now().toString(),
      nume, partener, data, temanr, sala,
    });
  }

  saveState();
  markStudyDay();
  showToast('Tema a fost salvată! 💾', 'success');
  resetTemaCursantForm();
  renderTemaCursantCalendar();
  renderTcList();
}

function loadTemaCursant(id) {
  const entry = (state.temeCursant || []).find(t => t.id === id);
  if (!entry) return;
  tcEditingId = id;
  document.getElementById('tc-nume').value = entry.nume || '';
  document.getElementById('tc-partener').value = entry.partener || '';
  document.getElementById('tc-data').value = entry.data || '';
  document.getElementById('tc-temanr').value = entry.temanr || '';
  document.getElementById('tc-sala').value = entry.sala || 'principala';
  const deleteBtn = document.getElementById('tcDeleteBtn');
  if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  showToast('Tema a fost încărcată pentru editare.', 'success');
}

function deleteTemaCursant() {
  if (!tcEditingId) return;
  if (!confirm('Ștergi această temă? Datele nu pot fi recuperate.')) return;
  state.temeCursant = (state.temeCursant || []).filter(t => t.id !== tcEditingId);
  saveState();
  resetTemaCursantForm();
  renderTemaCursantCalendar();
  renderTcList();
  showToast('Tema a fost ștearsă.', 'success');
}

function deleteTemaCursantById(id, evt) {
  if (evt) evt.stopPropagation();
  if (!confirm('Ștergi această temă? Datele nu pot fi recuperate.')) return;
  state.temeCursant = (state.temeCursant || []).filter(t => t.id !== id);
  if (tcEditingId === id) resetTemaCursantForm();
  saveState();
  renderTemaCursantCalendar();
  renderTcList();
  showToast('Tema a fost ștearsă.', 'success');
}

function renderTcList() {
  const container = document.getElementById('tcList');
  if (!container) return;
  const list = state.temeCursant || [];

  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Nicio temă salvată încă. Completează formularul de mai sus.</div>';
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.data) - new Date(a.data));
  container.innerHTML = sorted.map(t => `
    <div class="note-card${t.id === tcEditingId ? ' active' : ''}" onclick="loadTemaCursant('${t.id}')">
      <div class="note-card-header">
        <span class="note-card-title">📝 ${escHtml(t.nume)}</span>
        <span class="badge" style="background:#4f8ef722;color:var(--accent);flex-shrink:0">${escHtml(TC_SALA_LABELS[t.sala] || 'Sala principală')}</span>
      </div>
      <p class="note-card-body">${t.partener ? 'Partener: ' + escHtml(t.partener) : 'Fără partener'}${t.temanr ? ' · Tema nr. ' + escHtml(t.temanr) : ''}</p>
      <div class="note-card-footer">
        <span class="note-card-date">${formatDate(t.data)}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-ghost btn-sm" onclick="event.stopPropagation();printTemaCursant('${t.id}')">🖨️ Printează</button>
          <button class="btn-ghost btn-sm" style="color:#25D366" onclick="event.stopPropagation();shareTemaCursantWhatsApp('${t.id}')">📤 WhatsApp</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="deleteTemaCursantById('${t.id}', event)">Șterge</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// CALENDAR
// ============================================
function shiftTemaCursantCalendar(direction) {
  if (direction === 0) {
    tcCalendarViewDate = new Date();
  } else {
    tcCalendarViewDate = new Date(tcCalendarViewDate.getFullYear(), tcCalendarViewDate.getMonth() + direction, 1);
  }
  renderTemaCursantCalendar();
}

function selectTemaCursantDay(isoDate) {
  const dataInput = document.getElementById('tc-data');
  if (dataInput) dataInput.value = isoDate;

  const entriesOnDay = (state.temeCursant || []).filter(t => t.data === isoDate);
  if (entriesOnDay.length === 1) {
    loadTemaCursant(entriesOnDay[0].id);
  } else {
    document.getElementById('tc-nume')?.focus();
  }
}

function renderTemaCursantCalendar() {
  const grid = document.getElementById('tcCalendarGrid');
  const title = document.getElementById('tcCalendarTitle');
  if (!grid) return;

  const year = tcCalendarViewDate.getFullYear();
  const month = tcCalendarViewDate.getMonth();

  const monthNames = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
  if (title) title.textContent = `📅 ${monthNames[month]} ${year}`;

  const entriesByDay = {};
  (state.temeCursant || []).forEach(t => {
    if (!t.data) return;
    entriesByDay[t.data] = (entriesByDay[t.data] || 0) + 1;
  });

  const firstOfMonth = new Date(year, month, 1);
  // Luni = 0 ... Duminică = 6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().split('T')[0];

  let html = `
    <div class="tc-cal-weekdays">
      <span>Lu</span><span>Ma</span><span>Mi</span><span>Jo</span><span>Vi</span><span>Sa</span><span>Du</span>
    </div>
    <div class="tc-cal-days">
  `;

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="tc-cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasEntry = !!entriesByDay[iso];
    const isToday = iso === todayIso;
    html += `
      <div class="tc-cal-day${hasEntry ? ' has-entry' : ''}${isToday ? ' today' : ''}" onclick="selectTemaCursantDay('${iso}')">
        <span>${day}</span>
        ${hasEntry ? '<i class="tc-cal-dot"></i>' : ''}
      </div>
    `;
  }

  html += `</div>`;
  grid.innerHTML = html;
}

// ============================================
// TRIMITE PE WHATSAPP
// ============================================
function shareTemaCursantWhatsApp(id) {
  const entry = (state.temeCursant || []).find(t => t.id === id);
  if (!entry) return;

  const salaLabel = TC_SALA_LABELS[entry.sala] || 'Sala principală';

  let text = `📝 *Temă la întrunirea „Viața creștină și predicarea"*\n\n`;
  text += `👤 Nume: ${entry.nume}\n`;
  if (entry.partener) text += `🤝 Partener: ${entry.partener}\n`;
  text += `📅 Data: ${formatDate(entry.data)}\n`;
  if (entry.temanr) text += `📖 Tema nr.: ${entry.temanr}\n`;
  text += `🏠 Se va ține în: ${salaLabel}`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// ============================================
// PRINTARE FIȘĂ OFICIALĂ (S-89-M)
// ============================================
function printTemaCursant(id) {
  const entry = (state.temeCursant || []).find(t => t.id === id);
  if (!entry) return;

  const win = window.open('', '_blank');
  if (!win) {
    showToast('Permite ferestrele pop-up pentru a printa tema.', 'error');
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="UTF-8">
      <title>Temă pentru cursant</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 40px auto; color: #111; line-height: 1.5; }
        h1 { text-align: center; font-size: 1.15rem; margin-bottom: 2px; }
        h2 { text-align: center; font-size: 1.05rem; margin-top: 0; margin-bottom: 24px; font-weight: 600; }
        .field-row { display: flex; align-items: baseline; margin-bottom: 14px; }
        .field-label { width: 110px; font-weight: 600; flex-shrink: 0; }
        .field-value { flex: 1; border-bottom: 1px solid #111; padding-bottom: 3px; min-height: 1.2em; }
        .rooms { margin: 22px 0; }
        .room-option { margin-bottom: 6px; }
        .room-option .box { display: inline-block; width: 13px; height: 13px; border: 1px solid #111; margin-right: 8px; text-align: center; line-height: 12px; font-size: 11px; vertical-align: -1px; }
        .checked .box { background: #111; color: #fff; }
        .note { font-size: 0.82rem; margin-top: 30px; color: #333; }
        .footer { font-size: 0.75rem; margin-top: 40px; color: #555; }
        @media print { .no-print { display: none; } }
        .no-print { text-align: center; margin-top: 30px; }
        .no-print button { padding: 8px 18px; font-size: 0.9rem; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>TEMĂ LA ÎNTRUNIREA</h1>
      <h2>„VIAȚA CREȘTINĂ ȘI PREDICAREA”</h2>

      <div class="field-row"><div class="field-label">Nume:</div><div class="field-value">${escHtml(entry.nume)}</div></div>
      <div class="field-row"><div class="field-label">Partener:</div><div class="field-value">${escHtml(entry.partener)}</div></div>
      <div class="field-row"><div class="field-label">Data:</div><div class="field-value">${escHtml(formatDate(entry.data))}</div></div>
      <div class="field-row"><div class="field-label">Tema nr.:</div><div class="field-value">${escHtml(entry.temanr)}</div></div>

      <div class="rooms">
        <div>Se va ține în:</div>
        ${Object.entries(TC_SALA_LABELS).map(([key, label]) => `
          <div class="room-option${entry.sala === key ? ' checked' : ''}"><span class="box">${entry.sala === key ? '✓' : ''}</span>${label}</div>
        `).join('')}
      </div>

      <div class="note">
        <strong>Notă pentru cursant:</strong> Materialul și lecția pentru tema repartizată
        sunt indicate în Caietul pentru întrunirea „Viața creștină și predicarea”.
        Când îți pregătești tema, te rugăm să ții cont de Instrucțiunile
        pentru întrunirea „Viața creștină și predicarea” (S-38).
      </div>

      <div class="footer">S-89-M 11/23</div>

      <div class="no-print">
        <button onclick="window.print()">🖨️ Printează</button>
      </div>
    </body>
    </html>
  `);
  win.document.close();
}
