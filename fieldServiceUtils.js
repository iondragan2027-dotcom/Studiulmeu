'use strict';

// ============================================
// FIELD SERVICE — UTILS
// Constante și funcții helper generale, fără dependențe de
// stare (state) sau de DOM. Folosite de mai multe module
// fieldService* (Storage, Suggest, UI).
// ============================================

// Etichetele zilelor de program, folosite în UI (tabel, colaboratori)
// și în algoritmul de sugestie.
const FS_DAY_LABELS = { marti: 'Marți', vineri: 'Vineri', sambata: 'Sâmbătă' };

// Încearcă să extragă o dată aproximativă (pentru sortare cronologică)
// dintr-un text liber de forma "28 aprilie" / "7 iul". Întoarce un
// timestamp sau null dacă nu poate fi recunoscută.
function parseRoDateApprox(text) {
  if (!text) return null;
  const months = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const m = text.toLowerCase().match(/(\d{1,2})\s*([a-zăâîșț]+)/i);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const monthText = m[2];
  const monthIdx = months.findIndex(mo => mo.startsWith(monthText) || monthText.startsWith(mo.slice(0, 3)));
  if (monthIdx === -1 || !day || day < 1 || day > 31) return null;

  const now = new Date();
  let candidate = new Date(now.getFullYear(), monthIdx, day);
  // Dacă data pare cu mult în trecut, presupunem că e vorba de anul următor
  if ((now - candidate) / 86400000 > 200) {
    candidate = new Date(now.getFullYear() + 1, monthIdx, day);
  }
  return candidate.getTime();
}

// Construiește un text formatat cu toate cele 3 zile (dată + nume)
// dintr-un tabel de program, folosit pentru trimiterea pe WhatsApp.
function buildFieldServiceShareText(table) {
  if (!table) return '';
  const dayKeys = ['marti', 'vineri', 'sambata'];
  const parts = [];
  const title = table.title ? `📅 ${table.title}\n` : '';
  parts.push(`${title}*Program pentru Întrunirea de Ieșire pe Teren*`);

  dayKeys.forEach(dayKey => {
    const day = table[dayKey];
    if (!day) return;
    parts.push(`\n*${day.label}*`);
    const rows = Array.isArray(day.rows) ? day.rows.filter(r => (r.data && r.data.trim()) || (r.nume && r.nume.trim())) : [];
    if (rows.length === 0) {
      parts.push('—');
    } else {
      rows.forEach(row => {
        const data = row.data && row.data.trim() ? row.data.trim() : '—';
        const nume = row.nume && row.nume.trim() ? row.nume.trim() : '—';
        parts.push(`• ${data}: ${nume}`);
      });
    }
  });

  return parts.join('\n');
}
