'use strict';

// ============================================
// CUVÂNTARE - TIMER 5 MIN
// ============================================
let talkTimerInterval = null;
let talkTimerSeconds = 300;
let talkTimerRunning = false;
let talkTimerFinished = false;

function talkTimerStart() {
  if (talkTimerFinished || talkTimerRunning) return;
  talkTimerRunning = true;
  document.getElementById('talkTimerStartBtn').style.display = 'none';
  document.getElementById('talkTimerPauseBtn').style.display = 'inline-flex';

  talkTimerInterval = setInterval(function() {
    if (talkTimerSeconds <= 0) {
      talkTimerFinish();
      return;
    }
    talkTimerSeconds--;
    talkTimerUpdateUI();
  }, 1000);
}

function talkTimerPause() {
  if (!talkTimerRunning) return;
  clearInterval(talkTimerInterval);
  talkTimerRunning = false;
  var startBtn = document.getElementById('talkTimerStartBtn');
  if (startBtn) { startBtn.style.display = 'inline-flex'; startBtn.textContent = '▶ Continuă'; }
  document.getElementById('talkTimerPauseBtn').style.display = 'none';
}

function talkTimerStop() {
  clearInterval(talkTimerInterval);
  talkTimerRunning = false;
}

function talkTimerReset() {
  talkTimerStop();
  talkTimerSeconds = 300;
  talkTimerFinished = false;

  var startBtn = document.getElementById('talkTimerStartBtn');
  var pauseBtn = document.getElementById('talkTimerPauseBtn');
  var timerBar = document.getElementById('talkTimerBar');

  if (startBtn) { startBtn.style.display = 'inline-flex'; startBtn.textContent = '▶ Start'; }
  if (pauseBtn) pauseBtn.style.display = 'none';
  if (timerBar) { timerBar.classList.remove('timer-warning', 'timer-danger', 'timer-done'); }

  var labelEl = document.getElementById('talkTimerLabel');
  if (labelEl) labelEl.textContent = 'din 5 minute';

  talkTimerUpdateUI();
}

function talkTimerFinish() {
  clearInterval(talkTimerInterval);
  talkTimerRunning = false;
  talkTimerFinished = true;
  talkTimerSeconds = 0;

  var timerBar = document.getElementById('talkTimerBar');
  if (timerBar) timerBar.classList.add('timer-done');

  var startBtn = document.getElementById('talkTimerStartBtn');
  var pauseBtn = document.getElementById('talkTimerPauseBtn');
  if (startBtn) startBtn.style.display = 'none';
  if (pauseBtn) pauseBtn.style.display = 'none';

  document.getElementById('talkTimerValue').textContent = '00:00';
  document.getElementById('talkTimerIcon').textContent = '🔴';
  document.getElementById('talkTimerLabel').textContent = 'Timp expirat!';
  document.getElementById('talkTimerFill').style.width = '0%';

  showToast('⏰ Cele 5 minute pentru cuvântare s-au încheiat!', 'error');
}

function talkTimerUpdateUI() {
  var total = 300;
  var remaining = talkTimerSeconds;
  var pct = (remaining / total) * 100;

  var mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  var ss = String(remaining % 60).padStart(2, '0');

  var valEl = document.getElementById('talkTimerValue');
  var fillEl = document.getElementById('talkTimerFill');
  var iconEl = document.getElementById('talkTimerIcon');
  var timerBar = document.getElementById('talkTimerBar');

  if (valEl) valEl.textContent = mm + ':' + ss;
  if (fillEl) fillEl.style.width = pct + '%';

  if (timerBar) {
    timerBar.classList.remove('timer-warning', 'timer-danger');
    if (remaining <= 20) {
      timerBar.classList.add('timer-danger');
      if (iconEl) iconEl.textContent = '🔴';
    } else if (remaining <= 60) {
      timerBar.classList.add('timer-warning');
      if (iconEl) iconEl.textContent = '🟠';
    } else {
      if (iconEl) iconEl.textContent = '⏱';
    }
  }
}

// ============================================
