/* ============================================
   StudiuMeu – UTILS
   Funcții helper, pure, fără dependențe de `state`.
   Pasul 1 al modularizării: extras 1:1 din app.js,
   fără nicio schimbare de comportament.
   ============================================ */

'use strict';

/**
 * Scapă caracterele HTML speciale dintr-un text, ca să poată fi
 * inserat în siguranță cu innerHTML (previne probleme de afișare/XSS).
 */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formatează o dată (string ISO) în format românesc citibil, ex: "27 iun. 2026".
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

/**
 * Construiește URL-ul canonic către Biblia de Studiu pe jw.org/ro,
 * pentru un anumit slug de carte și capitol.
 * Folosită oriunde se generează linkuri spre jw.org, ca să nu existe
 * construcții manuale duplicate ale URL-ului.
 * @param {string} slug - slug-ul cărții (ex: 'matei')
 * @param {number|string} capitol - numărul capitolului
 */
function getBibleUrl(slug, capitol) {
  return `https://www.jw.org/ro/biblioteca/biblie/biblia-de-studiu/carti/${slug}/${capitol}/`;
}

/**
 * Transformă o dată ISO într-un text relativ, prietenos, ex: „ieri", „acum 3 zile".
 * Folosită pentru „Ultimul backup" și „Ultima trimitere reușită" din Setări.
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Niciodată';
  const then = new Date(dateStr);
  if (isNaN(then)) return 'Niciodată';
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'chiar acum';
  if (diffMin < 60) return `acum ${diffMin} minut${diffMin === 1 ? '' : 'e'}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `acum ${diffH} or${diffH === 1 ? 'ă' : 'e'}`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ieri';
  if (diffD < 30) return `acum ${diffD} zile`;
  const diffLuni = Math.floor(diffD / 30);
  if (diffLuni < 12) return `acum ${diffLuni} lun${diffLuni === 1 ? 'ă' : 'i'}`;
  const diffAni = Math.floor(diffLuni / 12);
  return `acum ${diffAni} an${diffAni === 1 ? '' : 'i'}`;
}

// Referință internă la timer-ul toast-ului curent, ca să putem
// anula afișarea anterioară dacă apare un toast nou rapid.
let toastTimer = null;

/**
 * Afișează un mesaj scurt (toast) în colțul aplicației.
 * @param {string} message - textul de afișat
 * @param {'success'|'error'} type - stilul vizual al toast-ului
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
