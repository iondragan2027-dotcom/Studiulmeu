'use strict';

// ============================================
// FIELD SERVICE (modul principal)
// Conține doar inițializarea/evenimentele principale ale secțiunii
// de Serviciu de Teren. Logica este împărțită în:
//   - fieldServiceUtils.js    → constante și helpere generale
//   - fieldServiceStorage.js  → citire/scriere date + persistență
//   - fieldServiceUI.js       → generare HTML / actualizări interfață
//   - fieldServiceSuggest.js  → algoritmul de sugestie a programului
// Toate sunt încărcate ca scripturi globale clasice (fără bundler),
// în ordinea din index.html, imediat înainte de acest fișier.
// ============================================

// ============================================
// NOTIȚE SERVICIU DE TEREN
// Eveniment principal: salvarea unei notițe din formularul dedicat.
// Randarea listei este delegată către fieldServiceUI.renderFieldServiceList().
// ============================================
function saveFieldServiceNote() {
  const fsDate = document.getElementById('fs-date')?.value || new Date().toISOString().split('T')[0];
  const fsTitle = document.getElementById('fs-title')?.value?.trim();
  const fsContent = document.getElementById('fs-content')?.value?.trim();

  if (!fsTitle) {
    showToast('Adaugă un titlu sau subiect pentru întrunire.', 'error');
    document.getElementById('fs-title')?.focus();
    return;
  }

  const note = {
    id: Date.now().toString(),
    title: fsTitle,
    content: fsContent || 'Fără conținut',
    category: 'fieldservice',
    tags: ['serviciu-teren'],
    date: fsDate,
  };

  state.notes.push(note);
  markStudyDay();
  saveState();
  showToast('Notiță serviciu de teren salvată! 🧑‍🤝‍🧑', 'success');

  // Clear inputs
  const titleInput = document.getElementById('fs-title');
  const contentInput = document.getElementById('fs-content');
  if (titleInput) titleInput.value = '';
  if (contentInput) contentInput.value = '';

  renderFieldServiceList();
}

function deleteFieldServiceNote(id) {
  if (confirm('Ștergi această notiță?')) {
    state.notes = state.notes.filter(n => n.id !== id);
    saveState();
    renderFieldServiceList();
    showToast('Notiță ștearsă.', 'success');
  }
}
