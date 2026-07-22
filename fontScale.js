'use strict';

// ============================================
// MĂRIRE TEXT GLOBAL (font scale 1–24px)
// ============================================
function applyFontScale(px) {
  document.documentElement.style.fontSize = px + 'px';
  const val = document.getElementById('fontScaleValue');
  if (val) val.textContent = px;
  localStorage.setItem('studiuMeu_fontScale', px);
}

function changeFontScale(delta) {
  const current = parseInt(localStorage.getItem('studiuMeu_fontScale')) || 14;
  const next = Math.min(24, Math.max(10, current + delta));
  applyFontScale(next);
}

function initFontScale() {
  const saved = parseInt(localStorage.getItem('studiuMeu_fontScale')) || 14;
  applyFontScale(saved);
}

// ============================================
// ============================================
// MĂRIRE TEXT ÎN CUVÂNTĂRI (Discurs Biblic 30 min & Cuvântare 5 min)
// Control local, independent de mărirea generală – interval 10–30px
// ============================================
function applyNoteFontSize(textareaId, valueId, storageKey, px) {
  const ta = document.getElementById(textareaId);
  const val = document.getElementById(valueId);
  if (ta) ta.style.fontSize = px + 'px';
  if (val) val.textContent = px;
  localStorage.setItem(storageKey, px);
}

function changeNoteFontSize(textareaId, valueId, storageKey, delta) {
  const current = parseInt(localStorage.getItem(storageKey)) || 14;
  const next = Math.min(30, Math.max(10, current + delta));
  applyNoteFontSize(textareaId, valueId, storageKey, next);
}

function changeDiscursNoteFontSize(delta) {
  changeNoteFontSize('discursNote', 'discursNoteFontValue', 'studiuMeu_discursNoteSize', delta);
}

function changeTalkNoteFontSize(delta) {
  changeNoteFontSize('talk-notes', 'talkNoteFontValue', 'studiuMeu_talkNoteSize', delta);
}

function initNoteFontSizes() {
  const discursSize = parseInt(localStorage.getItem('studiuMeu_discursNoteSize')) || 14;
  applyNoteFontSize('discursNote', 'discursNoteFontValue', 'studiuMeu_discursNoteSize', discursSize);
  const talkSize = parseInt(localStorage.getItem('studiuMeu_talkNoteSize')) || 14;
  applyNoteFontSize('talk-notes', 'talkNoteFontValue', 'studiuMeu_talkNoteSize', talkSize);
}

