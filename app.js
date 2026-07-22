/* ============================================
   StudiuMeu – APP (INIT & UTILITĂȚI GLOBALE)
   Inițializarea aplicației, scalarea fontului,
   numărătoarea cuvintelor și backup export/import.

   Ordinea de încărcare în index.html:
     1. storage.js
     2. utils.js
     3. nav.js
     4. dashboard.js
     5. watchtower.js
     6. workbook.js
     7. discurs.js
     8. bible-study.js
     9. notes-meetings.js
    10. app.js  ← acest fișier
   ============================================ */

'use strict';

// ============================================
// INIT
// ============================================
function init() {
  loadState();
  loadTheme();
  updateGreeting();
  loadYearText();
  renderDashboard();
  if (typeof initNotifChecks === 'function') initNotifChecks();

  // Textul anului – click pentru editare
  document.getElementById('yearTextBox')?.addEventListener('click', toggleYearTextEdit);

  // Navigare prin sidebar
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // Temă
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Sidebar collapse
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Sidebar extindere (vizibil doar când sidebar e restrâns)
  document.getElementById('sidebarExpandBtn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('collapsed');
  });

  // Hamburger (mobil)
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
  });

  // Buton „+" rapid
  document.getElementById('quickAddBtn')?.addEventListener('click', handleQuickAdd);

  // Căutare globală
  let searchTimer;
  document.getElementById('globalSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handleSearch(e.target.value), 400);
  });
  document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch(e.target.value);
  });

  // Filtre notițe
  document.querySelectorAll('#notesFilters .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => renderNotesList(btn.dataset.filter));
  });

  // Filtre versete
  document.querySelectorAll('#verseFilters .filter-tab').forEach(btn => {
    btn.addEventListener('click', () => renderVersesList(btn.dataset.filter));
  });

  // Progres Turnul de Veghe (auto-update la schimbare)
  document.getElementById('wt-paragraphs')?.addEventListener('input', updateWtProgress);

  // Închidere modală la click pe overlay
  document.getElementById('noteModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeNoteModal();
  });
  document.getElementById('paragraphModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeParagraphModal();
  });

  // Escape – închide modale
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeNoteModal(); closeParagraphModal(); closeIdentityModal(); closeSendModal(); closeChangelogModal(); }
  });

  // Actualizare salut la fiecare minut
  setInterval(updateGreeting, 60000);

  // Scalare font
  initFontScale();
  initNoteFontSizes();

  // Trimitere directă cuvântări (dacă utilizatorul are deja o identitate salvată)
  initPeerTransfer();

  // Reamintire discretă de backup, dacă e cazul (cel mult o dată pe zi)
  if (typeof checkBackupReminder === 'function') checkBackupReminder();

  console.log('%c📖 StudiuMeu – Pregătire Întruniri', 'color:#4f8ef7;font-size:16px;font-weight:bold');
  console.log('%cAplicație personală pentru Martorii lui Iehova', 'color:#8b949e;font-size:12px');
}

// ============================================
// (Scalarea fontului global și pentru notițe este acum
//  în fontScale.js; numărătoarea de cuvinte în wordCounter.js
//  — nu se mai duplică aici pentru a evita erori de redeclarare)
// ============================================


document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', updateWordCounters);
