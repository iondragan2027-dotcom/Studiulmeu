'use strict';

// ============================================
// WATCHTOWER STUDY
// ============================================
let wtParagraphs = [];
let editingParagraphIndex = null;

function addWtParagraph() {
  openParagraphModal();
}

function openParagraphEditor(index = null) {
  editingParagraphIndex = index;
  const editor = document.getElementById('wtParagraphEditor');
  if (!editor) return;

  if (index !== null && wtParagraphs[index]) {
    const p = wtParagraphs[index];
    document.getElementById('parNumber').value = p.number;
    document.getElementById('parVerse').value = p.verse;
    document.getElementById('parMain').value = p.main;
    document.getElementById('parAnswer').value = p.answer;
    document.getElementById('parNotes').value = p.notes;
    document.getElementById('wtParagraphEditorTitle').textContent = 'Editează Paragraf';
  } else {
    document.getElementById('parNumber').value = wtParagraphs.length + 1;
    document.getElementById('parVerse').value = '';
    document.getElementById('parMain').value = '';
    document.getElementById('parAnswer').value = '';
    document.getElementById('parNotes').value = '';
    document.getElementById('wtParagraphEditorTitle').textContent = 'Paragraf Nou';
  }

  // Reset AI suggestion panel
  const aiList = document.getElementById('aiSuggestionsList');
  if (aiList) {
    aiList.innerHTML = `
      <div class="ai-empty-state" style="font-size:0.8rem; color:var(--text-muted)">
        Scrie ideea principală în stânga, apoi apasă butonul pentru a primi sugestii.
      </div>
    `;
  }

  editor.style.display = 'block';
}

function openParagraphModal(index = null) {
  openParagraphEditor(index);
}

function closeParagraphEditor() {
  const editor = document.getElementById('wtParagraphEditor');
  if (editor) editor.style.display = 'none';
  editingParagraphIndex = null;
}

function closeParagraphModal() {
  closeParagraphEditor();
}

function saveParagraph() {
  const p = {
    number: parseInt(document.getElementById('parNumber').value) || wtParagraphs.length + 1,
    verse: document.getElementById('parVerse').value.trim(),
    main: document.getElementById('parMain').value.trim(),
    answer: document.getElementById('parAnswer').value.trim(),
    notes: document.getElementById('parNotes').value.trim(),
  };

  if (!p.answer && !p.main) {
    showToast('Adaugă cel puțin ideea principală sau răspunsul.', 'error');
    return;
  }

  if (editingParagraphIndex !== null) {
    wtParagraphs[editingParagraphIndex] = p;
  } else {
    wtParagraphs.push(p);
  }

  closeParagraphEditor();
  renderWtParagraphs();
  updateWtProgress();
  showToast('Paragraf salvat! ✅', 'success');
}

function renderWtParagraphs() {
  const container = document.getElementById('wtParagraphsList');
  if (!container) return;

  if (wtParagraphs.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Niciun paragraf adăugat. Apasă „+ Adaugă Paragraf".</div>';
    return;
  }

  container.innerHTML = wtParagraphs.map((p, i) => `
    <div class="paragraph-item">
      <div class="paragraph-item-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="paragraph-num">§ ${p.number}</span>
          ${p.verse ? `<span class="paragraph-verse">📖 ${escHtml(p.verse)}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          <button class="delete-btn" onclick="openParagraphModal(${i})" title="Editează">✏️</button>
          <button class="delete-btn" onclick="deleteParagraph(${i})" title="Șterge">🗑</button>
        </div>
      </div>
      ${p.main ? `<p class="paragraph-main">${escHtml(p.main)}</p>` : ''}
      ${p.answer ? `<p class="paragraph-answer">💬 ${escHtml(p.answer)}</p>` : ''}
      ${p.notes ? `<p class="paragraph-answer" style="opacity:.7;font-style:italic">📝 ${escHtml(p.notes)}</p>` : ''}
    </div>
  `).join('');
}

function deleteParagraph(index) {
  if (confirm('Ștergi acest paragraf?')) {
    wtParagraphs.splice(index, 1);
    renderWtParagraphs();
    updateWtProgress();
  }
}

function updateWtProgress() {
  const needed = parseInt(document.getElementById('wt-paragraphs')?.value) || 10;
  const pct = Math.min(100, Math.round((wtParagraphs.length / needed) * 100));
  const el = document.getElementById('wtProgress');
  const bar = document.getElementById('wtProgressBar');
  if (el) el.textContent = `${pct}%`;
  if (bar) bar.style.width = `${pct}%`;
}

function autoSynthesize() {
  if (wtParagraphs.length === 0) {
    showToast('Adaugă mai întâi câteva paragrafe.', 'error');
    return;
  }

  const title = document.getElementById('wt-title')?.value || 'Articolul';
  const baseVerse = document.getElementById('wt-base-verse')?.value || '';

  let synthesis = `📋 Sinteză: "${title}"\n\n`;
  if (baseVerse) synthesis += `📖 Verset de bază: ${baseVerse}\n\n`;
  synthesis += `Idei principale studiate:\n`;

  wtParagraphs.forEach(p => {
    if (p.main) synthesis += `• ${p.main}\n`;
  });

  synthesis += `\nRăspunsuri pregătite:\n`;
  wtParagraphs.forEach(p => {
    if (p.answer) synthesis += `§${p.number}: ${p.answer}\n\n`;
  });

  synthesis += `\n✨ Aplicare personală: [Completează cu gândurile tale...]`;

  document.getElementById('wt-synthesis').value = synthesis;
  showToast('Sinteză generată! ✨', 'success');
}

function saveWtStudy() {
  const title = document.getElementById('wt-title')?.value?.trim();
  if (!title) {
    showToast('Adaugă titlul articolului.', 'error');
    document.getElementById('wt-title')?.focus();
    return;
  }

  const studyId = Date.now().toString();
  const study = {
    id: studyId,
    title,
    date: document.getElementById('wt-date')?.value || new Date().toISOString().split('T')[0],
    edition: document.getElementById('wt-edition')?.value || '',
    paragraphsRange: document.getElementById('wt-paragraphs')?.value || '',
    baseVerse: document.getElementById('wt-base-verse')?.value || '',
    paragraphs: [...wtParagraphs],
    synthesis: document.getElementById('wt-synthesis')?.value || '',
    progress: Math.min(100, Math.round((wtParagraphs.length / 10) * 100)),
  };

  state.wtStudies.push(study);
  markStudyDay();
  saveState();
  showToast('Studiu Turnul de Veghe salvat!', 'success');

  // Add auto-note
  state.notes.push({
    id: studyId + '_wt',
    title: `TV: ${title}`,
    content: study.synthesis || `Studiu pregătit cu ${study.paragraphs.length} paragrafe.`,
    category: 'watchtower',
    tags: ['turnul-de-veghe'],
    date: study.date,
  });
  saveState();
}

// ============================================
// WATCHTOWER PARAGRAPH AI ASSISTANT
// ============================================
function generateParagraphSuggestions() {
  const mainInput = document.getElementById('parMain');
  const verseInput = document.getElementById('parVerse');
  const mainText = mainInput ? mainInput.value.trim() : '';
  const verseText = verseInput ? verseInput.value.trim() : '';

  const aiList = document.getElementById('aiSuggestionsList');
  if (!aiList) return;

  if (!mainText) {
    showToast('Introduceți o idee principală pentru a genera sugestii.', 'error');
    mainInput?.focus();
    return;
  }

  // Show loading indicator
  aiList.innerHTML = `
    <div style="text-align:center;padding:30px;color:var(--text-secondary);font-size:0.85rem">
      <span style="display:inline-block;animation:spin 1s linear infinite;margin-right:8px">✨</span>
      Se generează sugestiile de comentarii...
    </div>
  `;

  // Simulate AI delay for realistic feel
  setTimeout(() => {
    const suggestions = generateTemplates(mainText, verseText);
    
    aiList.innerHTML = suggestions.map((s, idx) => `
      <div class="ai-suggestion-card">
        <span class="ai-suggestion-tag">${s.type}</span>
        <p class="ai-suggestion-text" id="ai-sug-${idx}">${escHtml(s.text)}</p>
        <div class="ai-suggestion-actions">
          <button type="button" class="btn-xs btn-ghost" onclick="useAiSuggestion(${idx}, 'notes')">📋 La Notițe</button>
          <button type="button" class="btn-xs btn-primary" onclick="useAiSuggestion(${idx}, 'answer')">✍️ La Răspuns</button>
        </div>
      </div>
    `).join('');
    
    showToast('Sugestii AI generate cu succes! ✨', 'success');
  }, 600);
}

function generateTemplates(mainText, verseText) {
  let cleanedMain = mainText.charAt(0).toLowerCase() + mainText.slice(1);
  if (cleanedMain.endsWith('.')) {
    cleanedMain = cleanedMain.slice(0, -1);
  }

  const verseRefIntro = verseText ? `, așa cum reiese și din ${verseText},` : '';
  const verseRefLink = verseText ? ` Acest verset (${verseText}) ne îndeamnă să analizăm modul în care ne manifestăm credința în viața de zi cu zi.` : '';

  const s1 = {
    type: 'Scurt & Direct 💬',
    text: `Acest paragraf ne arată că ${cleanedMain}.${verseText ? ` Din versetul citat (${verseText}) înțelegem că acest aspect este esențial pentru noi.` : ''}`
  };

  const s2 = {
    type: 'Aprofundat & Explicativ 📚',
    text: `Ideea principală a paragrafului subliniază că ${cleanedMain}.${verseRefIntro ? ` Faptul acesta${verseRefIntro} arată că grija spirituală este un factor cheie în progresul nostru.` : ''} Înțelegerea profundă a acestui aspect ne ajută să rămânem fideli și să acționăm în armonie cu îndrumarea oferită.`
  };

  const s3 = {
    type: 'Aplicare practică ❤️',
    text: `Personal, consider că ${cleanedMain}.${verseRefLink} Putem pune în practică această idee fiind mai atenți la nevoile congregației și sprijinindu-ne reciproc în încercări.`
  };

  return [s1, s2, s3];
}

function useAiSuggestion(idx, field) {
  const textEl = document.getElementById(`ai-sug-${idx}`);
  if (!textEl) return;
  const suggestionText = textEl.textContent;

  if (field === 'answer') {
    const answerInput = document.getElementById('parAnswer');
    if (answerInput) {
      answerInput.value = suggestionText;
      showToast('Sugestia a fost setată ca răspuns! ✍️', 'success');
    }
  } else if (field === 'notes') {
    const notesInput = document.getElementById('parNotes');
    if (notesInput) {
      if (notesInput.value.trim()) {
        notesInput.value += '\n\n' + suggestionText;
      } else {
        notesInput.value = suggestionText;
      }
      showToast('Sugestia a fost adăugată la notițe! 📋', 'success');
    }
  }
}

// ============================================
