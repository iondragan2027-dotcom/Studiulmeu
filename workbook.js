'use strict';

// ============================================
// WORKBOOK
// ============================================
function addWbMinistryItem() {
  const list = document.getElementById('wbMinistryList');
  const item = document.createElement('div');
  item.className = 'wb-item';
  item.innerHTML = `
    <div class="form-row">
      <div class="form-group"><label>Subiect / Tip</label><input type="text" class="form-input" placeholder="ex: Prezentarea inițială"/></div>
      <div class="form-group"><label>Student / Asistent</label><input type="text" class="form-input" placeholder="Nume"/></div>
    </div>
    <div class="form-group"><label>Notițe pregătire</label><textarea class="form-textarea small" placeholder="Ce vei spune, versete de folosit..."></textarea></div>
  `;
  list.appendChild(item);
}

function saveWorkbook() {
  const week = document.getElementById('wb-week')?.value?.trim();
  if (!week) {
    showToast('Adaugă săptămâna.', 'error');
    document.getElementById('wb-week')?.focus();
    return;
  }

  const wbId = Date.now().toString();
  const wb = {
    id: wbId,
    week,
    date: document.getElementById('wb-date')?.value || new Date().toISOString().split('T')[0],
    reading: document.getElementById('wb-reading')?.value || '',
    progress: 60,
  };

  state.workbooks.push(wb);
  markStudyDay();
  saveState();
  showToast('Pregătire Viața creștină și predicarea salvată! 📋', 'success');

  state.notes.push({
    id: wbId + '_wb',
    title: `Caiet: ${week}`,
    content: `Pregătire pentru săptămâna ${week}. Lectură: ${wb.reading}`,
    category: 'workbook',
    tags: ['caiet-lucru'],
    date: wb.date,
  });
  saveState();
}

function saveTalkDraft() {
  if (!state.talkDraft) state.talkDraft = {};
  state.talkDraft = {
    id: state.talkDraft.id || null,
    subject: document.getElementById('talk-subject')?.value || '',
    duration: document.getElementById('talk-duration')?.value || '5 minute',
    notes: document.getElementById('talk-notes')?.value || '',
  };
  saveState();
}

function loadTalkDraft() {
  const draft = state.talkDraft || {};
  const subject = document.getElementById('talk-subject');
  const duration = document.getElementById('talk-duration');
  const notes = document.getElementById('talk-notes');

  if (subject) subject.value = draft.subject || '';
  if (duration) duration.value = draft.duration || '5 minute';
  if (notes) notes.value = draft.notes || '';
}

function renderTalk5Page() {
  loadTalkDraft();
  const deleteBtn = document.getElementById('talk5DeleteBtn');
  if (deleteBtn) deleteBtn.style.display = state.talkDraft?.id ? 'inline-flex' : 'none';
  renderTalk5TalksList();
  updateWordCounters();
}

function newTalk5() {
  state.talkDraft = { id: null, subject: '', duration: '5 minute', notes: '' };
  saveState();
  renderTalk5Page();
  showToast('Cuvântare nouă. Completează formularul.', 'success');
}

function saveTalk5Note() {
  const subject = document.getElementById('talk-subject')?.value?.trim();
  const duration = document.getElementById('talk-duration')?.value?.trim() || '5 minute';
  const notes = document.getElementById('talk-notes')?.value?.trim();

  if (!subject) {
    showToast('Adaugă subiectul cuvântării.', 'error');
    document.getElementById('talk-subject')?.focus();
    return;
  }

  if (!state.talk5Talks) state.talk5Talks = [];

  const currentId = state.talkDraft?.id;
  let talk = currentId ? state.talk5Talks.find(t => t.id === currentId) : null;

  if (talk) {
    talk.subject = subject;
    talk.duration = duration;
    talk.notes = notes;
    talk.date = new Date().toISOString().split('T')[0];
  } else {
    talk = {
      id: Date.now().toString(),
      subject, duration, notes,
      date: new Date().toISOString().split('T')[0],
    };
    state.talk5Talks.push(talk);
  }

  state.talkDraft = { id: talk.id, subject: talk.subject, duration: talk.duration, notes: talk.notes };

  markStudyDay();
  saveState();
  const deleteBtn = document.getElementById('talk5DeleteBtn');
  if (deleteBtn) deleteBtn.style.display = 'inline-flex';
  renderTalk5TalksList();
  showToast('Cuvântarea a fost salvată!', 'success');
}

function loadTalk5Talk(id) {
  const talk = (state.talk5Talks || []).find(t => t.id === id);
  if (!talk) return;
  state.talkDraft = { id: talk.id, subject: talk.subject, duration: talk.duration, notes: talk.notes };
  saveState();
  renderTalk5Page();
  showToast('Cuvântarea a fost încărcată.', 'success');
}

function deleteTalk5Draft() {
  if (!confirm('Ștergi ciorna cuvântării? Datele nu pot fi recuperate.')) return;
  const id = state.talkDraft?.id;
  if (id) state.talk5Talks = (state.talk5Talks || []).filter(t => t.id !== id);
  state.talkDraft = { id: null, subject: '', duration: '5 minute', notes: '' };
  saveState();
  renderTalk5Page();
  showToast('Ciorna a fost ștearsă.', 'success');
}

function deleteTalk5Talk(id, evt) {
  if (evt) evt.stopPropagation();
  if (!confirm('Ștergi această cuvântare salvată? Datele nu pot fi recuperate.')) return;
  state.talk5Talks = (state.talk5Talks || []).filter(t => t.id !== id);
  if (state.talkDraft?.id === id) {
    state.talkDraft = { id: null, subject: '', duration: '5 minute', notes: '' };
  }
  saveState();
  renderTalk5Page();
  showToast('Cuvântarea a fost ștearsă.', 'success');
}

function renderTalk5TalksList() {
  const container = document.getElementById('talk5TalksList');
  if (!container) return;

  const talks = state.talk5Talks || [];

  if (talks.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Nicio cuvântare salvată încă.</div>';
    return;
  }

  const sorted = [...talks].sort((a, b) => new Date(b.date) - new Date(a.date));
  const currentId = state.talkDraft?.id;

  container.innerHTML = sorted.map(talk => `
    <div class="note-card${talk.id === currentId ? ' active' : ''}" onclick="loadTalk5Talk('${talk.id}')">
      <div class="note-card-header">
        <span class="note-card-title">🎤 ${escHtml(talk.subject)}</span>
        <span class="badge" style="background:#f97b4f22;color:#f97b4f;flex-shrink:0">${escHtml(talk.duration || '5 minute')}</span>
      </div>
      ${talk.receivedFrom ? `<span class="badge" style="background:var(--accent-glow);color:var(--accent);margin-bottom:6px;display:inline-block">📥 Primit de la ${escHtml(talk.receivedFrom)}</span>` : ''}
      <p class="note-card-body">${escHtml(talk.notes || 'Fără conținut')}</p>
      <div class="note-card-footer">
        <span class="note-card-date">${formatDate(talk.date)}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-ghost btn-sm" style="color:var(--accent)" onclick="event.stopPropagation();openSendModal('talk5','${talk.id}')">📤 Trimite</button>
          <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="event.stopPropagation();deleteTalk5Talk('${talk.id}', event)">Șterge</button>
        </div>
      </div>
    </div>
  `).join('');
}

let generatedTalkOutlineText = '';

function toggleTalkAiPanel() {
  const panel = document.getElementById('talkAiPanel');
  if (!panel) return;
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';
}

function generateTalkOutline(style) {
  const subjectInput = document.getElementById('talk-subject');
  const subject = subjectInput ? subjectInput.value.trim() : '';
  const sugDiv = document.getElementById('talkAiSuggestions');
  const useBtn = document.getElementById('useTalkOutlineBtn');

  if (!subject) {
    showToast('Introduceți mai întâi subiectul cuvântării.', 'error');
    subjectInput?.focus();
    return;
  }

  sugDiv.style.display = 'block';
  sugDiv.innerHTML = `⏳ Se generează schița...`;
  useBtn.style.display = 'none';

  setTimeout(() => {
    let outline = '';
    const cleanSubject = subject.charAt(0).toUpperCase() + subject.slice(1);

    if (style === 'explicativ') {
      outline = `📌 DISCURS EXPLICATIV: "${cleanSubject}"\n\n` +
                `1. INTRODUCERE (Atenție & Interes):\n` +
                `   - De ce este important subiectul "${cleanSubject}" astăzi?\n` +
                `   - Definirea termenilor principali.\n\n` +
                `2. CORPUL CUVÂNTĂRII (Explicații cheie):\n` +
                `   - Ce ne învață Biblia în mod direct despre acest aspect?\n` +
                `   - Dovezi scripturale și principii de bază.\n\n` +
                `3. CONCLUZIE:\n` +
                `   - Rezumatul punctelor principale.\n` +
                `   - Îndemn final bazat pe adevărul analizat.`;
    } else if (style === 'practic') {
      outline = `📌 DISCURS PRACTIC: "${cleanSubject}"\n\n` +
                `1. INTRODUCERE:\n` +
                `   - Impactul subiectului "${cleanSubject}" în activitățile zilnice.\n\n` +
                `2. CORPUL CUVÂNTĂRII (Aplicare practică):\n` +
                `   - Pasul 1: Cum implementăm acest lucru în familie sau la locul de muncă?\n` +
                `   - Pasul 2: Obstacole comune și cum le putem depăși cu ajutorul spiritului sfânt.\n` +
                `   - Ilustrare sugestivă potrivită pentru ilustrarea ideii.\n\n` +
                `3. CONCLUZIE:\n` +
                `   - O acțiune clară pe care o putem face în săptămâna următoare.`;
    } else {
      outline = `📌 DISCURS ÎNCURAJATOR: "${cleanSubject}"\n\n` +
                `1. INTRODUCERE:\n` +
                `   - Sentimentele noastre legate de "${cleanSubject}" în momente dificile.\n\n` +
                `2. CORPUL CUVÂNTĂRII (Consolare și Sprijin):\n` +
                `   - Promisiunile lui Iehova care ne dau putere.\n` +
                `   - Exemple biblice de credință (cum au perseverat alții).\n` +
                `   - Cum ne sprijină congregația creștină.\n\n` +
                `3. CONCLUZIE:\n` +
                `   - Un mesaj cald de speranță și încredere în viitor.`;
    }

    generatedTalkOutlineText = outline;
    sugDiv.innerHTML = outline.replace(/\n/g, '<br>');
    useBtn.style.display = 'inline-block';
    showToast('Schiță AI generată! ✨', 'success');
  }, 500);
}

function applyTalkOutline() {
  const notesTextarea = document.getElementById('talk-notes');
  if (notesTextarea && generatedTalkOutlineText) {
    if (notesTextarea.value.trim()) {
      notesTextarea.value += '\n\n' + generatedTalkOutlineText;
    } else {
      notesTextarea.value = generatedTalkOutlineText;
    }
    saveTalkDraft();
    updateWordCounters();
    showToast('Schița a fost aplicată în notițe! ✍️', 'success');
  }
}

// ============================================
