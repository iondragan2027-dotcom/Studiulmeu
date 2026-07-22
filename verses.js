'use strict';

// ============================================
// BIBLE STUDY
// ============================================
function addVerseEntry() {
  saveVerse();
}

function saveVerse() {
  const ref = document.getElementById('verse-ref-input')?.value?.trim();
  const text = document.getElementById('verse-text-input')?.value?.trim();

  if (!ref) {
    showToast('Adaugă referința biblică.', 'error');
    document.getElementById('verse-ref-input')?.focus();
    return;
  }

  const verse = {
    id: Date.now().toString(),
    ref,
    text,
    category: document.getElementById('verse-category')?.value || 'Altele',
    meditation: document.getElementById('verse-meditation')?.value?.trim() || '',
    date: new Date().toISOString().split('T')[0],
  };

  state.verses.push(verse);
  markStudyDay();
  saveState();
  showToast('Verset salvat! 📖', 'success');

  // Clear form
  ['verse-ref-input', 'verse-text-input', 'verse-meditation'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  renderVersesList('all');
}

let activeVerseFilter = 'all';

function renderVersesList(filter) {
  activeVerseFilter = filter;
  const container = document.getElementById('versesList');
  if (!container) return;

  // Update filter tabs
  document.querySelectorAll('#verseFilters .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  const filtered = filter === 'all' ? state.verses :
    state.verses.filter(v => v.category === filter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" opacity=".3"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
        <p>Niciun verset în această categorie.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(v => `
    <div class="verse-entry">
      <div class="verse-entry-header">
        <span class="verse-entry-ref">📖 ${escHtml(v.ref)}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="verse-entry-cat">${escHtml(v.category)}</span>
          <button class="delete-btn" onclick="deleteVerse('${v.id}')" title="Șterge">🗑</button>
        </div>
      </div>
      ${v.text ? `<p class="verse-entry-text">"${escHtml(v.text)}"</p>` : ''}
      ${v.meditation ? `<p class="verse-entry-meditation">💭 ${escHtml(v.meditation)}</p>` : ''}
      <small style="color:var(--text-muted);font-size:0.75rem">${formatDate(v.date)}</small>
    </div>
  `).join('');
}

function deleteVerse(id) {
  if (confirm('Ștergi acest verset?')) {
    state.verses = state.verses.filter(v => v.id !== id);
    saveState();
    renderVersesList(activeVerseFilter);
    showToast('Verset șters.', 'success');
  }
}

// ============================================
