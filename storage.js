/* ============================================
   StudiuMeu – STORAGE
   Tot ce ține de persistarea datelor în localStorage.
   ============================================ */

'use strict';

// Cheia principală sub care se salvează tot obiectul `state`
const STORAGE_KEY = 'studiuMeu_data';

/**
 * Forma implicită (goală) a stării aplicației. Folosită atât la pornirea
 * aplicației, cât și la import (dataIO.js), ca să existe UN SINGUR loc care
 * definește ce câmpuri are `state` — dacă se adaugă un câmp nou aici, el se
 * salvează și se restaurează automat la export/import, fără alt cod.
 */
function defaultAppState() {
  return {
    notes: [],
    verses: [],
    wtStudies: [],
    workbooks: [],
    discursTalks: [],
    meetings: [],
    temeCursant: [],
    prophecies: [],
    streak: 0,
    lastStudyDate: null,
    publications: [],
    videoMeta: {},
    songs: [],
    lastPlayedSongId: null,
    myUser: null,      // { id, name } — identitatea folosită la trimiterea cuvântărilor
    contacts: [],      // [{ id, name }] — persoane cu care s-au trimis/primit cuvântări
    bibleNotes: {},    // notițe/versete marcate per capitol din citirea Bibliei
    bibleOfflineText: {}, // textul versetelor scris/lipit de utilizator, per capitol (ex. "geneza-1")

    // Programul întrunirii de ieșire pe teren (3 coloane: Marți, Vineri, Sâmbătă)
    fieldServiceSchedule: null, // se inițializează cu valori implicite la loadState()

    // Tabele calendar suplimentare (create manual cu "Tabel Calendar Nou"),
    // fiecare cu structura { id, title, marti, vineri, sambata }, la fel ca
    // fieldServiceSchedule. Rămân toate salvate și vizibile simultan.
    fieldServiceExtraTables: [],

    // Colaboratori pentru "Sugerează programul" — [{ id, name, days: ['marti', ...] }]
    fieldServiceCollaborators: [],

    // Ține minte cine a fost primul în ultima sugestie APLICATĂ, ca să nu
    // înceapă următoarea sugestie tot cu aceeași persoană.
    fieldServiceScheduleMeta: { lastFirstPerson: null },

    // Blocare cu PIN a tabelului principal de program (Marți/Vineri/Sâmbătă),
    // ca să nu poată modifica oricine tabelul. Fiecare din cei doi are
    // propriul nume + PIN, setate din Setări. Starea „deblocat” NU se
    // salvează — se resetează automat de fiecare dată când se pleacă de pe
    // pagină sau se reîncarcă aplicația.
    fieldServiceLock: {
      enabled: false,
      people: [
        { name: '', pin: '' },
        { name: '', pin: '' },
      ],
    },

    // Setări notificări (anunț cu o zi înainte / în ziua respectivă)
    notifSettings: { enabled: false },
  };
}

// Starea centrală a aplicației. Toate modulele citesc/scriu în acest obiect.
let state = defaultAppState();

// Structura de bază (fără nume) a programului de ieșire în teren.
// NU pune nume reale aici — acest fișier se urcă pe GitHub.
// Numele reale se încarcă din field-service-data.local.js (fișier local,
// exclus din git prin .gitignore). Vezi field-service-data.example.js
// pentru formatul așteptat.
function defaultFieldServiceSchedule() {
  return {
    marti:   { label: 'MARȚI - ora 17 - ZOOM',              color: '#bcd4ea', rows: [] },
    vineri:  { label: 'VINERI - ora 17 - ZOOM',             color: '#f2c4ad', rows: [] },
    sambata: { label: 'SÂMBĂTĂ - ora 9.30 - Sala Regatului', color: '#f4c430', rows: [] },
    // Săptămâna cu vizita supraveghetorului de circumscripție — dacă e activă,
    // se afișează un mesaj informativ și se dezactivează programarea
    // colaboratorilor pentru intervalul de date de mai jos (setat manual).
    coWeek: { enabled: false, from: '', to: '' },
  };
}

/**
 * Încarcă `state` din localStorage și rulează curățarea notițelor/caietelor
 * "orfane" (fără notiță corespondentă), exact ca în versiunea originală.
 */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = { ...defaultAppState(), ...JSON.parse(saved) };

      // Cleanup orphaned watchtower studies (studies with no matching note)
      let cleaned = false;
      if (state.wtStudies && state.wtStudies.length > 0) {
        const initialCount = state.wtStudies.length;
        state.wtStudies = state.wtStudies.filter(study => {
          return state.notes.some(note =>
            note.id === study.id + '_wt' ||
            (note.category === 'watchtower' && note.title === `TV: ${study.title}`)
          );
        });
        if (state.wtStudies.length !== initialCount) cleaned = true;
      }

      // Cleanup orphaned workbooks
      if (state.workbooks && state.workbooks.length > 0) {
        const initialCount = state.workbooks.length;
        state.workbooks = state.workbooks.filter(wb => {
          return state.notes.some(note =>
            note.id === wb.id + '_wb' ||
            (note.category === 'workbook' && note.title === `Caiet: ${wb.week}`)
          );
        });
        if (state.workbooks.length !== initialCount) cleaned = true;
      }

      if (cleaned) {
        saveState();
      }
    }
  } catch (e) { console.error('Load error:', e); }

  // Dacă nu există deja un program salvat, se inițializează cu valorile din
  // field-service-data.local.js, dacă fișierul local există (vezi
  // field-service-data.example.js pentru șablon). Dacă nu există, programul
  // pornește gol și se completează din interfață.
  if (!state.fieldServiceSchedule) {
    const sch = defaultFieldServiceSchedule();
    if (typeof window !== 'undefined' && window.FIELD_SERVICE_SEED) {
      const seed = window.FIELD_SERVICE_SEED;
      ['marti', 'vineri', 'sambata'].forEach(day => {
        if (Array.isArray(seed[day])) {
          sch[day].rows = seed[day].map(([data, nume]) => ({ data, nume }));
        }
      });
    }
    state.fieldServiceSchedule = sch;
    saveState();
  } else if (!state.fieldServiceSchedule.coWeek) {
    // Migrare: programele salvate înainte de introducerea acestei opțiuni
    // nu au câmpul `coWeek` — îl adăugăm cu valori implicite.
    state.fieldServiceSchedule.coWeek = { enabled: false, from: '', to: '' };
    saveState();
  }

  // La fel ca la program: dacă nu există deja colaboratori salvați, se
  // inițializează din field-service-collaborators.local.js (dacă există).
  // Vezi field-service-collaborators.example.js pentru șablon.
  if ((!Array.isArray(state.fieldServiceCollaborators) || state.fieldServiceCollaborators.length === 0)
      && typeof window !== 'undefined' && Array.isArray(window.FIELD_SERVICE_COLLABORATORS_SEED)) {
    state.fieldServiceCollaborators = window.FIELD_SERVICE_COLLABORATORS_SEED.map((name, i) => ({
      id: `seed-${Date.now()}-${i}`,
      name,
      days: ['marti', 'vineri', 'sambata'],
      unavailableFrom: '',
      unavailableTo: '',
    }));
    saveState();
  }
}

/**
 * Salvează `state` curent în localStorage (serializat ca JSON).
 */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
