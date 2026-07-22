'use strict';

// ============================================
// NAVIGATION
// ============================================
const pageTitles = {
  dashboard: 'Panou Principal',
  temacursant: 'Temă pentru cursant',
  watchtower: 'Turnul de Veghe – Studiu',
  discurs: 'Discurs Biblic – 30 minute',
  workbook: 'Viața creștină și predicarea',
  talk5cuv: 'Cuvântare – 5 minute',
  bible: 'Studiu Biblic Personal',
  library: 'Bibliotecă',
  biblereader: 'Citește Biblia',
  fieldservice: 'Întrunirea de Serviciu de Teren',
  fieldschedulingpreview: 'Programare de ieșire pe teren',
  preachingassistant: 'Asistent de predicare',
  notes: 'Notițele Mele',
  meetings: 'Programul Meu',
};

let currentPage = 'dashboard';

function navigateTo(page) {
  // Re-blochează tabelul de program dacă plecăm de pe pagina de serviciu de teren
  if (currentPage === 'fieldservice' && page !== 'fieldservice' && typeof lockFieldServiceSchedule === 'function') {
    lockFieldServiceSchedule();
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');
  if (page === 'watchtower' || page === 'discurs') {
    document.getElementById('navGroup-watchtower')?.classList.add('open');
  }
  if (page === 'workbook' || page === 'talk5cuv') {
    document.getElementById('navGroup-workbook')?.classList.add('open');
  }
  if (page === 'fieldservice' || page === 'preachingassistant' || page === 'fieldschedulingpreview') {
    document.getElementById('navGroup-fieldservice')?.classList.add('open');
  }

  document.getElementById('pageTitle').textContent = pageTitles[page] || page;
  currentPage = page;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');

  // Re-render page
  renderPage(page);
  return false;
}

function renderPage(page) {
  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'temacursant': renderTemaCursantPage(); break;
    case 'notes': renderNotesList(); break;
    case 'bible': renderVersesList('all'); renderProphecies(); break;
    case 'library': renderLibraryPage(); break;
    case 'meetings': renderMeetings(); break;
    case 'watchtower': renderWtParagraphs(); break;
    case 'discurs': renderDiscursPage(); break;
    case 'workbook': break;
    case 'talk5cuv': renderTalk5Page(); break;
    case 'biblereader': initBibleReader(); break;
    case 'fieldservice': renderFieldServiceList(); renderFieldServiceSchedule(); renderFieldServiceExtraTables(); break;
  }
  updateWordCounters();
}

function toggleNavGroup(id) {
  document.getElementById(`navGroup-${id}`)?.classList.toggle('open');
}

// ============================================
// SUBMENIU "Întrunirea de ieșire pe teren" (Panou Principal)
// ============================================
function toggleQuickLinkGroup(id, headerEl) {
  const submenu = document.getElementById(id);
  if (!submenu) return;
  const isOpen = submenu.style.display === 'flex';
  submenu.style.display = isOpen ? 'none' : 'flex';
  if (headerEl) headerEl.classList.toggle('expanded', !isOpen);
}

function navigateToFieldServiceSchedule() {
  navigateTo('fieldservice');
  setTimeout(() => {
    document.getElementById('fsScheduleGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

// ============================================
// ECRAN COMPLET NOTIȚE (fundal alb, pe tot ecranul)
// ============================================
let fullscreenNoteState = null; // { textarea, placeholder }

function openFullscreenNote(textareaId, title) {
  const textarea = document.getElementById(textareaId);
  const overlay = document.getElementById('noteFullscreenOverlay');
  const slot = document.getElementById('noteFullscreenSlot');
  if (!textarea || !overlay || !slot) return;

  // marcator ca să știm unde să punem textarea înapoi
  const placeholder = document.createComment(`fullscreen-placeholder-${textareaId}`);
  textarea.parentNode.insertBefore(placeholder, textarea);
  fullscreenNoteState = { textarea, placeholder };

  document.getElementById('noteFullscreenTitle').textContent = title || 'Notițe';
  slot.appendChild(textarea);
  overlay.classList.add('active');
  textarea.focus();
}

function closeFullscreenNote() {
  const overlay = document.getElementById('noteFullscreenOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');

  if (fullscreenNoteState) {
    const { textarea, placeholder } = fullscreenNoteState;
    placeholder.parentNode.replaceChild(textarea, placeholder);
    fullscreenNoteState = null;
    if (typeof autoGrowTextarea === 'function') autoGrowTextarea(textarea);
  }
}

// ============================================
// ============================================
// QUICK ADD BUTTON
// ============================================
function handleQuickAdd() {
  switch(currentPage) {
    case 'watchtower': addWtParagraph(); break;
    case 'notes': openNewNoteModal(); break;
    case 'fieldservice': document.getElementById('fs-title')?.focus(); break;
    case 'bible': document.getElementById('verse-ref-input')?.focus(); break;
    case 'meetings': addMeetingEntry(); break;
    default: openNewNoteModal();
  }
}

// ============================================
