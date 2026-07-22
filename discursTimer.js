'use strict';

// ============================================
// DISCURS BIBLIC MODAL + TIMER 30 MIN
// ============================================
const DEFAULT_DISCURS_SECTIONS = [
  { title: "ÎNȚELEPCIUNEA SE RECUNOAȘTE DUPĂ LUCRĂRILE EI", duration: 3 },
  { title: "ÎNȚELEPCIUNEA DIVINĂ LE ADUCE FOLOASE TINERILOR", duration: 5 },
  { title: "ÎNȚELEPCIUNEA DIVINĂ LE ADUCE FOLOASE CELOR CĂSĂTORIȚI", duration: 5 },
  { title: "ÎNȚELEPCIUNEA DIVINĂ NE ADUCE FOLOASE CÂND NE CONFRUNTĂM CU PROBLEME", duration: 15 },
  { title: "IEHOVA NE VA AJUTA SĂ DOBÂNDIM ȘI SĂ MANIFESTĂM ÎNȚELEPCIUNE", duration: 2 },
];

let discursTimerInterval = null;
let discursTimerElapsedSeconds = 0;
let discursTimerRunning = false;
let discursTimerFinished = false;
let discursCurrentSectionIndex = 0;
let discursLastAnnouncedSectionIndex = -1;
let discursAlertTimeout = null;

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function getDiscursSections(source) {
  const sections = Array.isArray(source) && source.length ? source : DEFAULT_DISCURS_SECTIONS;
  return sections.map(section => ({
    title: String(section.title || '').trim() || 'Subtitlu fără titlu',
    duration: Math.max(1, Number(section.duration) || 1),
  }));
}

function getCurrentDiscursSections() {
  return getDiscursSections(state.discursDraft?.sections);
}

function getDiscursTotalSeconds() {
  return getCurrentDiscursSections().reduce((sum, section) => sum + section.duration * 60, 0);
}

function getDiscursSectionInfo(elapsedSeconds = discursTimerElapsedSeconds) {
  const sections = getCurrentDiscursSections();
  let cursor = 0;

  for (let index = 0; index < sections.length; index++) {
    const durationSeconds = sections[index].duration * 60;
    const sectionEnd = cursor + durationSeconds;
    if (elapsedSeconds < sectionEnd || index === sections.length - 1) {
      return {
        index,
        section: sections[index],
        sectionStart: cursor,
        sectionEnd,
        remaining: Math.max(0, sectionEnd - elapsedSeconds),
      };
    }
    cursor = sectionEnd;
  }

  return { index: 0, section: sections[0], sectionStart: 0, sectionEnd: sections[0].duration * 60, remaining: sections[0].duration * 60 };
}

function formatTimerSeconds(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const ss = String(safeSeconds % 60).padStart(2, '0');
  return mm + ':' + ss;
}

function buildDiscursDraftFromForm() {
  const data = document.getElementById('discursData')?.value || getTodayISO();
  return {
    id: state.discursDraft?.id || null,
    data,
    titlu: document.getElementById('discursTitlu')?.value || '',
    verset: document.getElementById('discursVerset')?.value || '',
    note: document.getElementById('discursNote')?.value || '',
    sections: getCurrentDiscursSections(),
  };
}

function rememberDiscursDraftForDay(draft) {
  if (!state.discursDraftsByDate) state.discursDraftsByDate = {};
  if (draft.data) state.discursDraftsByDate[draft.data] = { ...draft, sections: getDiscursSections(draft.sections) };
}

function getDiscursDraftForDate(date) {
  const draftsByDate = state.discursDraftsByDate || {};
  if (draftsByDate[date]) return { ...draftsByDate[date], sections: getDiscursSections(draftsByDate[date].sections) };
  if (state.discursDraft?.data === date) return { ...state.discursDraft, sections: getDiscursSections(state.discursDraft.sections) };
  return { data: date, sections: getDiscursSections() };
}

function renderDiscursPage() {
  const selectedDate = state.discursDraft?.data || getTodayISO();
  const draft = getDiscursDraftForDate(selectedDate);
  state.discursDraft = draft;

  const titluEl = document.getElementById('discursTitlu');
  const versetEl = document.getElementById('discursVerset');
  const noteEl = document.getElementById('discursNote');
  const dataEl = document.getElementById('discursData');
  const deleteBtn = document.getElementById('discursDeleteBtn');

  if (titluEl) titluEl.value = draft.titlu || '';
  if (versetEl) versetEl.value = draft.verset || '';
  if (noteEl) { noteEl.value = draft.note || ''; noteEl.disabled = false; }
  if (dataEl) dataEl.value = draft.data || selectedDate;
  if (deleteBtn) deleteBtn.style.display = (draft.titlu || draft.note) ? 'inline-flex' : 'none';

  renderDiscursSectionsEditor();
  discursTimerReset();
  renderDiscursTalksList();
  updateWordCounters();
}

function loadDiscursDraftForDate(date) {
  const currentDraft = buildDiscursDraftFromForm();
  rememberDiscursDraftForDay(currentDraft);
  state.discursDraft = getDiscursDraftForDate(date || getTodayISO());
  saveState();
  renderDiscursPage();
}

function saveDiscursDraft() {
  state.discursDraft = buildDiscursDraftFromForm();
  rememberDiscursDraftForDay(state.discursDraft);
  saveState();
}

function renderDiscursSectionsEditor() {
  const container = document.getElementById('discursSectionsList');
  if (!container) return;

  const sections = getCurrentDiscursSections();
  container.innerHTML = sections.map((section, index) => `
    <div class="discurs-section-row${index === discursCurrentSectionIndex ? ' active' : ''}">
      <span class="discurs-section-number">${index + 1}</span>
      <input type="text" class="form-input" value="${escHtml(section.title)}" aria-label="Titlul subtitlului ${index + 1}" oninput="updateDiscursSection(${index}, 'title', this.value)" />
      <input type="number" class="form-input discurs-section-duration" min="1" value="${section.duration}" aria-label="Durata subtitlului ${index + 1}" oninput="updateDiscursSection(${index}, 'duration', this.value)" />
      <span class="discurs-section-minutes">min</span>
      <button type="button" class="btn-ghost btn-sm" onclick="removeDiscursSection(${index})" title="Șterge subtitlul">Șterge</button>
    </div>
  `).join('');
}

function updateDiscursSection(index, field, value) {
  const sections = getCurrentDiscursSections();
  if (!sections[index]) return;
  sections[index][field] = field === 'duration' ? Math.max(1, Number(value) || 1) : value;
  state.discursDraft = { ...buildDiscursDraftFromForm(), sections };
  rememberDiscursDraftForDay(state.discursDraft);

  const totalSeconds = getDiscursTotalSeconds();
  if (discursTimerElapsedSeconds > totalSeconds) discursTimerElapsedSeconds = totalSeconds;
  saveState();
  discursTimerUpdateUI();
}

function addDiscursSection() {
  const sections = getCurrentDiscursSections();
  sections.push({ title: 'Subtitlu nou', duration: 1 });
  state.discursDraft = { ...buildDiscursDraftFromForm(), sections };
  rememberDiscursDraftForDay(state.discursDraft);
  saveState();
  renderDiscursSectionsEditor();
  discursTimerUpdateUI();
}

function removeDiscursSection(index) {
  const sections = getCurrentDiscursSections();
  if (sections.length <= 1) {
    showToast('Păstrează cel puțin un subtitlu.', 'error');
    return;
  }
  sections.splice(index, 1);
  state.discursDraft = { ...buildDiscursDraftFromForm(), sections };
  rememberDiscursDraftForDay(state.discursDraft);
  saveState();
  renderDiscursSectionsEditor();
  discursTimerReset();
}

function newDiscursTalk() {
  state.discursDraft = { data: getTodayISO(), sections: getDiscursSections() };
  rememberDiscursDraftForDay(state.discursDraft);
  saveState();
  renderDiscursPage();
  showToast('Cuvântare nouă. Completează formularul.', 'success');
}

function deleteDiscursDraft() {
  if (!confirm('Ștergi ciorna discursului? Datele nu pot fi recuperate.')) return;
  const date = document.getElementById('discursData')?.value || state.discursDraft?.data || getTodayISO();
  if (state.discursDraftsByDate) delete state.discursDraftsByDate[date];
  state.discursDraft = { data: date, sections: getDiscursSections() };
  saveState();
  renderDiscursPage();
  showToast('Ciorna a fost ștearsă.', 'success');
}

function saveDiscursNote() {
  const titlu = document.getElementById('discursTitlu')?.value?.trim();
  const verset = document.getElementById('discursVerset')?.value?.trim();
  const note = document.getElementById('discursNote')?.value?.trim();
  const data = document.getElementById('discursData')?.value || getTodayISO();
  const sections = getCurrentDiscursSections();

  if (!titlu) {
    showToast('Adaugă titlul discursului.', 'error');
    document.getElementById('discursTitlu')?.focus();
    return;
  }

  if (!state.discursTalks) state.discursTalks = [];

  const currentId = state.discursDraft?.id;
  let talk = currentId ? state.discursTalks.find(t => t.id === currentId) : null;

  if (talk) {
    talk.data = data;
    talk.titlu = titlu;
    talk.verset = verset;
    talk.note = note;
    talk.sections = sections;
  } else {
    talk = {
      id: Date.now().toString(),
      data, titlu, verset, note, sections,
    };
    state.discursTalks.push(talk);
  }

  state.discursDraft = { id: talk.id, data: talk.data, titlu: talk.titlu, verset: talk.verset, note: talk.note, sections: getDiscursSections(talk.sections) };
  rememberDiscursDraftForDay(state.discursDraft);

  markStudyDay();
  saveState();
  document.getElementById('discursDeleteBtn').style.display = 'inline-flex';
  renderDiscursTalksList();
  showToast('Cuvântarea a fost salvată!', 'success');
}

function loadDiscursTalk(id) {
  const talk = (state.discursTalks || []).find(t => t.id === id);
  if (!talk) return;
  state.discursDraft = { id: talk.id, data: talk.data, titlu: talk.titlu, verset: talk.verset, note: talk.note, sections: getDiscursSections(talk.sections) };
  rememberDiscursDraftForDay(state.discursDraft);
  saveState();
  renderDiscursPage();
  showToast('Cuvântarea a fost încărcată.', 'success');
}

function deleteDiscursTalk(id, evt) {
  if (evt) evt.stopPropagation();
  if (!confirm('Ștergi această cuvântare salvată? Datele nu pot fi recuperate.')) return;
  state.discursTalks = (state.discursTalks || []).filter(t => t.id !== id);
  if (state.discursDraft?.id === id) {
    state.discursDraft = { data: getTodayISO(), sections: getDiscursSections() };
  }
  saveState();
  renderDiscursPage();
  showToast('Cuvântarea a fost ștearsă.', 'success');
}

function renderDiscursTalksList() {
  const container = document.getElementById('discursTalksList');
  if (!container) return;

  const talks = state.discursTalks || [];

  if (talks.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Nicio cuvântare salvată încă.</div>';
    return;
  }

  const sorted = [...talks].sort((a, b) => new Date(b.data) - new Date(a.data));
  const currentId = state.discursDraft?.id;

  container.innerHTML = sorted.map(talk => {
    const minutes = getDiscursSections(talk.sections).reduce((sum, section) => sum + section.duration, 0);
    return `
      <div class="note-card${talk.id === currentId ? ' active' : ''}" onclick="loadDiscursTalk('${talk.id}')">
        <div class="note-card-header">
          <span class="note-card-title">📢 ${escHtml(talk.titlu)}</span>
          <span class="badge" style="background:#f97b4f22;color:#f97b4f;flex-shrink:0">${minutes} min</span>
        </div>
        ${talk.receivedFrom ? `<span class="badge" style="background:var(--accent-glow);color:var(--accent);margin-bottom:6px;display:inline-block">📥 Primit de la ${escHtml(talk.receivedFrom)}</span>` : ''}
        <p class="note-card-body">${escHtml(talk.note || 'Fără conținut')}</p>
        <div class="note-card-footer">
          <span class="note-card-date">${formatDate(talk.data)}</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn-ghost btn-sm" style="color:var(--accent)" onclick="event.stopPropagation();openSendModal('discurs30','${talk.id}')">📤 Trimite</button>
            <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="event.stopPropagation();deleteDiscursTalk('${talk.id}', event)">Șterge</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function discursTimerStart() {
  if (discursTimerFinished || discursTimerRunning) return;
  saveDiscursDraft();
  discursTimerRunning = true;
  document.getElementById('discursTimerStartBtn').style.display = 'none';
  document.getElementById('discursTimerPauseBtn').style.display = 'inline-flex';
  const ta = document.getElementById('discursNote');
  if (ta) ta.disabled = false;

  discursTimerInterval = setInterval(function() {
    const totalSeconds = getDiscursTotalSeconds();
    if (discursTimerElapsedSeconds >= totalSeconds) {
      discursTimerFinish();
      return;
    }

    const previousSectionIndex = getDiscursSectionInfo().index;
    discursTimerElapsedSeconds++;
    const currentSectionIndex = getDiscursSectionInfo().index;

    if (currentSectionIndex !== previousSectionIndex && currentSectionIndex > previousSectionIndex) {
      discursAnnounceSectionChange(previousSectionIndex, currentSectionIndex);
    }

    discursTimerUpdateUI();
  }, 1000);
}

function discursTimerPause() {
  if (!discursTimerRunning) return;
  clearInterval(discursTimerInterval);
  discursTimerRunning = false;
  var startBtn = document.getElementById('discursTimerStartBtn');
  if (startBtn) { startBtn.style.display = 'inline-flex'; startBtn.textContent = '▶ Continuă'; }
  document.getElementById('discursTimerPauseBtn').style.display = 'none';
}

function discursTimerStop() {
  clearInterval(discursTimerInterval);
  discursTimerRunning = false;
}

function discursTimerReset() {
  discursTimerStop();
  discursTimerElapsedSeconds = 0;
  discursTimerFinished = false;
  discursCurrentSectionIndex = 0;
  discursLastAnnouncedSectionIndex = -1;
  clearTimeout(discursAlertTimeout);

  var startBtn = document.getElementById('discursTimerStartBtn');
  var pauseBtn = document.getElementById('discursTimerPauseBtn');
  var ta = document.getElementById('discursNote');
  var blockedMsg = document.getElementById('discursBlockedMsg');
  var timerBar = document.getElementById('discursTimerBar');
  var alertEl = document.getElementById('discursTimerAlert');

  if (startBtn) { startBtn.style.display = 'inline-flex'; startBtn.textContent = '▶ Start'; }
  if (pauseBtn) pauseBtn.style.display = 'none';
  if (ta) ta.disabled = false;
  if (blockedMsg) blockedMsg.style.display = 'none';
  if (timerBar) { timerBar.classList.remove('timer-warning', 'timer-danger', 'timer-done', 'timer-section-alert'); }
  if (alertEl) { alertEl.textContent = ''; alertEl.classList.remove('show'); }

  discursTimerUpdateUI();
}

function discursTimerFinish() {
  clearInterval(discursTimerInterval);
  discursTimerRunning = false;
  discursTimerFinished = true;
  discursTimerElapsedSeconds = getDiscursTotalSeconds();

  var ta = document.getElementById('discursNote');
  if (ta) ta.disabled = true;

  var blockedMsg = document.getElementById('discursBlockedMsg');
  if (blockedMsg) blockedMsg.style.display = 'block';

  var timerBar = document.getElementById('discursTimerBar');
  if (timerBar) timerBar.classList.add('timer-done');

  var startBtn = document.getElementById('discursTimerStartBtn');
  var pauseBtn = document.getElementById('discursTimerPauseBtn');
  if (startBtn) startBtn.style.display = 'none';
  if (pauseBtn) pauseBtn.style.display = 'none';

  discursTimerUpdateUI();
  saveDiscursDraft();
  discursShowTimerAlert('Timpul total al cuvântării s-a încheiat.', true);
  showToast('Cele ' + Math.round(getDiscursTotalSeconds() / 60) + ' minute s-au încheiat! Discursul a fost blocat.', 'error');
}

function discursAnnounceSectionChange(previousIndex, currentIndex) {
  if (discursLastAnnouncedSectionIndex === currentIndex) return;
  discursLastAnnouncedSectionIndex = currentIndex;
  const sections = getCurrentDiscursSections();
  const finishedSection = sections[previousIndex];
  const nextSection = sections[currentIndex];
  const message = finishedSection
    ? `Subtitlul "${finishedSection.title}" s-a încheiat. Urmează: ${nextSection.title}.`
    : `Urmează: ${nextSection.title}.`;

  discursShowTimerAlert(message, true);
  showToast(message, 'success');
}

function discursShowTimerAlert(message, shouldVibrate) {
  const alertEl = document.getElementById('discursTimerAlert');
  const timerBar = document.getElementById('discursTimerBar');

  if (alertEl) {
    alertEl.textContent = message;
    alertEl.classList.add('show');
  }

  if (timerBar) {
    timerBar.classList.add('timer-section-alert');
    clearTimeout(discursAlertTimeout);
    discursAlertTimeout = setTimeout(function() {
      timerBar.classList.remove('timer-section-alert');
      if (alertEl) alertEl.classList.remove('show');
    }, 5000);
  }

  if (shouldVibrate && navigator.vibrate) navigator.vibrate([250, 120, 250]);
}

function discursTimerUpdateUI() {
  const totalSeconds = getDiscursTotalSeconds();
  const remaining = Math.max(0, totalSeconds - discursTimerElapsedSeconds);
  const pct = totalSeconds ? (discursTimerElapsedSeconds / totalSeconds) * 100 : 0;
  const sectionInfo = getDiscursSectionInfo();
  const previousSectionIndex = discursCurrentSectionIndex;
  discursCurrentSectionIndex = sectionInfo.index;

  const valEl = document.getElementById('discursTimerValue');
  const labelEl = document.getElementById('discursTimerLabel');
  const fillEl = document.getElementById('discursTimerFill');
  const iconEl = document.getElementById('discursTimerIcon');
  const timerBar = document.getElementById('discursTimerBar');
  const activeSectionEl = document.getElementById('discursActiveSection');
  const sectionTimeEl = document.getElementById('discursSectionTime');
  const totalProgressEl = document.getElementById('discursTotalProgress');

  if (valEl) valEl.textContent = formatTimerSeconds(remaining);
  if (labelEl) labelEl.textContent = 'rămas din ' + Math.round(totalSeconds / 60) + ' minute';
  if (fillEl) fillEl.style.width = Math.min(100, Math.max(0, pct)) + '%';
  if (activeSectionEl) activeSectionEl.textContent = 'Subtitlul activ: ' + sectionInfo.section.title;
  if (sectionTimeEl) sectionTimeEl.textContent = 'Timp subtitlu: ' + formatTimerSeconds(sectionInfo.remaining);
  if (totalProgressEl) totalProgressEl.textContent = Math.round(pct) + '%';

  if (previousSectionIndex !== discursCurrentSectionIndex) renderDiscursSectionsEditor();

  if (timerBar) {
    timerBar.classList.remove('timer-warning', 'timer-danger');
    if (sectionInfo.remaining <= 30 || remaining <= 120) {
      timerBar.classList.add('timer-danger');
      if (iconEl) iconEl.textContent = '●';
    } else if (sectionInfo.remaining <= 60 || remaining <= 300) {
      timerBar.classList.add('timer-warning');
      if (iconEl) iconEl.textContent = '●';
    } else {
      if (iconEl) iconEl.textContent = '⏱';
    }
  }
}


// ============================================
