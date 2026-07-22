'use strict';

// ============================================
// EXPORT / IMPORT BACKUP
// ============================================
const LAST_EXPORT_KEY = 'studiuMeu_lastExportAt';
const BACKUP_REMINDER_KEY = 'studiuMeu_backupReminderShownDate';
const BACKUP_REMINDER_DAYS = 14; // după câte zile fără export considerăm backup-ul "vechi"

function isBackupStale() {
  const last = localStorage.getItem(LAST_EXPORT_KEY);
  if (!last) return true;
  const days = (Date.now() - new Date(last).getTime()) / 86400000;
  return days >= BACKUP_REMINDER_DAYS;
}

/** Actualizează rândul "Ultimul backup" din Setări, dacă e vizibil. */
function updateBackupStatusUI() {
  const el = document.getElementById('lastExportLabel');
  if (!el) return;
  el.textContent = formatRelativeTime(localStorage.getItem(LAST_EXPORT_KEY));
  el.classList.toggle('stale-value', isBackupStale());
}

/**
 * La pornirea aplicației, dacă nu s-a mai făcut export de peste
 * BACKUP_REMINDER_DAYS zile (sau niciodată), arată o reamintire discretă —
 * dar o singură dată pe zi, ca să nu devină enervantă.
 */
function checkBackupReminder() {
  if (!isBackupStale()) return;
  const today = new Date().toISOString().split('T')[0];
  if (localStorage.getItem(BACKUP_REMINDER_KEY) === today) return;
  localStorage.setItem(BACKUP_REMINDER_KEY, today);

  const hasEverExported = !!localStorage.getItem(LAST_EXPORT_KEY);
  const msg = hasEverExported
    ? '💾 N-ai mai făcut un backup de ceva vreme. Un export rapid din Setări te ține în siguranță.'
    : '💾 N-ai făcut încă niciun backup. Recomandăm un export din Setări, ca să nu pierzi datele.';
  setTimeout(() => showToast(msg, 'warning'), 1200);
}

function exportData() {
  try {
    // Ne asigurăm că datele din variabila state sunt salvate înainte de export.
    saveState();

    const backup = {
      app: 'StudiuMeu',
      version: 2,
      exportedAt: new Date().toISOString(),
      // Salvăm întregul obiect state (spread + clonare simplă), ca să nu uităm
      // niciun câmp nou adăugat vreodată în storage.js. Vezi bug-ul din v1:
      // exportul vechi salva doar o parte din câmpuri (lipseau discursTalks,
      // temeCursant, prophecies, myUser, contacts, fieldServiceSchedule,
      // notifSettings, bibleNotes) și utilizatorii pierdeau date la restaurare.
      state: JSON.parse(JSON.stringify(state)),
      preferences: {
        theme: localStorage.getItem('studiuMeu_theme') || 'dark',
        yearText: localStorage.getItem('studiuMeu_yearText') || '',
        yearColor: localStorage.getItem('studiuMeu_yearColor') || '#e6edf3',
        yearSize: localStorage.getItem('studiuMeu_yearSize') || '14',
        fontScale: localStorage.getItem('studiuMeu_fontScale') || '14',
      }
    };

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `studiu-meu-backup-${today}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
    updateBackupStatusUI();

    showToast('Backup exportat cu succes! 📦', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Nu s-a putut exporta backup-ul.', 'error');
  }
}

function triggerImport() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';

    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return;

      importData(file);
    });

    document.body.appendChild(input);
    input.click();
  } catch (error) {
    console.error('Import trigger error:', error);
    showToast('Nu s-a putut deschide importul.', 'error');
  }
}

function importData(file) {
  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const parsed = JSON.parse(event.target.result);

      // Acceptă formatul nou de backup, dar și un fișier care conține direct obiectul state.
      const importedState = parsed.state || parsed;

      if (!importedState || typeof importedState !== 'object') {
        throw new Error('Format backup invalid.');
      }

      const validKeys = ['notes', 'verses', 'wtStudies', 'workbooks', 'meetings'];
      const hasValidShape = validKeys.some(key => Array.isArray(importedState[key]));
      if (!hasValidShape) {
        throw new Error('Fișierul nu pare să fie un backup StudiuMeu valid.');
      }

      const shouldImport = confirm(
        'Importul va înlocui datele salvate acum în aplicație. Continui?\n\n' +
        'Recomandare: fă mai întâi un export al datelor actuale.'
      );
      if (!shouldImport) return;

      // Reconstruim state pornind de la forma implicită (defaultAppState, din
      // storage.js) și suprascriem cu tot ce vine din backup. Astfel se
      // restaurează TOATE câmpurile (inclusiv discursTalks, temeCursant,
      // prophecies, myUser, contacts, fieldServiceSchedule, notifSettings,
      // bibleNotes), nu doar o listă fixă aleasă manual — și orice câmp nou
      // adăugat pe viitor în storage.js se importă automat, fără alt cod aici.
      state = { ...defaultAppState(), ...importedState };

      saveState();

      // Importă și preferințele, dacă există în backup.
      if (parsed.preferences && typeof parsed.preferences === 'object') {
        const pref = parsed.preferences;

        if (pref.theme) localStorage.setItem('studiuMeu_theme', pref.theme);

        if (pref.yearText) localStorage.setItem('studiuMeu_yearText', pref.yearText);
        else localStorage.removeItem('studiuMeu_yearText');

        if (pref.yearColor) localStorage.setItem('studiuMeu_yearColor', pref.yearColor);
        else localStorage.removeItem('studiuMeu_yearColor');

        if (pref.yearSize) localStorage.setItem('studiuMeu_yearSize', pref.yearSize);
        else localStorage.removeItem('studiuMeu_yearSize');

        if (pref.fontScale) {
          localStorage.setItem('studiuMeu_fontScale', pref.fontScale);
          applyFontScale(parseInt(pref.fontScale));
          const sl = document.getElementById('fontScaleSlider');
          if (sl) sl.value = pref.fontScale;
        }
      }

      loadTheme();
      loadYearText();
      renderPage(currentPage);
      renderDashboard();

      showToast('Backup importat cu succes! ✅', 'success');
    } catch (error) {
      console.error('Import error:', error);
      showToast('Fișier invalid sau backup corupt.', 'error');
    }
  };

  reader.onerror = function () {
    showToast('Nu s-a putut citi fișierul.', 'error');
  };

  reader.readAsText(file);
}


// ============================================
// ȘTERGERE COMPLETĂ A DATELOR (zonă periculoasă)
// ============================================
/**
 * Șterge PERMANENT toate datele aplicației de pe acest dispozitiv.
 * Are un avertisment dublu (confirm + scriere de confirmare), pentru
 * că este o acțiune ireversibilă și nu există nicio copie "în cloud".
 */
function resetAllData() {
  const step1 = confirm(
    '⚠️ ATENȚIE: Această acțiune șterge PERMANENT toate datele din aplicație ' +
    '(notițe, cuvântări, program teren, temă cursant, tot).\n\n' +
    'Este ireversibilă și nu poate fi anulată.\n\n' +
    'Ai făcut deja un export/backup? Apasă OK doar dacă ești sigur că vrei să continui.'
  );
  if (!step1) return;

  const confirmText = prompt('Pentru confirmare finală, scrie exact ȘTERG (cu majuscule) și apasă OK:');
  if (confirmText !== 'ȘTERG') {
    showToast('Ștergere anulată — nimic nu a fost modificat.', 'success');
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_EXPORT_KEY);
  localStorage.removeItem(BACKUP_REMINDER_KEY);

  // Golește și legăturile către fișierele video salvate (IndexedDB), dacă există.
  if (typeof deleteAllVideoHandles === 'function') {
    deleteAllVideoHandles().catch(() => {});
  }

  showToast('Toate datele au fost șterse. Se reîncarcă aplicația...', 'success');
  setTimeout(() => location.reload(), 1200);
}

// ============================================
