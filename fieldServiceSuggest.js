'use strict';

// ============================================
// FIELD SERVICE — SUGEREAZĂ PROGRAMUL
// Logica de sugestii automate: propune nume pentru rândurile care
// au dată completată dar nume gol, repartizează colaboratorii
// echilibrat pe zile, validează disponibilitatea. NU modifică
// tabelul automat — utilizatorul trebuie să apese "Aplică sugestia"
// (sau poate edita propunerea înainte).
// Depinde de: FS_DAY_LABELS, parseRoDateApprox (fieldServiceUtils.js),
// isDateInCoWeekRange (fieldServiceStorage.js), renderFieldServiceSuggestion
// / renderFieldServiceSchedule (fieldServiceUI.js).
// ============================================
let fsCurrentSuggestion = null;

// Verifică dacă data unui rând (deja parsată în slot.parsed) cade în
// intervalul de concediu/zi liberă setat pentru un colaborator (opțional,
// din Setări → Colaboratori). Dacă lipsește `from`/`to`, colaboratorul e
// mereu disponibil din acest punct de vedere.
function isCollaboratorUnavailableForSlot(collaborator, slot) {
  const from = collaborator.unavailableFrom;
  const to = collaborator.unavailableTo;
  if (!from && !to) return false;
  if (slot.parsed == null) return false;

  const fromTime = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
  const toTime = to ? new Date(to + 'T23:59:59').getTime() : Infinity;
  if (isNaN(fromTime) || isNaN(toTime)) return false;

  return slot.parsed >= fromTime && slot.parsed <= toTime;
}

// Adună toate rândurile cu dată completată dar fără nume, din toate cele
// 3 zile, și le ordonează cronologic (cât se poate deduce din text).
function collectEmptyScheduleSlots() {
  const dayKeys = ['marti', 'vineri', 'sambata'];
  const slots = [];

  dayKeys.forEach(dayKey => {
    const day = state.fieldServiceSchedule?.[dayKey];
    if (!day || !Array.isArray(day.rows)) return;
    day.rows.forEach((row, idx) => {
      if (row.data && row.data.trim() && (!row.nume || !row.nume.trim())) {
        if (isDateInCoWeekRange(row.data)) return; // săptămâna supraveghetorului — nu se sugerează
        slots.push({ dayKey, idx, date: row.data.trim(), parsed: parseRoDateApprox(row.data) });
      }
    });
  });

  slots.sort((a, b) => {
    if (a.parsed != null && b.parsed != null) return a.parsed - b.parsed;
    if (a.parsed != null) return -1;
    if (b.parsed != null) return 1;
    return 0; // ordine stabilă dacă nu se poate deduce data
  });

  return slots;
}

function suggestFieldServiceSchedule() {
  if (typeof guardFieldServiceLock === 'function' && guardFieldServiceLock()) return;
  const collaborators = (state.fieldServiceCollaborators || []).filter(c => c.name && c.name.trim());

  if (collaborators.length === 0) {
    showToast('Adaugă mai întâi colaboratori din Setări (⚙️) ca să poți genera o sugestie.', 'error');
    return;
  }

  const slots = collectEmptyScheduleSlots();
  if (slots.length === 0) {
    showToast('Nu există rânduri cu dată completată și nume gol de propus.', 'error');
    return;
  }

  // Baza de echilibrare: câte întruniri are deja asignate fiecare colaborator
  // (numărând rândurile deja completate din tabel).
  const counts = {};
  collaborators.forEach(c => { counts[c.id] = 0; });
  ['marti', 'vineri', 'sambata'].forEach(dayKey => {
    const day = state.fieldServiceSchedule?.[dayKey];
    if (!day || !Array.isArray(day.rows)) return;
    day.rows.forEach(row => {
      if (row.nume && row.nume.trim()) {
        const match = collaborators.find(c => c.name.trim().toLowerCase() === row.nume.trim().toLowerCase());
        if (match) counts[match.id]++;
      }
    });
  });

  const lastFirst = state.fieldServiceScheduleMeta?.lastFirstPerson || null;
  const suggestion = [];

  slots.forEach((slot, i) => {
    let candidates = collaborators.filter(c =>
      Array.isArray(c.days) && c.days.includes(slot.dayKey) && !isCollaboratorUnavailableForSlot(c, slot)
    );

    if (candidates.length === 0) {
      const allForDay = collaborators.filter(c => Array.isArray(c.days) && c.days.includes(slot.dayKey));
      const reason = allForDay.length > 0
        ? `Toți colaboratorii disponibili ${FS_DAY_LABELS[slot.dayKey].toLowerCase()} sunt în concediu/indisponibili la ${slot.date}.`
        : `Niciun colaborator disponibil ${FS_DAY_LABELS[slot.dayKey]}.`;
      suggestion.push({ ...slot, proposedName: '', reason });
      return;
    }

    const reasonParts = [];

    // Regula "nu de două ori primul la rând" se aplică doar primului rând
    // din sugestia curentă (primul din program), comparat cu ultima
    // sugestie APLICATĂ anterior.
    if (i === 0 && lastFirst) {
      const withoutLast = candidates.filter(c => c.name.trim() !== lastFirst);
      if (withoutLast.length > 0) {
        candidates = withoutLast;
        reasonParts.push(`nu a fost ultima dată primul (ultima dată: ${lastFirst})`);
      }
    }

    // Alege colaboratorul cu cele mai puține întruniri asignate până acum
    // (distribuție echilibrată), păstrând ordinea stabilă la egalitate.
    candidates.sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0));
    const chosen = candidates[0];
    counts[chosen.id] = (counts[chosen.id] || 0) + 1;

    reasonParts.push(`disponibil ${FS_DAY_LABELS[slot.dayKey].toLowerCase()}`);
    reasonParts.push(`echilibrare sarcini (${counts[chosen.id]} întâlniri asignate)`);

    suggestion.push({ ...slot, proposedName: chosen.name.trim(), reason: reasonParts.join(' · ') });
  });

  fsCurrentSuggestion = suggestion;
  renderFieldServiceSuggestion();
}

function updateSuggestionName(index, value) {
  if (fsCurrentSuggestion && fsCurrentSuggestion[index]) {
    fsCurrentSuggestion[index].proposedName = value;
  }
}

function applyFieldServiceSuggestion() {
  if (typeof guardFieldServiceLock === 'function' && guardFieldServiceLock()) return;
  if (!fsCurrentSuggestion || fsCurrentSuggestion.length === 0) return;

  fsCurrentSuggestion.forEach(item => {
    if (!item.proposedName || !item.proposedName.trim()) return; // rând lăsat necompletat, nu se atinge
    const row = state.fieldServiceSchedule?.[item.dayKey]?.rows?.[item.idx];
    if (row) row.nume = item.proposedName.trim();
  });

  // Ține minte cine a fost primul, ca următoarea sugestie să înceapă cu altcineva
  const first = fsCurrentSuggestion[0];
  if (first && first.proposedName && first.proposedName.trim()) {
    if (!state.fieldServiceScheduleMeta) state.fieldServiceScheduleMeta = {};
    state.fieldServiceScheduleMeta.lastFirstPerson = first.proposedName.trim();
  }

  saveState();
  if (typeof mirrorScheduleToIdb === 'function') mirrorScheduleToIdb();

  fsCurrentSuggestion = null;
  renderFieldServiceSchedule();
  renderFieldServiceSuggestion();
  showToast('Programul sugerat a fost aplicat! ✅', 'success');
}

function cancelFieldServiceSuggestion() {
  fsCurrentSuggestion = null;
  renderFieldServiceSuggestion();
}
