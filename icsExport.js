'use strict';

/* ============================================
   EXPORT CALENDAR (.ics) – Program Întrunire de Ieșire pe Teren
   Generează un fișier .ics cu toate datele din program, ca să poți
   importa evenimentele în Google Calendar / Calendar iPhone / orice
   aplicație de calendar. Notificările vin atunci direct de la telefon,
   indiferent dacă StudiuMeu e deschis sau nu.
   ============================================ */

const ICS_DAY_TIME = {
  marti:   { hour: 17, minute: 0, durationMin: 60, label: 'Ieșire pe teren - Marți (Zoom)' },
  vineri:  { hour: 17, minute: 0, durationMin: 60, label: 'Ieșire pe teren - Vineri (Zoom)' },
  sambata: { hour: 9,  minute: 30, durationMin: 90, label: 'Ieșire pe teren - Sâmbătă (Sala Regatului)' },
};

function icsPad(n) {
  return String(n).padStart(2, '0');
}

// Transformă "28 aprilie" într-un obiect Date (an ales inteligent: dacă
// data e deja trecută cu mai mult de ~30 zile față de azi, se presupune
// anul următor; altfel anul curent).
function icsResolveDate(dayMonthStr, hour, minute) {
  const parsed = parseRoDate(dayMonthStr);
  if (!parsed) return null;

  const now = new Date();
  let year = now.getFullYear();
  let candidate = new Date(year, parsed.month, parsed.day, hour, minute, 0);

  const diffDays = (candidate - now) / (1000 * 60 * 60 * 24);
  if (diffDays < -30) {
    candidate = new Date(year + 1, parsed.month, parsed.day, hour, minute, 0);
  }
  return candidate;
}

function icsFormatDate(d) {
  return `${d.getFullYear()}${icsPad(d.getMonth() + 1)}${icsPad(d.getDate())}T${icsPad(d.getHours())}${icsPad(d.getMinutes())}00`;
}

function icsEscape(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function buildFieldServiceICS() {
  const schedule = state.fieldServiceSchedule;
  if (!schedule) return null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudiuMeu//Program Serviciu de Teren//RO',
    'CALSCALE:GREGORIAN',
  ];

  let count = 0;

  Object.keys(ICS_DAY_TIME).forEach(dayKey => {
    const day = schedule[dayKey];
    if (!day || !Array.isArray(day.rows)) return;
    const cfg = ICS_DAY_TIME[dayKey];

    day.rows.forEach((row, i) => {
      if (!row.data) return;
      const start = icsResolveDate(row.data, cfg.hour, cfg.minute);
      if (!start) return;
      const end = new Date(start.getTime() + cfg.durationMin * 60000);

      const uid = `studiumeu-fs-${dayKey}-${i}-${start.getFullYear()}${icsPad(start.getMonth() + 1)}${icsPad(start.getDate())}@studiumeu.local`;
      const summary = row.nume ? `${cfg.label} — ${row.nume}` : cfg.label;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${icsFormatDate(new Date())}Z`,
        `DTSTART:${icsFormatDate(start)}`,
        `DTEND:${icsFormatDate(end)}`,
        `SUMMARY:${icsEscape(summary)}`,
        `DESCRIPTION:${icsEscape('Program Întrunire de Ieșire pe Teren - StudiuMeu')}`,
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape('Mâine: ' + summary)}`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape(summary)}`,
        'END:VALARM',
        'END:VEVENT'
      );
      count++;
    });
  });

  lines.push('END:VCALENDAR');

  if (count === 0) return { ics: null, count: 0 };
  return { ics: lines.join('\r\n'), count };
}

function exportFieldServiceICS() {
  const result = buildFieldServiceICS();
  if (!result || !result.ics) {
    showToast('Nu există date valide în program pentru export.', 'error');
    return;
  }

  const blob = new Blob([result.ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'program-serviciu-teren.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Calendar exportat (${result.count} evenimente) 📅 — deschide fișierul ca să-l imporți.`, 'success');
}
