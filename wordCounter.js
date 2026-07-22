'use strict';

// ===== CALCULATOR CUVINTE =====
// Numără doar cuvinte reale (litere/cifre, inclusiv diacritice românești ă â î ș ț).
// Virgula, punctul și alte semne de punctuație NU sunt numărate ca cuvinte separate.
function countOnlyWords(text) {
  if (!text) return 0;

  return text
    .trim()
    .split(/\s+/)
    .filter(token => /[\p{L}\p{N}]/u.test(token))
    .length;
}

// Estimează durata de vorbire pe baza numărului de cuvinte (ritm mediu ~120 cuvinte/minut).
// Rezultatul nu scade niciodată sub 1 minut dacă există cel puțin un cuvânt.
const SPEAKING_WORDS_PER_MINUTE = 120;
function estimateSpeakingMinutes(wordCount) {
  if (!wordCount) return 0;
  return Math.max(1, Math.round(wordCount / SPEAKING_WORDS_PER_MINUTE));
}

function formatWordCounterText(wordCount) {
  const minutes = estimateSpeakingMinutes(wordCount);
  return minutes ? `Cuvinte: ${wordCount} · ~${minutes} min` : `Cuvinte: ${wordCount}`;
}

// Mărește automat înălțimea unui textarea în funcție de câte cuvinte/rânduri
// conține, ca textul scris să rămână mereu vizibil, fără scroll intern.
// Nu micșorează niciodată sub min-height-ul definit în CSS.
function autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function updateWordCounters() {
  const talkNotes = document.getElementById('talk-notes');
  const talkCounter = document.getElementById('talkWordCounter');

  if (talkNotes && talkCounter) {
    talkCounter.textContent = formatWordCounterText(countOnlyWords(talkNotes.value));
    autoGrowTextarea(talkNotes);
  }

  const discursNotes = document.getElementById('discursNote');
  const discursCounter = document.getElementById('discursWordCounter');

  if (discursNotes && discursCounter) {
    discursCounter.textContent = formatWordCounterText(countOnlyWords(discursNotes.value));
    autoGrowTextarea(discursNotes);
  }
}

