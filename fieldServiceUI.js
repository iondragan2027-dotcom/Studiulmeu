'use strict';

// ============================================
// FIELD SERVICE — UI
// Toată generarea de HTML și actualizările de interfață pentru
// modulul de serviciu de teren: lista de notițe, tabelul de
// program, bara vizitei supraveghetorului, tabelele calendar
// suplimentare, setările colaboratorilor și panoul de sugestie.
// Depinde de fieldServiceStorage.js (isDateInCoWeekRange) și de
// fieldServiceUtils.js (FS_DAY_LABELS, buildFieldServiceShareText).
// ============================================

function renderFieldServiceList() {
  const container = document.getElementById('fsNotesList');
  if (!container) return;

  const filtered = state.notes.filter(n => n.category === 'fieldservice');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state full-width">
        <p>Nicio notiță de serviciu de teren salvată încă.</p>
      </div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.map(note => `
    <div class="note-card" onclick="openNoteCard('${note.id}')">
      <div class="note-card-header">
        <span class="note-card-title">${escHtml(note.title)}</span>
        <span class="badge" style="background:#ec489922;color:#ec4899;flex-shrink:0">
          🧑‍🤝‍🧑 Serviciu
        </span>
      </div>
      <p class="note-card-body">${escHtml(note.content || 'Fără conținut')}</p>
      <div class="note-card-footer">
        <span class="note-card-date">${formatDate(note.date)}</span>
        <div style="display:flex;gap:6px">
          <button class="edit-btn-fs" onclick="event.stopPropagation(); openNoteCard('${note.id}')" title="Editează">✏️ Editează</button>
          <button class="delete-btn-fs" onclick="event.stopPropagation(); deleteFieldServiceNote('${note.id}')" title="Șterge">🗑 Șterge</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// PROGRAM ÎNTRUNIRE DE IEȘIRE PE TEREN
// ============================================
function renderFieldServiceSchedule() {
  const container = document.getElementById('fsScheduleGrid');
  if (!container) return;
  if (!state.fieldServiceSchedule) return;
  if (!state.fieldServiceSchedule.coWeek) {
    state.fieldServiceSchedule.coWeek = { enabled: false, from: '', to: '' };
  }

  renderFieldServiceLockBar();
  renderFieldServiceCoWeekBar();

  const coWeek = state.fieldServiceSchedule.coWeek;
  const locked = typeof isFieldServiceLocked === 'function' && isFieldServiceLocked();
  const dayKeys = ['marti', 'vineri', 'sambata'];

  container.innerHTML = dayKeys.map(dayKey => {
    const day = state.fieldServiceSchedule[dayKey];
    const rowsHtml = day.rows.map((row, i) => {
      const coWeekDisabled = coWeek.enabled && isDateInCoWeekRange(row.data);
      const disabled = coWeekDisabled || locked;
      return `
      <div class="fs-sched-row${disabled ? ' fs-sched-row-disabled' : ''}">
        <input class="fs-sched-cell fs-sched-cell-data" type="text" value="${escHtml(row.data)}" ${disabled ? 'disabled' : ''}
          oninput="updateScheduleCell('${dayKey}', ${i}, 'data', this.value)" />
        <input class="fs-sched-cell fs-sched-cell-nume" type="text" value="${escHtml(row.nume)}" ${disabled ? 'disabled' : ''}
          placeholder="${coWeekDisabled ? 'Fără programare (supraveghetor)' : ''}"
          oninput="updateScheduleCell('${dayKey}', ${i}, 'nume', this.value)" />
        <button class="fs-sched-del" onclick="deleteScheduleRow('${dayKey}', ${i})" title="Șterge rândul" ${locked ? 'disabled' : ''}>✕</button>
      </div>
    `;
    }).join('');

    return `
      <div class="fs-sched-table">
        <div class="fs-sched-header">
          <span class="fs-sched-header-label">DATA</span>
          <span class="fs-sched-header-day" style="background:${day.color}">${escHtml(day.label)}</span>
        </div>
        <div class="fs-sched-body">${rowsHtml}</div>
        <button class="fs-sched-add" onclick="addScheduleRow('${dayKey}')" ${locked ? 'disabled' : ''}>+ Adaugă rând</button>
      </div>
    `;
  }).join('');
}

// ============================================
// BLOCARE CU PIN — bara afișată între TITLU și butoanele de acțiune
// ale Programului principal (Sugerează / Exportă / Salvează / WhatsApp).
// ============================================
function renderFieldServiceLockBar() {
  const bar = document.getElementById('fsLockBar');
  if (!bar) return;

  const lock = state.fieldServiceLock;
  const configured = lock && lock.enabled && (lock.people || []).some(p => p.pin && p.pin.trim());

  if (!configured) {
    bar.innerHTML = '';
    return;
  }

  const locked = typeof isFieldServiceLocked === 'function' && isFieldServiceLocked();

  if (locked) {
    bar.innerHTML = `
      <div class="fs-lock-row fs-lock-row-locked">
        <span class="fs-lock-icon">🔒</span>
        <span class="fs-lock-text">Tabel blocat — doar cu PIN poți edita</span>
        <input type="password" id="fsLockPinInput" class="fs-lock-pin-input" placeholder="PIN"
          onkeydown="if(event.key==='Enter') unlockFieldServiceSchedule()" />
        <button type="button" class="btn-outline btn-sm" onclick="unlockFieldServiceSchedule()" style="font-size:0.75rem;padding:5px 10px">Deblochează</button>
      </div>
    `;
  } else {
    bar.innerHTML = `
      <div class="fs-lock-row fs-lock-row-unlocked">
        <span class="fs-lock-icon">🔓</span>
        <span class="fs-lock-text">Deblocat de: ${escHtml(fsUnlockedPerson?.name || '')}</span>
        <button type="button" class="btn-outline btn-sm" onclick="lockFieldServiceSchedule()" style="font-size:0.75rem;padding:5px 10px">🔒 Blochează</button>
      </div>
    `;
  }
}

// ============================================
// SĂPTĂMÂNA CU VIZITA SUPRAVEGHETORULUI DE CIRCUMSCRIPȚIE
// Bifă + interval de date (setat manual), salvată împreună cu programul.
// Când e activă: se afișează un mesaj informativ, rândurile cu dată în
// interval sunt dezactivate (nu se pot completa colaboratori), iar
// "Sugerează programul" sare peste acele date. Restul rămâne neschimbat.
// ============================================
function renderFieldServiceCoWeekBar() {
  const bar = document.getElementById('fsCoWeekBar');
  if (!bar || !state.fieldServiceSchedule) return;
  const coWeek = state.fieldServiceSchedule.coWeek || { enabled: false, from: '', to: '' };

  bar.innerHTML = `
    <label class="fs-coweek-check">
      <input type="checkbox" ${coWeek.enabled ? 'checked' : ''} onchange="toggleFieldServiceCoWeek(this.checked)" />
      <span>Săptămână cu vizita supraveghetorului de circumscripție</span>
    </label>
    <div class="fs-coweek-dates" style="${coWeek.enabled ? '' : 'display:none'}">
      <label>De la: <input type="date" value="${escHtml(coWeek.from || '')}" onchange="updateFieldServiceCoWeekDate('from', this.value)" /></label>
      <label>Până la: <input type="date" value="${escHtml(coWeek.to || '')}" onchange="updateFieldServiceCoWeekDate('to', this.value)" /></label>
    </div>
    ${coWeek.enabled ? `
      <div class="fs-coweek-info">
        ℹ️ Săptămâna aceasta ne vizitează supraveghetorul de circumscripție — nu se programează colaboratori pentru serviciul de teren.
      </div>
    ` : ''}
  `;
}

// ============================================
// TRIMITE PE WHATSAPP
// Construiește (via fieldServiceUtils.buildFieldServiceShareText) un text
// formatat cu toate cele 3 zile (dată + nume) și deschide WhatsApp cu
// mesajul precompletat.
// ============================================
function shareFieldServiceScheduleWhatsApp(tableId) {
  const table = tableId ? (state.fieldServiceExtraTables || []).find(t => t.id === tableId) : state.fieldServiceSchedule;
  if (!table) {
    showToast('Nu există niciun program de trimis.', 'error');
    return;
  }
  const text = buildFieldServiceShareText(table);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

function renderFieldServiceExtraTables() {
  const container = document.getElementById('fsExtraTables');
  if (!container) return;

  const tables = Array.isArray(state.fieldServiceExtraTables) ? state.fieldServiceExtraTables : [];

  if (tables.length === 0) {
    container.innerHTML = `<div class="empty-state full-width"><p>Niciun tabel calendar suplimentar. Apasă „🗓️ Tabel Calendar Nou” ca să adaugi unul.</p></div>`;
    return;
  }

  const dayKeys = ['marti', 'vineri', 'sambata'];

  container.innerHTML = tables.map(table => {
    const gridHtml = dayKeys.map(dayKey => {
      const day = table[dayKey];
      if (!day) return '';
      const rowsHtml = day.rows.map((row, i) => `
        <div class="fs-sched-row">
          <input class="fs-sched-cell fs-sched-cell-data" type="text" value="${escHtml(row.data)}"
            oninput="updateExtraScheduleCell('${table.id}', '${dayKey}', ${i}, 'data', this.value)" />
          <input class="fs-sched-cell fs-sched-cell-nume" type="text" value="${escHtml(row.nume)}"
            oninput="updateExtraScheduleCell('${table.id}', '${dayKey}', ${i}, 'nume', this.value)" />
          <button class="fs-sched-del" onclick="deleteExtraScheduleRow('${table.id}', '${dayKey}', ${i})" title="Șterge rândul">✕</button>
        </div>
      `).join('');

      return `
        <div class="fs-sched-table">
          <div class="fs-sched-header">
            <span class="fs-sched-header-label">DATA</span>
            <span class="fs-sched-header-day" style="background:${day.color}">${escHtml(day.label)}</span>
          </div>
          <div class="fs-sched-body">${rowsHtml}</div>
          <button class="fs-sched-add" onclick="addExtraScheduleRow('${table.id}', '${dayKey}')">+ Adaugă rând</button>
        </div>
      `;
    }).join('');

    return `
      <div class="card fs-extra-table" data-table-id="${table.id}" style="margin-bottom:16px">
        <div class="card-header">
          <input type="text" class="form-input" value="${escHtml(table.title || '')}"
            placeholder="Denumire tabel" style="max-width:220px;font-weight:600"
            oninput="renameFieldServiceExtraTable('${table.id}', this.value)" />
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn-outline btn-sm" onclick="saveFieldServiceScheduleManual()" style="font-size:0.75rem;padding:5px 10px">💾 Salvează</button>
            <button type="button" class="btn-outline btn-sm" onclick="shareFieldServiceScheduleWhatsApp('${table.id}')" style="font-size:0.75rem;padding:5px 10px">📲 Trimite pe WhatsApp</button>
            <button type="button" class="btn-outline btn-sm" onclick="deleteFieldServiceExtraTable('${table.id}')" style="font-size:0.75rem;padding:5px 10px;color:#e53e3e">🗑 Șterge tabel</button>
          </div>
        </div>
        <div class="fs-sched-grid">${gridHtml}</div>
      </div>
    `;
  }).join('');
}

// ============================================
// BLOCARE CU PIN (Setări) — configurare nume + PIN pentru cele
// două persoane care pot edita Programul principal.
// ============================================
function renderFieldServiceLockSettings() {
  const container = document.getElementById('fsLockSettings');
  if (!container) return;

  if (!state.fieldServiceLock) {
    state.fieldServiceLock = { enabled: false, people: [{ name: '', pin: '' }, { name: '', pin: '' }] };
  }
  const lock = state.fieldServiceLock;

  container.innerHTML = `
    <label class="fs-coweek-check" style="margin-bottom:10px">
      <input type="checkbox" ${lock.enabled ? 'checked' : ''} onchange="toggleFieldServiceLockEnabled(this.checked)" />
      <span>Activează blocarea cu PIN</span>
    </label>
    ${[0, 1].map(i => {
      const p = lock.people[i] || { name: '', pin: '' };
      return `
        <div class="fs-lock-settings-row">
          <input type="text" class="form-input" placeholder="${i === 0 ? 'Numele meu' : 'Al doilea nume'}"
            value="${escHtml(p.name || '')}" oninput="updateFieldServiceLockName(${i}, this.value)" />
          <input type="text" class="form-input" placeholder="PIN (cifre și simboluri: @ ! #)"
            value="${escHtml(p.pin || '')}" oninput="updateFieldServiceLockPin(${i}, this.value)" />
        </div>
      `;
    }).join('')}
    <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:6px;line-height:1.4;">
      Cât timp e activă blocarea, tabelul principal de program (Marți/Vineri/Sâmbătă) rămâne blocat
      până cineva introduce unul din cele două PIN-uri. Se re-blochează automat când pleci de pe pagină.
    </p>
  `;
}

// ============================================
// COLABORATORI (Setări) — folosiți de "Sugerează programul"
// ============================================
function renderCollaboratorsSettings() {
  const container = document.getElementById('fsCollaboratorsSettings');
  if (!container) return;

  const list = Array.isArray(state.fieldServiceCollaborators) ? state.fieldServiceCollaborators : [];

  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state-small">Niciun colaborator adăugat încă.</p>`;
    return;
  }

  container.innerHTML = list.map(c => `
    <div class="fs-collab-row">
      <div class="fs-collab-main">
        <input type="text" class="form-input fs-collab-name" placeholder="Nume colaborator"
          value="${escHtml(c.name || '')}" oninput="updateCollaboratorName('${c.id}', this.value)" />
        <div class="fs-collab-days">
          ${Object.keys(FS_DAY_LABELS).map(dayKey => `
            <label class="fs-collab-day">
              <input type="checkbox" ${Array.isArray(c.days) && c.days.includes(dayKey) ? 'checked' : ''}
                onchange="toggleCollaboratorDay('${c.id}', '${dayKey}')" />
              ${FS_DAY_LABELS[dayKey]}
            </label>
          `).join('')}
        </div>
        <button type="button" class="fs-collab-del" title="Șterge colaborator" onclick="removeCollaborator('${c.id}')">✕</button>
      </div>
      <div class="fs-collab-vacation">
        <span class="fs-collab-vacation-label">🌴 Indisponibil (concediu / o zi liberă):</span>
        <input type="date" class="form-input fs-collab-date" value="${escHtml(c.unavailableFrom || '')}"
          onchange="updateCollaboratorUnavailable('${c.id}', 'unavailableFrom', this.value)" />
        <span class="fs-collab-vacation-sep">–</span>
        <input type="date" class="form-input fs-collab-date" value="${escHtml(c.unavailableTo || '')}"
          onchange="updateCollaboratorUnavailable('${c.id}', 'unavailableTo', this.value)" />
      </div>
    </div>
  `).join('');
}

// ============================================
// SUGEREAZĂ PROGRAMUL — panoul care afișează propunerea generată
// de fieldServiceSuggest.js. NU calculează sugestia, doar o randează.
// ============================================
function renderFieldServiceSuggestion() {
  const panel = document.getElementById('fsSuggestionPanel');
  if (!panel) return;

  if (!fsCurrentSuggestion || fsCurrentSuggestion.length === 0) {
    panel.style.display = 'none';
    panel.innerHTML = '';
    return;
  }

  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="fs-suggestion-header">
      <span>🧠 Propunere de program</span>
      <span class="fs-suggestion-sub">Verifică și, dacă e nevoie, modifică numele înainte să aplici.</span>
    </div>
    <div class="fs-suggestion-list">
      ${fsCurrentSuggestion.map((item, i) => `
        <div class="fs-suggestion-item">
          <div class="fs-suggestion-meta">
            <span class="fs-suggestion-day">${FS_DAY_LABELS[item.dayKey]}</span>
            <span class="fs-suggestion-date">${escHtml(item.date)}</span>
          </div>
          <input type="text" class="form-input fs-suggestion-name" value="${escHtml(item.proposedName)}"
            placeholder="Nume" oninput="updateSuggestionName(${i}, this.value)" />
          <p class="fs-suggestion-reason">${escHtml(item.reason)}</p>
        </div>
      `).join('')}
    </div>
    <div class="action-row">
      <button class="btn-primary" onclick="applyFieldServiceSuggestion()">✅ Aplică sugestia</button>
      <button class="btn-outline" onclick="cancelFieldServiceSuggestion()">✕ Anulează</button>
    </div>
  `;
}
