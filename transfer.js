'use strict';

// ============================================
// TRIMITE / PRIMEȘTE CUVÂNTĂRI (direct din aplicație, fără WhatsApp/e-mail/export)
//
// Cum funcționează:
// - Fiecare utilizator are un ID unic (generat automat, 6 caractere) și un nume.
// - Aplicația nu are un server propriu de stocare — folosește PeerJS
//   (un broker public, gratuit, fără cont) doar ca să ajute două telefoane
//   să se găsească unul pe altul. Odată găsite, datele circulă DIRECT
//   între cele două aplicații (WebRTC), nu trec prin niciun server al nostru.
// - Limitare inerentă acestei arhitecturi fără server propriu: ambele
//   aplicații trebuie să fie deschise (online) în momentul trimiterii.
//   Dacă destinatarul nu are aplicația deschisă, trimiterea eșuează și
//   expeditorul este anunțat imediat.
// ============================================

const T_PEER_PREFIX = 'studiumeu-';
const T_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // fără caractere ambigue: 0/O, 1/I/L
const LAST_SEND_AT_KEY   = 'studiuMeu_lastSendAt';
const LAST_SEND_NAME_KEY = 'studiuMeu_lastSendName';

/** Actualizează rândul "Ultima trimitere reușită" din Setări, dacă e vizibil. */
function updateLastSendUI() {
  const el = document.getElementById('tLastSendLabel');
  if (!el) return;
  const last = localStorage.getItem(LAST_SEND_AT_KEY);
  const name = localStorage.getItem(LAST_SEND_NAME_KEY);
  el.textContent = last
    ? `${formatRelativeTime(last)}${name ? ' — către ' + name : ''}`
    : 'Nicio trimitere încă';
}

let tPeer = null;
let tPeerReady = false;
let tPendingSend = null;      // { kind, talkId } cât timp e deschis modalul de trimitere
let tIdentityCallback = null; // ce se execută după ce utilizatorul își salvează identitatea

function generateMyId() {
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += T_ID_CHARS[Math.floor(Math.random() * T_ID_CHARS.length)];
  }
  return id;
}

// ============================================
// PORNIRE CONEXIUNE
// ============================================
function initPeerTransfer() {
  if (!state.myUser || !state.myUser.id) { updateTransferStatusUI(false); return; }
  if (typeof Peer === 'undefined') {
    console.warn('PeerJS nu este disponibil (probabil ești offline). Trimiterea directă va funcționa când revii online.');
    updateTransferStatusUI(false);
    return;
  }

  if (tPeer) {
    try { tPeer.destroy(); } catch (e) { /* ignore */ }
  }
  tPeerReady = false;
  updateTransferStatusUI(false);

  try {
    tPeer = new Peer(T_PEER_PREFIX + state.myUser.id);
  } catch (e) {
    console.error('Nu s-a putut porni conexiunea de trimitere:', e);
    return;
  }

  tPeer.on('open', () => {
    tPeerReady = true;
    updateTransferStatusUI(true);
  });

  tPeer.on('connection', (conn) => {
    conn.on('data', (data) => handleIncomingTransfer(data, conn));
  });

  tPeer.on('disconnected', () => {
    tPeerReady = false;
    updateTransferStatusUI(false);
  });

  tPeer.on('close', () => {
    tPeerReady = false;
    updateTransferStatusUI(false);
  });

  tPeer.on('error', (err) => {
    console.error('Eroare conexiune trimitere:', err);
    tPeerReady = false;
    updateTransferStatusUI(false);
    // ID-ul e deja folosit de altcineva pe broker (foarte rar) -> generăm altul
    if (err && err.type === 'unavailable-id') {
      state.myUser.id = generateMyId();
      saveState();
      setTimeout(initPeerTransfer, 500);
    }
  });
}

function updateTransferStatusUI(online) {
  const dot = document.getElementById('tStatusDot');
  const label = document.getElementById('tStatusLabel');
  if (dot) dot.classList.toggle('t-online', !!online);
  if (label) label.textContent = online ? 'Conectat — poți trimite și primi' : 'Neconectat';
  const idEl = document.getElementById('tMyId');
  if (idEl) idEl.textContent = state.myUser?.id || '—';
  const nameEl = document.getElementById('tMyName');
  if (nameEl) nameEl.textContent = state.myUser?.name || '—';
}

// ============================================
// IDENTITATE (nume + ID unic, cerute o singură dată)
// ============================================
function ensureMyIdentity(callback) {
  if (state.myUser && state.myUser.id && state.myUser.name) {
    if (callback) callback();
    return;
  }
  openIdentityModal(callback);
}

function openIdentityModal(callback) {
  tIdentityCallback = callback || null;
  const nameInput = document.getElementById('tIdentityName');
  if (nameInput) nameInput.value = state.myUser?.name || '';
  document.getElementById('identityModal')?.classList.add('open');
  setTimeout(() => nameInput?.focus(), 50);
}

function closeIdentityModal() {
  document.getElementById('identityModal')?.classList.remove('open');
  tIdentityCallback = null;
}

function saveMyIdentity() {
  const name = document.getElementById('tIdentityName')?.value?.trim();
  if (!name) {
    showToast('Introdu numele tău.', 'error');
    document.getElementById('tIdentityName')?.focus();
    return;
  }

  if (!state.myUser) {
    state.myUser = { id: generateMyId(), name };
  } else {
    state.myUser.name = name;
  }
  saveState();
  initPeerTransfer();
  renderTransferSettings();

  const cb = tIdentityCallback;
  closeIdentityModal();
  showToast('Identitatea a fost salvată. ID-ul tău: ' + state.myUser.id, 'success');
  if (cb) cb();
}

// ============================================
// SETĂRI — afișare ID/nume propriu + contacte salvate
// ============================================
function renderTransferSettings() {
  updateTransferStatusUI(tPeerReady);
  updateLastSendUI();

  const btnLabel = document.getElementById('tIdentityBtnLabel');
  if (btnLabel) btnLabel.textContent = state.myUser?.id ? 'Editează numele' : 'Setează numele tău';

  const container = document.getElementById('tContactsSettingsList');
  if (!container) return;
  const contacts = state.contacts || [];
  if (contacts.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Niciun contact încă.</div>';
    return;
  }
  container.innerHTML = contacts.map(c => `
    <div class="t-contact-row">
      <span>👤 ${escHtml(c.name)}</span>
      <span class="t-contact-id">${escHtml(c.id)}</span>
      <button class="btn-ghost btn-sm" style="color:var(--red)" onclick="removeContact('${c.id}')" title="Șterge contact">✕</button>
    </div>
  `).join('');
}

function removeContact(id) {
  state.contacts = (state.contacts || []).filter(c => c.id !== id);
  saveState();
  renderTransferSettings();
}

function copyMyId() {
  if (!state.myUser?.id) return;
  navigator.clipboard?.writeText(state.myUser.id)
    .then(() => showToast('ID copiat: ' + state.myUser.id, 'success'))
    .catch(() => showToast('ID-ul tău: ' + state.myUser.id, 'success'));
}

// ============================================
// MODAL DE TRIMITERE
// ============================================
function openSendModal(kind, talkId) {
  ensureMyIdentity(() => {
    tPendingSend = { kind, talkId };
    const idInput = document.getElementById('tRecipientId');
    const nameInput = document.getElementById('tRecipientName');
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    renderContactsInSendModal();
    document.getElementById('sendTransferModal')?.classList.add('open');
  });
}

function closeSendModal() {
  document.getElementById('sendTransferModal')?.classList.remove('open');
  tPendingSend = null;
}

function renderContactsInSendModal() {
  const container = document.getElementById('tContactsList');
  if (!container) return;
  const contacts = state.contacts || [];
  if (contacts.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Niciun contact salvat încă. Introdu ID-ul mai jos.</div>';
    return;
  }
  container.innerHTML = contacts.map(c => `
    <button type="button" class="t-contact-chip" onclick="sendPendingTo('${c.id}', '${escHtml(c.name)}')">
      👤 ${escHtml(c.name)} <span class="t-contact-id">${escHtml(c.id)}</span>
    </button>
  `).join('');
}

function sendFromForm() {
  const id = document.getElementById('tRecipientId')?.value?.trim().toUpperCase();
  const name = document.getElementById('tRecipientName')?.value?.trim() || id;
  if (!id) {
    showToast('Introdu ID-ul destinatarului.', 'error');
    document.getElementById('tRecipientId')?.focus();
    return;
  }
  sendPendingTo(id, name);
}

function sendPendingTo(recipientId, recipientName) {
  if (!tPendingSend) return;
  if (!tPeer || !tPeerReady) {
    showToast('Nu ești conectat momentan. Verifică internetul și mai încearcă.', 'error');
    return;
  }
  if (recipientId === state.myUser?.id) {
    showToast('Nu îți poți trimite ție însuți o cuvântare.', 'error');
    return;
  }

  const { kind, talkId } = tPendingSend;
  const payload = buildTransferPayload(kind, talkId);
  if (!payload) {
    showToast('Cuvântarea nu a putut fi găsită.', 'error');
    return;
  }

  showToast('Se conectează la ' + recipientName + '…', 'success');

  let settled = false;
  let conn;
  try {
    conn = tPeer.connect(T_PEER_PREFIX + recipientId, { reliable: true });
  } catch (e) {
    showToast('ID invalid.', 'error');
    return;
  }

  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    showToast(recipientName + ' nu este online acum. Roagă-l să deschidă aplicația și mai încearcă.', 'error');
    try { conn.close(); } catch (e) { /* ignore */ }
  }, 12000);

  conn.on('open', () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    conn.send(payload);
    saveContact(recipientId, recipientName);
    renderTransferSettings();
    localStorage.setItem(LAST_SEND_AT_KEY, new Date().toISOString());
    localStorage.setItem(LAST_SEND_NAME_KEY, recipientName);
    updateLastSendUI();
    showToast('Trimis către ' + recipientName + '! ✅', 'success');
    closeSendModal();
  });

  conn.on('error', (err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    console.error('Eroare la trimitere:', err);
    showToast(recipientName + ' nu este online acum. Roagă-l să deschidă aplicația și mai încearcă.', 'error');
  });
}

function buildTransferPayload(kind, talkId) {
  if (kind === 'talk5') {
    const talk = (state.talk5Talks || []).find(t => t.id === talkId);
    if (!talk) return null;
    return {
      type: 'studiumeu-transfer',
      kind: 'talk5',
      from: { id: state.myUser.id, name: state.myUser.name },
      talk: { subject: talk.subject, duration: talk.duration, notes: talk.notes },
    };
  }
  if (kind === 'discurs30') {
    const talk = (state.discursTalks || []).find(t => t.id === talkId);
    if (!talk) return null;
    return {
      type: 'studiumeu-transfer',
      kind: 'discurs30',
      from: { id: state.myUser.id, name: state.myUser.name },
      talk: { titlu: talk.titlu, verset: talk.verset, note: talk.note, sections: talk.sections },
    };
  }
  return null;
}

function saveContact(id, name) {
  if (!state.contacts) state.contacts = [];
  const existing = state.contacts.find(c => c.id === id);
  if (existing) {
    existing.name = name;
  } else {
    state.contacts.push({ id, name });
  }
  saveState();
}

// ============================================
// PRIMIRE
// ============================================
function handleIncomingTransfer(data, conn) {
  if (!data || data.type !== 'studiumeu-transfer') return;

  const fromId = data.from?.id || (conn?.peer || '').replace(T_PEER_PREFIX, '');
  const fromName = data.from?.name || 'Necunoscut';
  saveContact(fromId, fromName);
  renderTransferSettings();

  if (data.kind === 'talk5' && data.talk) {
    if (!state.talk5Talks) state.talk5Talks = [];
    state.talk5Talks.push({
      id: Date.now().toString(),
      subject: data.talk.subject,
      duration: data.talk.duration,
      notes: data.talk.notes,
      date: new Date().toISOString().split('T')[0],
      receivedFrom: fromName,
    });
    saveState();
    if (typeof renderTalk5TalksList === 'function') renderTalk5TalksList();
    showToast('📥 Ai primit o cuvântare de 5 minute de la ' + fromName + '!', 'success');
  } else if (data.kind === 'discurs30' && data.talk) {
    if (!state.discursTalks) state.discursTalks = [];
    state.discursTalks.push({
      id: Date.now().toString(),
      data: new Date().toISOString().split('T')[0],
      titlu: data.talk.titlu,
      verset: data.talk.verset,
      note: data.talk.note,
      sections: data.talk.sections,
      receivedFrom: fromName,
    });
    saveState();
    if (typeof renderDiscursTalksList === 'function') renderDiscursTalksList();
    showToast('📥 Ai primit un discurs de 30 minute de la ' + fromName + '!', 'success');
  }
}
