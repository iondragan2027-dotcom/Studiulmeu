'use strict';

// ============================================
// NOTES
// ============================================
let editingNoteId = null;
let activeNotesFilter = 'all';

function _showNotesEditor() {
  const placeholder = document.getElementById('notesEditorPlaceholder');
  if (placeholder) placeholder.style.display = 'none';
  const form = document.getElementById('notesEditorForm');
  if (form) form.style.display = 'flex';
}

function _hideNotesEditor() {
  const placeholder = document.getElementById('notesEditorPlaceholder');
  if (placeholder) placeholder.style.display = 'flex';
  const form = document.getElementById('notesEditorForm');
  if (form) form.style.display = 'none';
}

function openNewNoteInline() {
  editingNoteId = null;
  const label = document.getElementById('notesEditorTitleLabel');
  if (label) label.textContent = 'Notiță Nouă';
  const title = document.getElementById('noteTitle');
  if (title) title.value = '';
  const content = document.getElementById('noteContent');
  if (content) content.value = '';
  const tags = document.getElementById('noteTags');
  if (tags) tags.value = '';
  const cat = document.getElementById('noteCategory');
  if (cat) cat.value = 'general';
  
  const deleteBtn = document.getElementById('deleteNoteBtn');
  if (deleteBtn) deleteBtn.style.display = 'none';
  _showNotesEditor();
  if (title) title.focus();
}

function openNewNoteModal() { openNewNoteInline(); }
function closeNoteModal() { _hideNotesEditor(); }

function openNoteCard(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  editingNoteId = id;
  const label = document.getElementById('notesEditorTitleLabel');
  if (label) label.textContent = 'Editează Notița';
  const title = document.getElementById('noteTitle');
  if (title) title.value = note.title;
  const content = document.getElementById('noteContent');
  if (content) content.value = note.content;
  const tags = document.getElementById('noteTags');
  if (tags) tags.value = (note.tags || []).join(', ');
  const cat = document.getElementById('noteCategory');
  if (cat) cat.value = note.category || 'general';
  
  const deleteBtn = document.getElementById('deleteNoteBtn');
  if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  _showNotesEditor();
  if (title) title.focus();
}

function deleteCurrentNote() {
  if (!editingNoteId) return;
  if (editingNoteId.endsWith('_wt')) {
    const studyId = editingNoteId.replace('_wt', '');
    state.wtStudies = state.wtStudies.filter(s => s.id !== studyId);
  } else if (editingNoteId.endsWith('_wb')) {
    const wbId = editingNoteId.replace('_wb', '');
    state.workbooks = state.workbooks.filter(w => w.id !== wbId);
  }

  state.notes = state.notes.filter(n => n.id !== editingNoteId);
  saveState();
  _hideNotesEditor();
  editingNoteId = null;
  renderNotesList();
  renderDashboard();
  showToast('Notiță ștearsă. 🗑', 'success');
}

// ============================================
// ============================================
// TEXTUL ANULUI
// ============================================
let yearTextColor = '#e6edf3';
let yearFontSize = 14;

// Generează butoanele 1-24 pentru mărime font
function buildSizeButtons() {
  const container = document.getElementById('yearSizeButtons');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 1; i <= 24; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'size-btn' + (i === yearFontSize ? ' active' : '');
    btn.dataset.size = i;
    btn.onclick = () => selectYearSize(btn);
    container.appendChild(btn);
  }
}

function selectYearSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  yearFontSize = parseInt(btn.dataset.size);
  // Previzualizare live în textarea
  const input = document.getElementById('yearTextInput');
  if (input) input.style.fontSize = yearFontSize + 'px';
}

function loadYearText() {
  const saved = localStorage.getItem('studiuMeu_yearText');
  const savedColor = localStorage.getItem('studiuMeu_yearColor') || '#e6edf3';
  const savedSize = parseInt(localStorage.getItem('studiuMeu_yearSize')) || 14;
  yearTextColor = savedColor;
  yearFontSize = savedSize;
  const display = document.getElementById('yearTextDisplay');
  const actions = document.getElementById('yearTextActions');
  if (display) {
    if (saved) {
      display.textContent = saved;
      display.style.fontStyle = 'normal';
      display.style.opacity = '1';
      display.style.color = savedColor;
      display.style.fontSize = savedSize + 'px';
      if (actions) actions.style.display = 'flex';
    } else {
      display.textContent = 'Apasă pentru a adăuga textul anului...';
      display.style.fontStyle = 'italic';
      display.style.opacity = '0.5';
      display.style.color = '';
      display.style.fontSize = '';
      if (actions) actions.style.display = 'none';
    }
  }
}

function toggleYearTextMenu() {
  const dropdown = document.getElementById('yearTextDropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('open');
}

function closeYearTextMenu() {
  document.getElementById('yearTextDropdown')?.classList.remove('open');
}

// Închide meniul „Textul Anului” la click în afara lui
document.addEventListener('click', (e) => {
  const menu = document.getElementById('yearTextActions');
  if (menu && !menu.contains(e.target)) {
    closeYearTextMenu();
  }
});

function openYearTextEdit() {
  const editDiv = document.getElementById('yearTextEdit');
  const displayP = document.getElementById('yearTextDisplay');
  const input = document.getElementById('yearTextInput');
  if (!editDiv || !displayP || !input) return;
  const saved = localStorage.getItem('studiuMeu_yearText') || '';
  const savedColor = localStorage.getItem('studiuMeu_yearColor') || '#e6edf3';
  const savedSize = parseInt(localStorage.getItem('studiuMeu_yearSize')) || 14;
  input.value = saved;
  input.style.fontSize = savedSize + 'px';
  yearTextColor = savedColor;
  yearFontSize = savedSize;
  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === savedColor);
  });
  buildSizeButtons();
  editDiv.style.display = 'block';
  displayP.style.display = 'none';
  document.getElementById('yearTextActions').style.display = 'none';
  input.focus();
}

function toggleYearTextEdit() {
  const saved = localStorage.getItem('studiuMeu_yearText');
  if (saved) return;
  openYearTextEdit();
}

function selectYearColor(btn) {
  document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  yearTextColor = btn.dataset.color;
}

function saveYearText() {
  const input = document.getElementById('yearTextInput');
  const text = input?.value?.trim();
  if (text) {
    localStorage.setItem('studiuMeu_yearText', text);
    localStorage.setItem('studiuMeu_yearColor', yearTextColor);
    localStorage.setItem('studiuMeu_yearSize', yearFontSize);
  } else {
    localStorage.removeItem('studiuMeu_yearText');
    localStorage.removeItem('studiuMeu_yearColor');
    localStorage.removeItem('studiuMeu_yearSize');
  }
  document.getElementById('yearTextEdit').style.display = 'none';
  document.getElementById('yearTextDisplay').style.display = 'block';
  loadYearText();
  showToast('Textul anului salvat! ✨', 'success');
}

function deleteYearText() {
  localStorage.removeItem('studiuMeu_yearText');
  localStorage.removeItem('studiuMeu_yearColor');
  localStorage.removeItem('studiuMeu_yearSize');
  document.getElementById('yearTextEdit').style.display = 'none';
  document.getElementById('yearTextDisplay').style.display = 'block';
  loadYearText();
  showToast('Textul anului șters.', 'success');
}

function cancelYearText() {
  document.getElementById('yearTextEdit').style.display = 'none';
  document.getElementById('yearTextDisplay').style.display = 'block';
  const saved = localStorage.getItem('studiuMeu_yearText');
  if (saved) {
    document.getElementById('yearTextActions').style.display = 'flex';
  }
}

function closeNoteModal() {
  _hideNotesEditor();
  editingNoteId = null;
}

function saveNote() {
  const title = document.getElementById('noteTitle')?.value?.trim();
  const content = document.getElementById('noteContent')?.value?.trim();
  if (!title) {
    showToast('Adaugă un titlu pentru notiță.', 'error');
    return;
  }

  const tags = document.getElementById('noteTags')?.value
    .split(',').map(t => t.trim()).filter(Boolean) || [];

  if (editingNoteId) {
    const idx = state.notes.findIndex(n => n.id === editingNoteId);
    if (idx !== -1) {
      state.notes[idx] = { ...state.notes[idx], title, content, tags,
        category: document.getElementById('noteCategory')?.value || 'general' };
    }
    showToast('Notiță actualizată! ✅', 'success');
  } else {
    state.notes.push({
      id: Date.now().toString(),
      title, content, tags,
      category: document.getElementById('noteCategory')?.value || 'general',
      date: new Date().toISOString().split('T')[0],
    });
    showToast('Notiță salvată! ✅', 'success');
  }

  markStudyDay();
  saveState();
  _hideNotesEditor();
  editingNoteId = null;
  renderNotesList();
  if (currentPage === 'fieldservice') {
    renderFieldServiceList();
  }
}

function renderNotesList(filter) {
  if (filter !== undefined) activeNotesFilter = filter;

  const container = document.getElementById('notesList');
  if (!container) return;

  // Update filter tabs
  document.querySelectorAll('#notesFilters .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === activeNotesFilter);
  });

  const filtered = activeNotesFilter === 'all' ? state.notes :
    state.notes.filter(n => n.category === activeNotesFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="44" height="44" opacity=".2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
        <p>Nicio notiță în această categorie.</p>
        <button class="btn-primary" onclick="openNewNoteInline()" style="margin-top:10px">Creează o Notiță</button>
      </div>`;
    return;
  }

  const catColors = { watchtower:'#4f8ef7', workbook:'#10c9a0', bible:'#a855f7', general:'#f97b4f', fieldservice:'#ec4899' };
  const catLabels = { watchtower:'TV', workbook:'VCP', bible:'📖', general:'📝', fieldservice:'🧑‍🤝‍🧑' };

  const sorted = [...filtered].sort((a,b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = sorted.map(note => `
    <div class="note-list-item ${editingNoteId === note.id ? 'active' : ''}" onclick="openNoteCard('${note.id}')">
      <div class="note-list-item-header">
        <span class="note-list-item-title">${escHtml(note.title)}</span>
        <span class="note-list-item-badge" style="background:${catColors[note.category]}22;color:${catColors[note.category]}">
          ${catLabels[note.category] || '📝'}
        </span>
      </div>
      <p class="note-list-item-preview">${escHtml((note.content || 'Fără conținut').substring(0, 80))}${note.content && note.content.length > 80 ? '…' : ''}</p>
      <span class="note-list-item-date">${formatDate(note.date)}</span>
    </div>
  `).join('');
}


// ============================================
