// StudiuMeu — Service Worker
// Cache-first pentru fisierele aplicatiei = functionare completa offline.

const CACHE_VERSION = 'studiumeu-v6';
const CACHE_NAME = CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './app.js',
  './bibleReader.js',
  './dashboard.js',
  './dataIO.js',
  './discursTimer.js',
  './fieldService.js',
  './library.js',
  './fontScale.js',
  './meetings.js',
  './navigation.js',
  './notes.js',
  './notifications.js',
  './icsExport.js',
  './prophecies.js',
  './search.js',
  './storage.js',
  './talkTimer.js',
  './temacursant.js',
  './theme.js',
  './transfer.js',
  './utils.js',
  './verses.js',
  './wordCounter.js',
  './workbook.js',
  './wtStudy.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      // field-service-data.local.js e opțional (conține nume reale și nu e pe
      // GitHub) — îl cache-uim separat ca să nu pice tot instalarea dacă lipsește.
      .then(() => caches.open(CACHE_NAME).then((cache) =>
        cache.add('./field-service-data.local.js').catch(() => {})
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  if (!isSameOrigin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

/* ============================================
   NOTIFICĂRI DE PROGRAM – rulează chiar și cu pagina închisă
   (doar Chrome/Edge Android sau Desktop, PWA instalată — vezi notifications.js)
   ============================================ */

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-schedule') {
    event.waitUntil(swCheckScheduleAndNotify());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const existing = clientsArr.find((c) => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});

// --- IndexedDB (duplicat aici: Service Worker-ul nu poate accesa
//     localStorage sau scripturile paginii, rulează în context separat) ---
function nmIdbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('studiuMeuNotifDB', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('kv')) {
        req.result.createObjectStore('kv', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function nmIdbGet(key) {
  return nmIdbOpen().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const r = tx.objectStore('kv').get(key);
    r.onsuccess = () => resolve(r.result ? r.result.value : null);
    r.onerror = () => reject(r.error);
  }));
}

function nmIdbSet(key, value) {
  return nmIdbOpen().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

const RO_MONTHS = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

function parseRoDate(str) {
  if (!str) return null;
  const parts = str.trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const monthIdx = RO_MONTHS.indexOf(parts[1]);
  if (isNaN(day) || monthIdx === -1) return null;
  return { day, month: monthIdx };
}

const FS_DAY_LABELS = {
  marti: 'Marți - Zoom',
  vineri: 'Vineri - Zoom',
  sambata: 'Sâmbătă - Sala Regatului',
};

async function swCheckScheduleAndNotify() {
  const schedule = await nmIdbGet('schedule');
  if (!schedule) return;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const todayStr = now.toISOString().split('T')[0];
  let ledger = await nmIdbGet('notifSent');
  if (!ledger || ledger.date !== todayStr) ledger = { date: todayStr, keys: [] };

  for (const dayKey of Object.keys(FS_DAY_LABELS)) {
    const day = schedule[dayKey];
    if (!day || !Array.isArray(day.rows)) continue;

    for (let i = 0; i < day.rows.length; i++) {
      const row = day.rows[i];
      const parsed = parseRoDate(row.data);
      if (!parsed) continue;

      if (parsed.day === now.getDate() && parsed.month === now.getMonth()) {
        const key = `${dayKey}-${i}-today`;
        if (!ledger.keys.includes(key)) {
          await self.registration.showNotification(`Astăzi: ${FS_DAY_LABELS[dayKey]}`, {
            body: `${row.nume || '—'} este programat/ă astăzi.`,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: key,
          });
          ledger.keys.push(key);
        }
      }

      if (parsed.day === tomorrow.getDate() && parsed.month === tomorrow.getMonth()) {
        const key = `${dayKey}-${i}-tomorrow`;
        if (!ledger.keys.includes(key)) {
          await self.registration.showNotification(`Mâine: ${FS_DAY_LABELS[dayKey]}`, {
            body: `Anunță-l/o pe ${row.nume || '—'} pentru mâine.`,
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            tag: key,
          });
          ledger.keys.push(key);
        }
      }
    }
  }

  await nmIdbSet('notifSent', ledger);
}
