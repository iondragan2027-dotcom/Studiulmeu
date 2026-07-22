'use strict';

// ============================================
// SEARCH
// ============================================
function handleSearch(query) {
  if (!query.trim()) return;
  query = query.toLowerCase();
  navigateTo('notes');
  const filtered = state.notes.filter(n =>
    n.title?.toLowerCase().includes(query) ||
    n.content?.toLowerCase().includes(query) ||
    (n.tags || []).some(t => t.toLowerCase().includes(query))
  );
  renderSearchResults(filtered, query);
}

function renderSearchResults(results, query) {
  const container = document.getElementById('notesList');
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = `<div class="empty-state full-width"><p>Niciun rezultat pentru „${escHtml(query)}".</p></div>`;
    return;
  }

  const catColors = { watchtower:'#4f8ef7', workbook:'#10c9a0', bible:'#a855f7', general:'#f97b4f' };
  container.innerHTML = results.map(note => `
    <div class="note-card" onclick="openNoteCard('${note.id}')">
      <div class="note-card-header">
        <span class="note-card-title">${highlight(note.title, query)}</span>
      </div>
      <p class="note-card-body">${highlight(note.content || '', query)}</p>
      <div class="note-card-footer">
        <span class="note-card-date">${formatDate(note.date)}</span>
      </div>
    </div>
  `).join('');
}

function highlight(text, query) {
  if (!query || !text) return escHtml(text || '');
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escHtml(text).replace(regex, '<mark style="background:var(--accent-glow);color:var(--accent);border-radius:2px">$1</mark>');
}

// ============================================
