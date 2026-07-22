'use strict';

// ============================================
// BIBLE READER MODULE
// ============================================

// All 66 books with their jw.org/ro slug and chapter count
const BIBLE_BOOKS = {
  ot: [
    { name: 'Geneza',          slug: 'geneza',            chapters: 50 },
    { name: 'Exodul',          slug: 'exodul',            chapters: 40 },
    { name: 'Leviticul',       slug: 'leviticul',         chapters: 27 },
    { name: 'Numeri',          slug: 'numeri',            chapters: 36 },
    { name: 'Deuteronomul',    slug: 'deuteronomul',      chapters: 34 },
    { name: 'Iosua',           slug: 'iosua',             chapters: 24 },
    { name: 'Judecătorii',     slug: 'judecatorii',       chapters: 21 },
    { name: 'Rut',             slug: 'rut',               chapters: 4  },
    { name: '1 Samuel',        slug: '1-samuel',          chapters: 31 },
    { name: '2 Samuel',        slug: '2-samuel',          chapters: 24 },
    { name: '1 Regi',          slug: '1-regi',            chapters: 22 },
    { name: '2 Regi',          slug: '2-regi',            chapters: 25 },
    { name: '1 Cronici',       slug: '1-cronici',         chapters: 29 },
    { name: '2 Cronici',       slug: '2-cronici',         chapters: 36 },
    { name: 'Ezra',            slug: 'ezra',              chapters: 10 },
    { name: 'Neemia',          slug: 'neemia',            chapters: 13 },
    { name: 'Estera',          slug: 'estera',            chapters: 10 },
    { name: 'Iov',             slug: 'iov',               chapters: 42 },
    { name: 'Psalmii',         slug: 'psalmii',           chapters: 150},
    { name: 'Proverbele',      slug: 'proverbele',        chapters: 31 },
    { name: 'Eclesiastul',     slug: 'eclesiastul',       chapters: 12 },
    { name: 'Cântarea',        slug: 'cantarea-cantarilor', chapters: 8 },
    { name: 'Isaia',           slug: 'isaia',             chapters: 66 },
    { name: 'Ieremia',         slug: 'ieremia',           chapters: 52 },
    { name: 'Plângerile',      slug: 'plangerile-lui-ieremia', chapters: 5 },
    { name: 'Ezechiel',        slug: 'ezechiel',          chapters: 48 },
    { name: 'Daniel',          slug: 'daniel',            chapters: 12 },
    { name: 'Osea',            slug: 'osea',              chapters: 14 },
    { name: 'Ioel',            slug: 'ioel',              chapters: 3  },
    { name: 'Amos',            slug: 'amos',              chapters: 9  },
    { name: 'Obadia',          slug: 'obadia',            chapters: 1  },
    { name: 'Iona',            slug: 'iona',              chapters: 4  },
    { name: 'Mica',            slug: 'mica',              chapters: 7  },
    { name: 'Naum',            slug: 'naum',              chapters: 3  },
    { name: 'Habacuc',         slug: 'habacuc',           chapters: 3  },
    { name: 'Țefania',         slug: 'tefania',           chapters: 3  },
    { name: 'Hagai',           slug: 'hagai',             chapters: 2  },
    { name: 'Zaharia',         slug: 'zaharia',           chapters: 14 },
    { name: 'Maleahi',         slug: 'maleahi',           chapters: 4  },
  ],
  nt: [
    { name: 'Matei',           slug: 'matei',             chapters: 28 },
    { name: 'Marcu',           slug: 'marcu',             chapters: 16 },
    { name: 'Luca',            slug: 'luca',              chapters: 24 },
    { name: 'Ioan',            slug: 'ioan',              chapters: 21 },
    { name: 'Faptele',         slug: 'faptele-apostolilor', chapters: 28 },
    { name: 'Romani',          slug: 'romani',            chapters: 16 },
    { name: '1 Corinteni',     slug: '1-corinteni',       chapters: 16 },
    { name: '2 Corinteni',     slug: '2-corinteni',       chapters: 13 },
    { name: 'Galateni',        slug: 'galateni',          chapters: 6  },
    { name: 'Efeseni',         slug: 'efeseni',           chapters: 6  },
    { name: 'Filipeni',        slug: 'filipeni',          chapters: 4  },
    { name: 'Coloseni',        slug: 'coloseni',          chapters: 4  },
    { name: '1 Tesaloniceni',  slug: '1-tesaloniceni',    chapters: 5  },
    { name: '2 Tesaloniceni',  slug: '2-tesaloniceni',    chapters: 3  },
    { name: '1 Timotei',       slug: '1-timotei',         chapters: 6  },
    { name: '2 Timotei',       slug: '2-timotei',         chapters: 4  },
    { name: 'Tit',             slug: 'tit',               chapters: 3  },
    { name: 'Filimon',         slug: 'filimon',           chapters: 1  },
    { name: 'Evrei',           slug: 'evrei',             chapters: 13 },
    { name: 'Iacov',           slug: 'iacov',             chapters: 5  },
    { name: '1 Petru',         slug: '1-petru',           chapters: 5  },
    { name: '2 Petru',         slug: '2-petru',           chapters: 3  },
    { name: '1 Ioan',          slug: '1-ioan',            chapters: 5  },
    { name: '2 Ioan',          slug: '2-ioan',            chapters: 1  },
    { name: '3 Ioan',          slug: '3-ioan',            chapters: 1  },
    { name: 'Iuda',            slug: 'iuda',              chapters: 1  },
    { name: 'Revelația',       slug: 'revelatia',         chapters: 22 },
  ]
};

// State for bible reader
let brState = {
  testament: 'ot',
  bookSlug: null,
  bookName: null,
  totalChapters: 0,
  chapter: null,
  initialized: false,
};

// Notes stored as: state.bibleNotes[bookSlug+'-'+chapter] = { text, markedVerses }

function initBibleReader() {
  if (!state.bibleNotes) { state.bibleNotes = {}; }
  if (brState.initialized) {
    // refresh chapter buttons to show which ones have notes
    if (brState.bookSlug) refreshChapterButtons();
    return;
  }
  brState.initialized = true;
  renderBibleBooks('ot');
}

function switchTestament(t) {
  brState.testament = t;
  document.getElementById('tab-ot').classList.toggle('active', t === 'ot');
  document.getElementById('tab-nt').classList.toggle('active', t === 'nt');
  // Resetează la lista de cărți (fără modal/popup)
  document.getElementById('chapterSelectorCard').style.display = 'none';
  document.getElementById('bibleWelcome').style.display = 'flex';
  document.getElementById('bibleChapterView').style.display = 'none';
  brState.bookSlug = null;
  brState.chapter = null;
  renderBibleBooks(t);
}

function renderBibleBooks(testament) {
  const container = document.getElementById('bibleBooksList');
  if (!container) return;
  const books = BIBLE_BOOKS[testament];
  container.innerHTML = books.map(book => `
    <button class="bible-book-btn ${brState.bookSlug === book.slug ? 'active' : ''}"
      onclick="selectBook('${book.slug}', 1, ${book.chapters}, '${testament}')">
      <span>${escHtml(book.name)}</span>
      <span class="bible-book-chapters">${book.chapters} cap.</span>
    </button>
  `).join('');
}

function selectBook(slug, firstChapter, totalChapters, testament) {
  if (!state.bibleNotes) state.bibleNotes = {};
  brState.bookSlug = slug;
  brState.totalChapters = totalChapters;
  brState.testament = testament || brState.testament;

  // Find book name
  const allBooks = [...BIBLE_BOOKS.ot, ...BIBLE_BOOKS.nt];
  const book = allBooks.find(b => b.slug === slug);
  brState.bookName = book ? book.name : slug;
  brState.totalChapters = book ? book.chapters : totalChapters;

  // Update book buttons active state
  renderBibleBooks(brState.testament);

  // Show chapter selector
  document.getElementById('selectedBookName').textContent = brState.bookName;
  document.getElementById('chapterSelectorCard').style.display = 'block';

  renderChapters();

  // Open chapter 1 immediately
  openChapter(1);
}

function renderChapters() {
  const container = document.getElementById('bibleChaptersList');
  if (!container) return;
  const buttons = [];
  for (let i = 1; i <= brState.totalChapters; i++) {
    const key = `${brState.bookSlug}-${i}`;
    const hasNotes = state.bibleNotes && state.bibleNotes[key] &&
      (state.bibleNotes[key].text || (state.bibleNotes[key].markedVerses || []).length > 0);
    buttons.push(`
      <button class="bible-chapter-btn ${brState.chapter === i ? 'active' : ''} ${hasNotes ? 'has-notes' : ''}"
        onclick="openChapter(${i})" title="Capitol ${i}${hasNotes ? ' (ai notițe)' : ''}">${i}</button>
    `);
  }
  container.innerHTML = buttons.join('');
}

function refreshChapterButtons() {
  const container = document.getElementById('bibleChaptersList');
  if (!container) return;
  container.querySelectorAll('.bible-chapter-btn').forEach((btn, idx) => {
    const chapNum = idx + 1;
    const key = `${brState.bookSlug}-${chapNum}`;
    const hasNotes = state.bibleNotes && state.bibleNotes[key] &&
      (state.bibleNotes[key].text || (state.bibleNotes[key].markedVerses || []).length > 0);
    btn.classList.toggle('active', brState.chapter === chapNum);
    btn.classList.toggle('has-notes', !!hasNotes);
  });
}

function openChapter(chapNum) {
  if (!state.bibleNotes) state.bibleNotes = {};
  brState.chapter = chapNum;

  const key = `${brState.bookSlug}-${chapNum}`;
  const noteData = state.bibleNotes[key] || { text: '', markedVerses: [] };

  // Build jw.org/ro URL
  const jwUrl = getBibleUrl(brState.bookSlug, chapNum);

  // Ascunde placeholder-ul, arată editorul direct în panou (fără modal/popup)
  document.getElementById('bibleWelcome').style.display = 'none';
  document.getElementById('bibleChapterView').style.display = 'flex';

  // Titlu capitol și link jw.org
  document.getElementById('chapterTitle').textContent = `${brState.bookName} ${chapNum}`;
  const readLink = document.getElementById('jwReadLink');
  if (readLink) readLink.href = jwUrl;

  // Butoane navigare
  document.getElementById('btnPrevChap').disabled = chapNum <= 1;
  document.getElementById('btnNextChap').disabled = chapNum >= brState.totalChapters;

  // Notițe textarea + badge
  const notesTextEl = document.getElementById('chapterNotesText');
  if (notesTextEl) notesTextEl.value = noteData.text || '';
  const badge = document.getElementById('chapterNotesBadge');
  if (badge) badge.textContent = `${brState.bookName} ${chapNum}`;

  // Text capitol (scris/lipit de utilizator), salvat separat per capitol
  if (!state.bibleOfflineText) state.bibleOfflineText = {};
  const verseTextEl = document.getElementById('chapterVerseText');
  if (verseTextEl) verseTextEl.value = state.bibleOfflineText[key] || '';

  // Randare notițe salvate și versete marcate
  renderChapterNotesDisplay(noteData);
  renderMarkedVerses(noteData.markedVerses || []);

  // Reîmprospătare grilă capitole
  refreshChapterButtons();
}

function navigateChapter(delta) {
  const next = brState.chapter + delta;
  if (next >= 1 && next <= brState.totalChapters) {
    openChapter(next);
  }
}

function openOnJwOrg() {
  if (!brState.bookSlug || !brState.chapter) {
    window.open('https://www.jw.org/ro/biblioteca/biblie/biblia-de-studiu/carti/', '_blank');
    return;
  }
  const url = getBibleUrl(brState.bookSlug, brState.chapter);
  window.open(url, '_blank');
}

function backToBooks() {
  document.getElementById('chapterSelectorCard').style.display = 'none';
  brState.bookSlug = null;
  brState.chapter = null;
  // Arată placeholder-ul, ascunde editorul (fără modal)
  document.getElementById('bibleWelcome').style.display = 'flex';
  document.getElementById('bibleChapterView').style.display = 'none';
  renderBibleBooks(brState.testament);
}

// Auto-save notes as user types (debounced)
let notesSaveTimer = null;
function autoSaveChapterNote() {
  clearTimeout(notesSaveTimer);
  notesSaveTimer = setTimeout(saveChapterNote, 800);
}

function saveChapterNote() {
  if (!brState.bookSlug || !brState.chapter) return;
  if (!state.bibleNotes) state.bibleNotes = {};
  const key = `${brState.bookSlug}-${brState.chapter}`;
  const text = document.getElementById('chapterNotesText').value;
  if (!state.bibleNotes[key]) state.bibleNotes[key] = { text: '', markedVerses: [] };
  state.bibleNotes[key].text = text;
  saveState();
  markStudyDay();
  refreshChapterButtons();
  renderChapterNotesDisplay(state.bibleNotes[key]);
}

// Auto-save chapter verse text as user types (debounced)
let verseTextSaveTimer = null;
function autoSaveChapterVerseText() {
  clearTimeout(verseTextSaveTimer);
  verseTextSaveTimer = setTimeout(saveChapterVerseText, 800);
}

function saveChapterVerseText() {
  if (!brState.bookSlug || !brState.chapter) return;
  if (!state.bibleOfflineText) state.bibleOfflineText = {};
  const key = `${brState.bookSlug}-${brState.chapter}`;
  const text = document.getElementById('chapterVerseText').value;
  if (text.trim()) {
    state.bibleOfflineText[key] = text;
  } else {
    delete state.bibleOfflineText[key];
  }
  saveState();
}

function renderChapterNotesDisplay(noteData) {
  const container = document.getElementById('chapterNotesDisplay');
  if (!container) return;
  if (!noteData || !noteData.text) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div class="chapter-notes-box">
      <p class="chapter-notes-box-title">📝 Notițele tale pentru ${escHtml(brState.bookName)} ${brState.chapter}</p>
      <p class="chapter-notes-box-text">${escHtml(noteData.text)}</p>
    </div>`;
}

function addMarkedVerse() {
  const input = document.getElementById('markedVerseRef');
  const ref = input.value.trim();
  if (!ref) return;
  if (!brState.bookSlug || !brState.chapter) return;
  if (!state.bibleNotes) state.bibleNotes = {};
  const key = `${brState.bookSlug}-${brState.chapter}`;
  if (!state.bibleNotes[key]) state.bibleNotes[key] = { text: '', markedVerses: [] };
  state.bibleNotes[key].markedVerses = state.bibleNotes[key].markedVerses || [];
  state.bibleNotes[key].markedVerses.push(ref);
  saveState();
  input.value = '';
  renderMarkedVerses(state.bibleNotes[key].markedVerses);
  renderChapterHighlights(state.bibleNotes[key].markedVerses);
  refreshChapterButtons();
  showToast(`Verset ${ref} marcat! ✨`, 'success');
}

function removeMarkedVerse(key, idx) {
  if (!state.bibleNotes || !state.bibleNotes[key]) return;
  state.bibleNotes[key].markedVerses.splice(idx, 1);
  saveState();
  renderMarkedVerses(state.bibleNotes[key].markedVerses);
  renderChapterHighlights(state.bibleNotes[key].markedVerses);
  refreshChapterButtons();
}

function renderMarkedVerses(list) {
  const container = document.getElementById('markedVersesList');
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = '<div style="font-size:0.78rem;color:var(--text-muted);padding:4px 0">Niciun verset marcat.</div>';
    return;
  }
  const key = `${brState.bookSlug}-${brState.chapter}`;
  container.innerHTML = list.map((v, i) => `
    <div class="marked-verse-item">
      <span>${escHtml(brState.bookName)} ${brState.chapter}:${escHtml(v)}</span>
      <button class="delete-btn" onclick="removeMarkedVerse('${key}', ${i})" title="Șterge">✕</button>
    </div>`).join('');
  renderChapterHighlights(list);
}

function renderChapterHighlights(list) {
  const container = document.getElementById('chapterHighlights');
  if (!container || !list || list.length === 0) {
    if (container) container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <p style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Versete marcate în ${escHtml(brState.bookName)} ${brState.chapter}</p>
    ${list.map(v => `
      <div class="highlight-item">
        <span style="font-size:1.2rem">⭐</span>
        <span class="highlight-ref">${escHtml(brState.bookName)} ${brState.chapter}:${escHtml(v)}</span>
        <a href="${getBibleUrl(brState.bookSlug, brState.chapter)}" target="_blank"
           style="font-size:0.78rem;color:var(--accent);text-decoration:none;font-weight:600">jw.org ↗</a>
      </div>`).join('')}`;
}

// ============================================
