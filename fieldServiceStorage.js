'use strict';

// ============================================
// FIELD SERVICE — STORAGE
// Citire/scriere date (state.fieldServiceSchedule,
// state.fieldServiceExtraTables, state.fieldServiceCollaborators),
// salvare (saveState / mirrorScheduleToIdb) și actualizări ale
// tabelelor suplimentare. Depinde de saveState() și
// mirrorScheduleToIdb() (storage.js) și de defaultFieldServiceSchedule()
// (storage.js). Nu generează HTML — pentru randare vezi fieldServiceUI.js.
// ============================================

// Verifică dacă textul liber al unui rând (ex: "22 iulie") cade în
// intervalul [from, to] setat manual pentru săptămâna supraveghetorului.
function isDateInCoWeekRange(rowDateText) {
  const coWeek = state.fieldServiceSchedule?.coWeek;
  if (!coWeek || !coWeek.enabled || !coWeek.from || !coWeek.to) return false;

  const parsed = parseRoDateApprox(rowDateText);
  if (parsed == null) return false;

  const from = new Date(coWeek.from + 'T00:00:00').getTime();
  const to = new Date(coWeek.to + 'T23:59:59').getTime();
  if (isNaN(from) || isNaN(to)) return false;

  return parsed >= from && parsed <= to;
}

function toggleFieldServiceCoWeek(checked) {
  if (guardFieldServiceLock()) return;
  if (!state.fieldServiceSchedule) return;
  if (!state.fieldServiceSchedule.coWeek) state.fieldServiceSchedule.coWeek = { enabled: false, from: '', to: '' };
  state.fieldServiceSchedule.coWeek.enabled = checked;
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceSchedule();
}

function updateFieldServiceCoWeekDate(field, value) {
  if (guardFieldServiceLock()) return;
  if (!state.fieldServiceSchedule?.coWeek) return;
  state.fieldServiceSchedule.coWeek[field] = value;
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceSchedule();
}

function updateScheduleCell(dayKey, index, field, value) {
  if (guardFieldServiceLock()) return;
  const row = state.fieldServiceSchedule?.[dayKey]?.rows?.[index];
  if (!row) return;
  row[field] = value;
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
}

function addScheduleRow(dayKey) {
  if (guardFieldServiceLock()) return;
  const day = state.fieldServiceSchedule?.[dayKey];
  if (!day) return;
  day.rows.push({ data: '', nume: '' });
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceSchedule();
  // Focus pe prima celulă a noului rând
  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll('.fs-sched-row .fs-sched-cell-data');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

function deleteScheduleRow(dayKey, index) {
  if (guardFieldServiceLock()) return;
  const day = state.fieldServiceSchedule?.[dayKey];
  if (!day) return;
  day.rows.splice(index, 1);
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceSchedule();
}

// ============================================
// SALVARE MANUALĂ (buton "💾 Salvează")
// Datele se salvează oricum automat la fiecare modificare, dar butonul
// oferă o confirmare vizuală explicită, cerută de utilizator.
// ============================================
function saveFieldServiceScheduleManual() {
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  showToast('Program salvat! 💾', 'success');
}

// ============================================
// TABELE CALENDAR SUPLIMENTARE
// Permit crearea mai multor tabele (ex: pentru perioade diferite), toate
// vizibile simultan, fără să se suprapună — fiecare e un card separat.
// ============================================
function addFieldServiceExtraTable() {
  const title = prompt('Denumire pentru noul tabel (ex: "Iulie 2026"):', '');
  if (title === null) return; // utilizatorul a anulat

  if (!Array.isArray(state.fieldServiceExtraTables)) state.fieldServiceExtraTables = [];

  const table = defaultFieldServiceSchedule();
  table.id = Date.now().toString();
  table.title = title.trim() || 'Tabel nou';

  state.fieldServiceExtraTables.push(table);
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceExtraTables();
  showToast('Tabel calendar nou creat! 🗓️', 'success');
}

function deleteFieldServiceExtraTable(tableId) {
  if (!confirm('Ștergi acest tabel calendar?')) return;
  state.fieldServiceExtraTables = (state.fieldServiceExtraTables || []).filter(t => t.id !== tableId);
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceExtraTables();
  showToast('Tabel calendar șters.', 'success');
}

function renameFieldServiceExtraTable(tableId, value) {
  const table = (state.fieldServiceExtraTables || []).find(t => t.id === tableId);
  if (!table) return;
  table.title = value;
  saveState();
}

function updateExtraScheduleCell(tableId, dayKey, index, field, value) {
  const table = (state.fieldServiceExtraTables || []).find(t => t.id === tableId);
  const row = table?.[dayKey]?.rows?.[index];
  if (!row) return;
  row[field] = value;
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
}

function addExtraScheduleRow(tableId, dayKey) {
  const table = (state.fieldServiceExtraTables || []).find(t => t.id === tableId);
  const day = table?.[dayKey];
  if (!day) return;
  day.rows.push({ data: '', nume: '' });
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceExtraTables();
  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll(`.fs-extra-table[data-table-id="${tableId}"] .fs-sched-row .fs-sched-cell-data`);
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

function deleteExtraScheduleRow(tableId, dayKey, index) {
  const table = (state.fieldServiceExtraTables || []).find(t => t.id === tableId);
  const day = table?.[dayKey];
  if (!day) return;
  day.rows.splice(index, 1);
  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();
  renderFieldServiceExtraTables();
}

// ============================================
// BLOCARE CU PIN — Programul principal
// Doar cele două persoane configurate din Setări (nume + PIN propriu)
// pot edita tabelul. Starea „deblocat” trăiește DOAR în memorie (variabila
// de mai jos) — NU se salvează —, deci tabelul se re-blochează automat
// quando se pleacă de pe pagină sau se reîncarcă aplicația.
// ============================================
let fsUnlockedPerson = null; // { name } sau null dacă e blocat

function isFieldServiceLocked() {
  const lock = state.fieldServiceLock;
  if (!lock || !lock.enabled) return false;
  const hasAnyPin = (lock.people || []).some(p => p.pin && p.pin.trim());
  if (!hasAnyPin) return false;
  return fsUnlockedPerson === null;
}

// Apelată la începutul oricărei acțiuni care modifică tabelul principal.
// Întoarce true (și avertizează) dacă tabelul e blocat.
function guardFieldServiceLock() {
  if (isFieldServiceLocked()) {
    showToast('Tabelul este blocat. Introdu PIN-ul ca să poți edita. 🔒', 'error');
    return true;
  }
  return false;
}

function unlockFieldServiceSchedule() {
  const input = document.getElementById('fsLockPinInput');
  const pin = input ? input.value : '';
  const people = state.fieldServiceLock?.people || [];
  const match = people.find(p => p.pin && p.pin.trim() && p.pin === pin);

  if (!match) {
    showToast('PIN incorect.', 'error');
    if (input) { input.value = ''; input.focus(); }
    return;
  }

  fsUnlockedPerson = { name: match.name && match.name.trim() ? match.name.trim() : 'Deblocat' };
  showToast(`Deblocat! Bine ai venit, ${fsUnlockedPerson.name} 🔓`, 'success');
  renderFieldServiceSchedule();
}

function lockFieldServiceSchedule() {
  if (fsUnlockedPerson === null) return;
  fsUnlockedPerson = null;
  renderFieldServiceSchedule();
}

// ============================================
// SETĂRI BLOCARE PIN — configurare nume + PIN pentru cele două persoane
// ============================================
function toggleFieldServiceLockEnabled(checked) {
  if (!state.fieldServiceLock) state.fieldServiceLock = { enabled: false, people: [{ name: '', pin: '' }, { name: '', pin: '' }] };
  state.fieldServiceLock.enabled = checked;
  saveState();
  fsUnlockedPerson = null;
  if (typeof renderFieldServiceLockSettings === 'function') renderFieldServiceLockSettings();
  if (document.getElementById('fsScheduleGrid') && typeof renderFieldServiceSchedule === 'function') renderFieldServiceSchedule();
}

function updateFieldServiceLockName(personIndex, value) {
  if (!state.fieldServiceLock?.people?.[personIndex]) return;
  state.fieldServiceLock.people[personIndex].name = value;
  saveState();
}

function updateFieldServiceLockPin(personIndex, value) {
  if (!state.fieldServiceLock?.people?.[personIndex]) return;
  state.fieldServiceLock.people[personIndex].pin = value;
  saveState();
}

// ============================================
// COLABORATORI (Setări) — folosiți de "Sugerează programul"
// ============================================
function addCollaborator() {
  if (!Array.isArray(state.fieldServiceCollaborators)) state.fieldServiceCollaborators = [];
  state.fieldServiceCollaborators.push({
    id: Date.now().toString(),
    name: '',
    days: ['marti', 'vineri', 'sambata'],
    unavailableFrom: '', // concediu / zi liberă — dacă e completat, nu se propune în acest interval
    unavailableTo: '',
  });
  saveState();
  renderCollaboratorsSettings();
}

function removeCollaborator(id) {
  state.fieldServiceCollaborators = (state.fieldServiceCollaborators || []).filter(c => c.id !== id);
  saveState();
  renderCollaboratorsSettings();
}

function updateCollaboratorName(id, value) {
  const c = (state.fieldServiceCollaborators || []).find(c => c.id === id);
  if (!c) return;
  c.name = value;
  saveState();
}

function toggleCollaboratorDay(id, dayKey) {
  const c = (state.fieldServiceCollaborators || []).find(c => c.id === id);
  if (!c) return;
  if (!Array.isArray(c.days)) c.days = [];
  const idx = c.days.indexOf(dayKey);
  if (idx >= 0) c.days.splice(idx, 1);
  else c.days.push(dayKey);
  saveState();
}

// O singură zi liberă (ex: o programare) sau o perioadă (ex: o săptămână de
// concediu) în care colaboratorul NU trebuie propus automat. Pentru o
// singură zi, `from` și `to` pot fi identice. Câmp opțional — dacă rămâne
// gol, colaboratorul e disponibil oricând (în funcție doar de zilele bifate).
function updateCollaboratorUnavailable(id, field, value) {
  const c = (state.fieldServiceCollaborators || []).find(c => c.id === id);
  if (!c) return;
  c[field] = value;
  saveState();
}
