'use strict';

/* ============================================
   StudiuMeu – BIBLIOTECĂ
   Mutat din aplicația "Studiu Personal": Publicații
   (linkuri/PDF-uri de pe jw.org) + Materiale Video.

   Notă privind confidențialitatea: fișierele video NU sunt
   niciodată încărcate nicăieri și NU sunt stocate ca atare —
   sunt citite direct din calculator. Doar titlul, starea
   "vizionat", poziția de redare și — acolo unde browserul
   permite — o "legătură" către locația fișierului (nu
   conținutul lui!) sunt salvate local (state / IndexedDB).
   ============================================ */

// ── Tab-uri mari: Publicații / Materiale Video ──
function switchLibTab(target) {
  document.querySelectorAll('.lib-big-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${target}`)?.classList.add('active');

  const panels = { pub: 'lib-pub', video: 'lib-video', music: 'lib-music' };
  Object.entries(panels).forEach(([key, panelId]) => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.toggle('active', key === target);
    panel.classList.toggle('hidden', key !== target);
  });

  if (target === 'music' && !musicInitialized) {
    musicInitialized = true;
    restoreSavedSongs().then(renderMusicPanel);
  }
}

// ── Randare generală a paginii Bibliotecă (apelată la navigare) ──
let libraryInitialized = false;
let musicInitialized = false;

function renderLibraryPage() {
  if (!Array.isArray(state.publications)) state.publications = [];
  if (!state.videoMeta || typeof state.videoMeta !== 'object') state.videoMeta = {};
  if (!Array.isArray(state.songs)) state.songs = [];

  if (!libraryInitialized) {
    initLibraryOnce();
    initMusicOnce();
    libraryInitialized = true;
  }
  renderPubs();
  renderVideoSlots();
  if (musicInitialized) renderMusicPanel();
}

function initLibraryOnce() {
  // Închidere modale la click pe overlay / Escape
  document.getElementById('pub-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('pub-modal')) closePubModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePubModal();
      if (typeof closeVideoPlayer === 'function') closeVideoPlayer();
    }
  });

  document.getElementById('reset-titles-btn')?.addEventListener('click', resetEpisodeTitles);
  document.getElementById('vplayer-close')?.addEventListener('click', closeVideoPlayer);
  document.getElementById('vplayer-exit')?.addEventListener('click', closeVideoPlayer);
  document.getElementById('video-player-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('video-player-modal')) closeVideoPlayer();
  });

  const list = document.getElementById('video-cards-list');
  list?.addEventListener('change', e => {
    if (!e.target.classList.contains('vslot-file')) return;
    const file = e.target.files[0];
    if (!file) return;
    applyLoadedVideo(e.target.dataset.slot, file);
    e.target.value = '';
  });
  list?.addEventListener('input', e => {
    if (!e.target.classList.contains('vslot-title-input')) return;
    state.videoMeta[e.target.dataset.slot].title = e.target.value;
  });
  list?.addEventListener('blur', e => {
    if (!e.target.classList || !e.target.classList.contains('vslot-title-input')) return;
    const id = e.target.dataset.slot;
    if (!e.target.value.trim()) {
      e.target.value = DEFAULT_EPISODE_TITLES[id] || `Episodul ${id}`;
      state.videoMeta[id].title = e.target.value;
    }
    saveState();
  }, true); // capture — blur nu urcă (bubble)
  list?.addEventListener('click', e => {
    const watchedBtn = e.target.closest('.vslot-watched-btn');
    if (watchedBtn) { toggleWatched(watchedBtn.dataset.slot); return; }

    const playBtn = e.target.closest('.vslot-play');
    if (playBtn) {
      const id = playBtn.dataset.slot;
      const titleInput = document.querySelector(`.vslot-title-input[data-slot="${id}"]`);
      openVideoPlayer(id, titleInput ? titleInput.value : `Episodul ${id}`);
      return;
    }

    const delBtn = e.target.closest('.vslot-delete');
    if (delBtn) { deleteVideo(delBtn.dataset.slot); return; }

    const pickLabel = e.target.closest('.vslot-pick');
    if (pickLabel && supportsFileHandles) {
      e.preventDefault();
      pickVideoForSlot(pickLabel.dataset.slot);
      return;
    }
  });

  restoreSavedVideos();
}

/* ============================================
   PUBLICAȚII
   ============================================ */
function openPubModal() {
  document.getElementById('pub-modal')?.classList.remove('hidden');
  document.getElementById('pub-title-input')?.focus();
}
function closePubModal() {
  document.getElementById('pub-modal')?.classList.add('hidden');
  document.getElementById('pub-title-input').value = '';
  document.getElementById('pub-url-input').value = '';
}
function savePub() {
  const titleIn = document.getElementById('pub-title-input');
  const urlIn = document.getElementById('pub-url-input');
  const title = titleIn.value.trim();
  if (!title) { showToast('Introdu un titlu!', 'error'); return; }
  state.publications.push({ title, url: urlIn.value.trim() });
  saveState();
  titleIn.value = ''; urlIn.value = '';
  closePubModal();
  renderPubs();
  showToast('Publicație adăugată! 📚', 'success');
}
function deletePub(index) {
  if (!confirm('Ștergi această publicație?')) return;
  state.publications.splice(index, 1);
  saveState();
  renderPubs();
  showToast('Publicație ștearsă.', 'success');
}

function renderPubs() {
  const pubList = document.getElementById('pub-list');
  if (!pubList) return;
  pubList.querySelectorAll('.pub-card, .pub-card-wrap').forEach(el => el.remove());
  const empty = pubList.querySelector('.pub-empty');
  if (state.publications.length === 0) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  state.publications.forEach((pub, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'pub-card-wrap';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';

    const a = document.createElement('a');
    a.className = 'pub-card';
    a.style.flex = '1';
    a.href = pub.url || '#';
    if (pub.url) a.target = '_blank';
    a.innerHTML = `
      <div class="pub-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <div>
        <div class="pub-card-title">${escHtml(pub.title)}</div>
        ${pub.url ? `<div class="pub-card-url">${escHtml(pub.url)}</div>` : ''}
      </div>
    `;

    const delBtn = document.createElement('button');
    delBtn.className = 'vslot-delete';
    delBtn.style.display = 'flex';
    delBtn.title = 'Șterge publicația';
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
    delBtn.addEventListener('click', () => deletePub(i));

    wrap.appendChild(a);
    wrap.appendChild(delBtn);
    pubList.appendChild(wrap);
  });
}

/* ============================================
   MATERIALE VIDEO (episoade extensibile)
   📌 Pentru a adăuga episoade noi în viitor: adaugă o intrare
   nouă în obiectul de mai jos — restul se adaptează automat.
   ============================================ */
const DEFAULT_EPISODE_TITLES = {
  1: 'Episodul 1: Adevărata lumină a lumii',
  2: 'Episodul 2',
  3: 'Episodul 3',
  4: 'Episodul 4',
  5: 'Episodul 5',
  6: 'Episodul 6',
};
const EPISODE_IDS = Object.keys(DEFAULT_EPISODE_TITLES).map(Number);

function getVideoMeta(id) {
  if (!state.videoMeta[id]) state.videoMeta[id] = {};
  const m = state.videoMeta[id];
  if (!m.title) m.title = DEFAULT_EPISODE_TITLES[id];
  if (typeof m.watched !== 'boolean') m.watched = false;
  if (typeof m.position !== 'number') m.position = 0;
  return m;
}

// ── "Memoria" locației fișierelor (File System Access API + IndexedDB) ──
// Disponibilă doar în Chrome/Edge. Stochează doar o REFERINȚĂ către fișier
// (un "handle"), nu conținutul video. Firefox/Safari nu suportă acest API;
// acolo se revine automat la selectarea manuală a fișierului.
const supportsFileHandles = 'showOpenFilePicker' in window && 'indexedDB' in window;
const IDB_NAME = 'sp-video-db';
const IDB_STORE = 'handles';

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveHandle(slot, handle) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, String(slot));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getHandle(slot) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(String(slot));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function deleteHandle(slot) {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(String(slot));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
/** Șterge toate legăturile către fișiere video salvate (folosit la resetarea completă a datelor). */
async function deleteAllVideoHandles() {
  const db = await openHandleDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// videoBlobs[slot] = { name, url } — doar în memorie, niciodată persistat
const videoBlobs = {};

function createVideoSlotEl(id) {
  const meta = getVideoMeta(id);
  const el = document.createElement('div');
  el.className = 'video-slot' + (meta.watched ? ' watched' : '');
  el.id = `vslot-${id}`;
  el.dataset.slot = id;
  el.innerHTML = `
    <div class="vslot-num">${id}</div>
    <div class="vslot-info">
      <input type="text" class="vslot-title-input" data-slot="${id}" maxlength="80"
             value="${escHtml(meta.title)}" placeholder="Titlu episod..." />
      <div class="vslot-meta-row">
        <span class="vslot-status empty-status">Nicio înregistrare</span>
        <span class="vslot-watched-tag ${meta.watched ? '' : 'hidden'}">✅ Vizionat</span>
      </div>
    </div>
    <button class="vslot-watched-btn ${meta.watched ? 'active' : ''}" data-slot="${id}" title="Marchează ca vizionat">⭐</button>
    <button class="vslot-play hidden" data-slot="${id}" title="Redă video">
      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </button>
    <label class="vslot-pick" data-slot="${id}" title="Selectează video">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <input type="file" accept="video/*" class="vslot-file" data-slot="${id}" />
    </label>
    <button class="vslot-delete hidden" data-slot="${id}" title="Șterge video">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
  `;
  return el;
}

function renderVideoSlots() {
  const list = document.getElementById('video-cards-list');
  const countEl = document.getElementById('video-count');
  if (!list) return;
  const pending = {}; // păstrăm blob-urile deja încărcate din sesiunea curentă
  list.innerHTML = '';
  EPISODE_IDS.forEach(id => {
    list.appendChild(createVideoSlotEl(id));
    if (videoBlobs[id]) applyLoadedVideo(id, { name: videoBlobs[id].name }, true, true);
  });
  if (countEl) countEl.textContent = `${EPISODE_IDS.length} episoade`;
}

// ── Aplică vizual un video încărcat ──
// keepUrl=true înseamnă că videoBlobs[slot].url e deja setat (re-randare panou)
function applyLoadedVideo(slot, file, silent, keepUrl) {
  const slotEl = document.getElementById(`vslot-${slot}`);
  if (!slotEl) return;
  const statusEl = slotEl.querySelector('.vslot-status');

  if (!keepUrl) {
    if (videoBlobs[slot]) URL.revokeObjectURL(videoBlobs[slot].url);
    videoBlobs[slot] = { name: file.name, url: URL.createObjectURL(file) };
  }

  slotEl.classList.add('loaded');
  statusEl.className = 'vslot-status loaded-status';
  statusEl.textContent = `✓ ${file.name}`;
  slotEl.querySelector('.vslot-play').classList.remove('hidden');
  slotEl.querySelector('.vslot-delete').classList.remove('hidden');
  slotEl.querySelector('.vslot-pick').title = 'Schimbă videoclipul';
  delete slotEl.dataset.pendingHandle;

  if (!silent) showToast(`Episodul ${slot} încărcat! 🎬`, 'success');
}

// ── Flow cu "memorie" a fișierului (Chrome/Edge — File System Access API) ──
async function loadFileFromHandle(slot, handle, silent) {
  try {
    const file = await handle.getFile();
    applyLoadedVideo(slot, file, silent);
  } catch {
    showToast('Fișierul nu a mai fost găsit (poate a fost mutat sau șters de pe disc).', 'error');
    markSlotNeedsPermission(slot);
  }
}

function markSlotNeedsPermission(slot) {
  const slotEl = document.getElementById(`vslot-${slot}`);
  if (!slotEl) return;
  const statusEl = slotEl.querySelector('.vslot-status');
  statusEl.className = 'vslot-status permission-status';
  statusEl.textContent = '🔒 Apasă pe pictograma folder pentru a reconecta fișierul';
  slotEl.querySelector('.vslot-pick').title = 'Reconectează fișierul salvat';
  slotEl.dataset.pendingHandle = '1';
}

async function pickVideoForSlot(slot) {
  const slotEl = document.getElementById(`vslot-${slot}`);

  // Dacă avem deja un handle salvat ce așteaptă permisiune, încercăm întâi să-l reconectăm
  if (supportsFileHandles && slotEl?.dataset.pendingHandle === '1') {
    const handle = await getHandle(slot).catch(() => null);
    if (handle) {
      try {
        const perm = await handle.requestPermission({ mode: 'read' });
        if (perm === 'granted') { await loadFileFromHandle(slot, handle); return; }
        showToast('Acces refuzat. Poți selecta din nou fișierul.', 'error');
      } catch { /* continuă mai jos la selectare nouă */ }
    }
  }

  if (supportsFileHandles) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Video', accept: { 'video/*': ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v'] } }],
        multiple: false,
      });
      await saveHandle(slot, handle);
      await loadFileFromHandle(slot, handle);
    } catch (err) {
      if (err?.name === 'AbortError') return; // utilizatorul a anulat selecția
      // Metoda modernă a eșuat (ex: context nesigur, restricții de browser).
      // Trecem automat la selectorul clasic de fișiere, care funcționează garantat.
      document.querySelector(`.vslot-file[data-slot="${slot}"]`)?.click();
    }
  } else {
    // Firefox / Safari — nu pot reține fișierul, doar selectare clasică
    document.querySelector(`.vslot-file[data-slot="${slot}"]`)?.click();
  }
}

// La deschiderea paginii Bibliotecă: reconectează automat videourile salvate anterior
async function restoreSavedVideos() {
  if (!supportsFileHandles) return;
  for (const id of EPISODE_IDS) {
    const handle = await getHandle(id).catch(() => null);
    if (!handle) continue;
    try {
      const perm = await handle.queryPermission({ mode: 'read' });
      if (perm === 'granted') {
        await loadFileFromHandle(id, handle, true);
      } else {
        markSlotNeedsPermission(id);
      }
    } catch {
      markSlotNeedsPermission(id);
    }
  }
}

function toggleWatched(slot) {
  const meta = getVideoMeta(slot);
  meta.watched = !meta.watched;
  saveState();
  const slotEl = document.getElementById(`vslot-${slot}`);
  slotEl.classList.toggle('watched', meta.watched);
  slotEl.querySelector('.vslot-watched-btn').classList.toggle('active', meta.watched);
  slotEl.querySelector('.vslot-watched-tag').classList.toggle('hidden', !meta.watched);
  showToast(meta.watched ? '⭐ Marcat ca vizionat' : '↩️ Marcaj eliminat', 'success');
}

function deleteVideo(slot) {
  if (!videoBlobs[slot]) return;
  if (!confirm('Ștergi acest videoclip din aplicație? (fișierul de pe calculator nu este afectat)')) return;

  URL.revokeObjectURL(videoBlobs[slot].url);
  delete videoBlobs[slot];
  getVideoMeta(slot).position = 0;
  saveState();
  if (supportsFileHandles) deleteHandle(slot).catch(() => {});

  const slotEl = document.getElementById(`vslot-${slot}`);
  slotEl.classList.remove('loaded');
  delete slotEl.dataset.pendingHandle;
  const statusEl = slotEl.querySelector('.vslot-status');
  statusEl.className = 'vslot-status empty-status';
  statusEl.textContent = 'Nicio înregistrare';
  slotEl.querySelector('.vslot-play').classList.add('hidden');
  slotEl.querySelector('.vslot-delete').classList.add('hidden');
  slotEl.querySelector('.vslot-pick').title = 'Selectează video';

  showToast(`Videoclipul ${slot} a fost șters 🗑️`, 'success');
}

function resetEpisodeTitles() {
  if (!confirm('Resetezi toate titlurile episoadelor la valorile implicite?')) return;
  EPISODE_IDS.forEach(id => {
    getVideoMeta(id).title = DEFAULT_EPISODE_TITLES[id];
    const input = document.querySelector(`.vslot-title-input[data-slot="${id}"]`);
    if (input) input.value = DEFAULT_EPISODE_TITLES[id];
  });
  saveState();
  showToast('Titlurile au fost resetate 🔁', 'success');
}

/* ============================================
   PLAYER VIDEO (redare, continuă de unde ai rămas, ieșire)
   ============================================ */
let currentPlayingSlot = null;
let positionSaveTimer = null;

function formatVideoTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function openVideoPlayer(slot, title) {
  if (!videoBlobs[slot]) return;
  const vPlayerModal = document.getElementById('video-player-modal');
  const vPlayerEl = document.getElementById('vplayer-el');
  const vPlayerTitle = document.getElementById('vplayer-title');

  currentPlayingSlot = slot;
  vPlayerEl.src = videoBlobs[slot].url;
  vPlayerTitle.textContent = title;
  vPlayerModal.classList.remove('hidden');

  const resumeAt = getVideoMeta(slot).position || 0;
  const resumeOnce = () => {
    if (resumeAt > 2 && resumeAt < vPlayerEl.duration - 3) {
      vPlayerEl.currentTime = resumeAt;
      showToast(`▶️ Continuă de la ${formatVideoTime(resumeAt)}`, 'success');
    }
    vPlayerEl.removeEventListener('loadedmetadata', resumeOnce);
  };
  vPlayerEl.addEventListener('loadedmetadata', resumeOnce);

  vPlayerEl.play().catch(() => {});

  clearInterval(positionSaveTimer);
  positionSaveTimer = setInterval(savePlaybackPosition, 4000);
  vPlayerEl.addEventListener('pause', savePlaybackPosition);
}

function savePlaybackPosition() {
  if (currentPlayingSlot == null) return;
  const vPlayerEl = document.getElementById('vplayer-el');
  const t = vPlayerEl.currentTime;
  if (!isFinite(t)) return;
  getVideoMeta(currentPlayingSlot).position = t;
  saveState();
}

function closeVideoPlayer() {
  const vPlayerModal = document.getElementById('video-player-modal');
  const vPlayerEl = document.getElementById('vplayer-el');
  if (!vPlayerModal || !vPlayerEl) return;
  savePlaybackPosition();
  clearInterval(positionSaveTimer);
  vPlayerEl.pause();
  vPlayerEl.src = '';
  vPlayerModal.classList.add('hidden');
  currentPlayingSlot = null;
}

/* ============================================
   MUZICĂ (163+ melodii, adăugate una câte una)
   ============================================ */
const songBlobs = {}; // songBlobs[id] = { name, url } — doar în memorie
let currentPlayingSongId = null;
let pendingSongTitle = null;
let songPositionSaveTimer = null;

function initMusicOnce() {
  document.getElementById('song-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('song-modal')) closeAddSongModal();
  });
  document.getElementById('song-title-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveNewSong();
  });

  document.getElementById('aplayer-close')?.addEventListener('click', closeAudioPlayer);
  document.getElementById('aplayer-exit')?.addEventListener('click', closeAudioPlayer);
  document.getElementById('aplayer-next')?.addEventListener('click', () => playAdjacentSong(1));
  document.getElementById('aplayer-prev')?.addEventListener('click', () => playAdjacentSong(-1));
  document.getElementById('audio-player-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('audio-player-modal')) closeAudioPlayer();
  });
  document.getElementById('continue-listen-btn')?.addEventListener('click', () => {
    if (state.lastPlayedSongId) openAudioPlayer(state.lastPlayedSongId);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeAddSongModal(); closeAudioPlayer(); }
  });

  const list = document.getElementById('music-cards-list');
  list?.addEventListener('input', e => {
    if (!e.target.classList.contains('vslot-title-input')) return;
    const song = state.songs.find(s => s.id === e.target.dataset.slot);
    if (song) song.title = e.target.value;
  });
  list?.addEventListener('blur', e => {
    if (!e.target.classList || !e.target.classList.contains('vslot-title-input')) return;
    const song = state.songs.find(s => s.id === e.target.dataset.slot);
    if (song && !e.target.value.trim()) e.target.value = song.title = 'Melodie fără titlu';
    saveState();
  }, true);
  list?.addEventListener('click', e => {
    const playBtn = e.target.closest('.vslot-play');
    if (playBtn) { openAudioPlayer(playBtn.dataset.slot); return; }

    const delBtn = e.target.closest('.vslot-delete');
    if (delBtn) { deleteSong(delBtn.dataset.slot); return; }

    const pickLabel = e.target.closest('.vslot-pick');
    if (pickLabel) { e.preventDefault(); reconnectSongFile(pickLabel.dataset.slot); return; }
  });
}

// ── Adăugare melodie nouă (titlu + selectare fișier) ──
function openAddSongModal() {
  document.getElementById('song-modal')?.classList.remove('hidden');
  document.getElementById('song-title-input')?.focus();
}
function closeAddSongModal() {
  document.getElementById('song-modal')?.classList.add('hidden');
  document.getElementById('song-title-input').value = '';
}

async function saveNewSong() {
  const titleIn = document.getElementById('song-title-input');
  const title = titleIn.value.trim();
  if (!title) { showToast('Introdu un titlu pentru melodie!', 'error'); return; }
  pendingSongTitle = title;
  closeAddSongModal();
  await pickFileForNewSong(title);
}

async function pickFileForNewSong(title) {
  const id = `s${Date.now()}${Math.floor(Math.random() * 1000)}`;

  const finish = async (file, handle) => {
    songBlobs[id] = { name: file.name, url: URL.createObjectURL(file) };
    state.songs.push({ id, title, position: 0 });
    if (handle && supportsFileHandles) await saveHandle(`song-${id}`, handle).catch(() => {});
    saveState();
    renderMusicPanel();
    showToast(`„${title}" a fost adăugată! 🎵`, 'success');
  };

  if (supportsFileHandles) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Audio', accept: { 'audio/*': ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      await finish(file, handle);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      pickWithClassicInput(finish);
    }
  } else {
    pickWithClassicInput(finish);
  }
}

function pickWithClassicInput(onFile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.remove();
    if (file) onFile(file, null);
  });
  document.body.appendChild(input);
  input.click();
}

// ── Reconectare fișier existent (Chrome/Edge — după ce permisiunea a expirat) ──
async function reconnectSongFile(id) {
  if (supportsFileHandles) {
    const handle = await getHandle(`song-${id}`).catch(() => null);
    if (handle) {
      try {
        const perm = await handle.requestPermission({ mode: 'read' });
        if (perm === 'granted') {
          const file = await handle.getFile();
          songBlobs[id] = { name: file.name, url: URL.createObjectURL(file) };
          renderMusicPanel();
          return;
        }
      } catch { /* trecem la selectare clasică mai jos */ }
    }
  }
  pickWithClassicInput((file) => {
    songBlobs[id] = { name: file.name, url: URL.createObjectURL(file) };
    renderMusicPanel();
  });
}

async function restoreSavedSongs() {
  if (!supportsFileHandles) return;
  for (const song of state.songs) {
    if (songBlobs[song.id]) continue;
    const handle = await getHandle(`song-${song.id}`).catch(() => null);
    if (!handle) continue;
    try {
      const perm = await handle.queryPermission({ mode: 'read' });
      if (perm === 'granted') {
        const file = await handle.getFile();
        songBlobs[song.id] = { name: file.name, url: URL.createObjectURL(file) };
      }
    } catch { /* rămâne needs-reconnect, afișat la randare */ }
  }
}

function deleteSong(id) {
  if (!confirm('Ștergi această melodie din listă? (fișierul de pe calculator nu este afectat)')) return;
  const idx = state.songs.findIndex(s => s.id === id);
  if (idx === -1) return;
  state.songs.splice(idx, 1);
  if (songBlobs[id]) { URL.revokeObjectURL(songBlobs[id].url); delete songBlobs[id]; }
  if (state.lastPlayedSongId === id) state.lastPlayedSongId = null;
  saveState();
  if (supportsFileHandles) deleteHandle(`song-${id}`).catch(() => {});
  renderMusicPanel();
  showToast('Melodie ștearsă 🗑️', 'success');
}

function formatSongTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function createSongSlotEl(song, index) {
  const el = document.createElement('div');
  const loaded = !!songBlobs[song.id];
  el.className = 'video-slot song-slot' + (loaded ? ' loaded' : '') + (song.id === currentPlayingSongId ? ' playing' : '');
  el.id = `sslot-${song.id}`;
  el.dataset.slot = song.id;
  el.innerHTML = `
    <div class="vslot-num">${index + 1}</div>
    <div class="vslot-info">
      <input type="text" class="vslot-title-input" data-slot="${song.id}" maxlength="120"
             value="${escHtml(song.title)}" placeholder="Titlu melodie..." />
      <div class="vslot-meta-row">
        <span class="vslot-status ${loaded ? 'loaded-status' : 'permission-status'}">
          ${loaded ? '✓ ' + escHtml(songBlobs[song.id].name) : '🔒 Apasă pe pictograma folder pentru a reconecta fișierul'}
        </span>
        ${song.position > 3 ? `<span class="vslot-watched-tag">⏱ ${formatSongTime(song.position)}</span>` : ''}
      </div>
    </div>
    <button class="vslot-play ${loaded ? '' : 'hidden'}" data-slot="${song.id}" title="Redă melodia">
      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </button>
    <button class="vslot-pick" data-slot="${song.id}" title="${loaded ? 'Reconectează fișierul' : 'Selectează fișierul'}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    </button>
    <button class="vslot-delete" data-slot="${song.id}" title="Șterge melodia" style="display:flex">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
    </button>
  `;
  return el;
}

function renderMusicPanel() {
  const list = document.getElementById('music-cards-list');
  const countEl = document.getElementById('music-count');
  const emptyEl = document.getElementById('music-empty');
  if (!list) return;

  countEl.textContent = `${state.songs.length} melodii`;

  list.querySelectorAll('.song-slot').forEach(el => el.remove());
  if (state.songs.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
  } else {
    if (emptyEl) emptyEl.style.display = 'none';
    state.songs.forEach((song, i) => list.appendChild(createSongSlotEl(song, i)));
  }

  // Card "Continuă ascultarea"
  const continueCard = document.getElementById('continue-listen-card');
  const lastSong = state.songs.find(s => s.id === state.lastPlayedSongId);
  if (lastSong && lastSong.position > 3) {
    continueCard.classList.remove('hidden');
    document.getElementById('continue-listen-title').textContent = lastSong.title;
    document.getElementById('continue-listen-time').textContent = `de la ${formatSongTime(lastSong.position)}`;
  } else {
    continueCard.classList.add('hidden');
  }
}

/* ── Player audio ── */
function openAudioPlayer(id) {
  if (!songBlobs[id]) { reconnectSongFile(id); return; }
  const song = state.songs.find(s => s.id === id);
  if (!song) return;

  const modal = document.getElementById('audio-player-modal');
  const audioEl = document.getElementById('aplayer-el');
  const titleEl = document.getElementById('aplayer-title');

  currentPlayingSongId = id;
  state.lastPlayedSongId = id;
  audioEl.src = songBlobs[id].url;
  titleEl.textContent = song.title;
  modal.classList.remove('hidden');

  const resumeAt = song.position || 0;
  const resumeOnce = () => {
    if (resumeAt > 2 && resumeAt < audioEl.duration - 2) {
      audioEl.currentTime = resumeAt;
      showToast(`▶️ Continuă de la ${formatSongTime(resumeAt)}`, 'success');
    }
    audioEl.removeEventListener('loadedmetadata', resumeOnce);
  };
  audioEl.addEventListener('loadedmetadata', resumeOnce);
  audioEl.play().catch(() => {});

  clearInterval(songPositionSaveTimer);
  songPositionSaveTimer = setInterval(saveSongPosition, 4000);
  audioEl.onpause = saveSongPosition;
  audioEl.onended = () => playAdjacentSong(1);

  renderMusicPanel();
}

function saveSongPosition() {
  if (currentPlayingSongId == null) return;
  const audioEl = document.getElementById('aplayer-el');
  const song = state.songs.find(s => s.id === currentPlayingSongId);
  if (!song || !isFinite(audioEl.currentTime)) return;
  song.position = audioEl.currentTime;
  saveState();
}

function closeAudioPlayer() {
  const modal = document.getElementById('audio-player-modal');
  const audioEl = document.getElementById('aplayer-el');
  if (!modal || !audioEl) return;
  saveSongPosition();
  clearInterval(songPositionSaveTimer);
  audioEl.pause();
  audioEl.src = '';
  modal.classList.add('hidden');
  currentPlayingSongId = null;
  saveState();
  renderMusicPanel();
}

function playAdjacentSong(dir) {
  const idx = state.songs.findIndex(s => s.id === currentPlayingSongId);
  if (idx === -1) return;
  let next = idx + dir;
  while (next >= 0 && next < state.songs.length && !songBlobs[state.songs[next].id]) next += dir;
  if (next < 0 || next >= state.songs.length) { closeAudioPlayer(); return; }
  openAudioPlayer(state.songs[next].id);
}
