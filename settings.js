'use strict';

// ============================================
// SETĂRI – deschidere / închidere modal
// ============================================
function openSettingsModal() {
  document.getElementById('settingsModal')?.classList.add('open');
  if (typeof renderTransferSettings === 'function') renderTransferSettings();
  if (typeof updateBackupStatusUI === 'function') updateBackupStatusUI();
  if (typeof renderCollaboratorsSettings === 'function') renderCollaboratorsSettings();
  if (typeof renderFieldServiceLockSettings === 'function') renderFieldServiceLockSettings();
  if (typeof initInstallGuide === 'function') initInstallGuide();
}

function closeSettingsModal() {
  document.getElementById('settingsModal')?.classList.remove('open');
}

// ============================================
// CE E NOU (changelog) — extensibil: adaugă o intrare nouă în
// APP_CHANGELOG de fiecare dată când adaugi o funcționalitate.
// ============================================
const APP_CHANGELOG = [
  {
    version: 'v0.9.3',
    date: '16 iulie 2026',
    changes: [
      'Blocare cu PIN pentru Programul principal de Ieșire pe Teren: din Setări (🔒 Blocare cu PIN — Program Teren) fiecare dintre cei doi colaboratori își setează propriul nume și propriul PIN (cifre și simboluri, ex: @ ! #). Tabelul rămâne blocat până se introduce un PIN corect, iar bara de blocare apare direct sub titlu, deasupra butoanelor.',
      'Tabelul se re-blochează automat de fiecare dată când pleci de pe pagina de Serviciu de Teren.',
    ],
  },
  {
    version: 'v0.9.2',
    date: '15 iulie 2026',
    changes: [
      'Programul pentru Întrunirea de Ieșire pe Teren are acum buton „💾 Salvează" (confirmare vizuală) și buton „📲 Trimite pe WhatsApp", care trimite tot programul (Marți/Vineri/Sâmbătă, cu dată și nume) ca mesaj gata formatat.',
      'Secțiune nouă „🗓️ Tabele Calendar Suplimentare": poți crea oricâte tabele de program vrei (ex. pentru perioade diferite), fiecare cu propriul titlu editabil și propriile butoane Salvează / Trimite pe WhatsApp / Șterge tabel. Toate tabelele rămân vizibile în același timp, unul sub altul, fără să se suprapună.',
      'Bifă nouă „Săptămână cu vizita supraveghetorului de circumscripție" la Programul principal: activând-o, introduci manual intervalul de date (De la / Până la), apare un mesaj informativ, rândurile din acel interval devin needitabile, iar „🧠 Sugerează programul" nu mai propune nume pentru acele date.',
    ],
  },
  {
    version: 'v0.9.1',
    date: '14 iulie 2026',
    changes: [
      'Buton nou „🧠 Sugerează programul" la Program Ieșire pe Teren: propune automat nume pentru rândurile cu dată completată dar fără nume, ținând cont de disponibilitatea fiecărui colaborator (Marți/Vineri/Sâmbătă), distribuind sarcinile echilibrat și evitând ca aceeași persoană să fie primul de două ori la rând. Propunerea nu modifică tabelul automat — se poate edita și apoi confirma cu „✅ Aplică sugestia" sau anula cu „✕ Anulează".',
      'Secțiune nouă „🚶 Colaboratori Program Teren" în Setări, unde adaugi numele colaboratorilor și bifezi zilele lor de disponibilitate.',
    ],
  },
  {
    version: 'v0.9.0',
    date: '13 iulie 2026',
    changes: [
      'Nouă secțiune „ℹ️ INFORMAȚIE" în Setări, cu explicații complete despre cum funcționează aplicația.',
      'Reamintire automată de backup, dacă nu ai mai exportat datele de peste 14 zile.',
      'Acest jurnal „Ce e nou", ca să vezi rapid ce s-a schimbat între versiuni.',
      'Indicator „Ultima trimitere reușită" la secțiunea Trimite Cuvântări.',
      'Mini-ghid de întrebări frecvente (FAQ) în secțiunea Informație.',
      'Buton nou „Șterge toate datele", cu avertisment dublu, pentru un reset curat al aplicației.',
    ],
  },
  {
    version: 'v0.8.0',
    date: 'versiune anterioară',
    changes: [
      'Trimite/primește cuvântări direct între telefoane, fără WhatsApp sau e-mail.',
      'Materiale video redate direct din aplicație, cu reconectare automată a fișierului pe Chrome/Edge.',
      'Notificări pentru programul de ieșire în serviciul de teren.',
    ],
  },
];

function renderChangelog() {
  const container = document.getElementById('changelogList');
  if (!container) return;
  container.innerHTML = APP_CHANGELOG.map(entry => `
    <div class="changelog-entry">
      <div class="changelog-version">${escHtml(entry.version)} <span class="changelog-date">— ${escHtml(entry.date)}</span></div>
      <ul>${entry.changes.map(c => `<li>${escHtml(c)}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function openChangelogModal() {
  renderChangelog();
  document.getElementById('changelogModal')?.classList.add('open');
}

function closeChangelogModal() {
  document.getElementById('changelogModal')?.classList.remove('open');
}

// ============================================
// SWITCH TEMĂ (în panoul de Setări)
// Folosește toggleTheme() deja existentă în theme.js.
// Poziția cercului alb pe pistă e controlată automat de CSS
// pe baza atributului data-theme (portat din aplicația "index").
// ============================================
function toggleSettingsTheme() {
  toggleTheme();
}

// ============================================
// EXPORT CUVÂNTĂRI CA WORD (.doc)
// Include Cuvântarea de 5 minute (ciornă curentă)
// și toate Cuvântările de 30 minute salvate.
// ============================================
function exportTalksWord() {
  try {
    const today = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

    let body = `<h1>Cuvântări – StudiuMeu</h1><p class="meta">Exportat la data de ${escHtml(today)}</p>`;

    // --- Cuvântările de 5 minute ---
    body += `<h2>🎤 Cuvântările de 5 minute</h2>`;
    const talks5 = Array.isArray(state.talk5Talks) ? state.talk5Talks : [];

    if (talks5.length === 0) {
      body += `<p>Nicio cuvântare de 5 minute salvată încă.</p>`;
    } else {
      const sorted5 = [...talks5].sort((a, b) => new Date(b.date) - new Date(a.date));
      sorted5.forEach(talk => {
        body += `<h3>${escHtml(talk.subject || 'Fără subiect')} — ${escHtml(formatDate(talk.date))} (${escHtml(talk.duration || '5 minute')})</h3>`;
        body += `<p><strong>Notițe:</strong></p>`;
        body += `<p>${escHtml(talk.notes || '').replace(/\n/g, '<br>') || '—'}</p>`;
        body += `<hr>`;
      });
    }

    // --- Cuvântările de 30 minute (Discurs Biblic) ---
    body += `<h2>📢 Cuvântările de 30 minute (Discurs Biblic)</h2>`;
    const talks30 = Array.isArray(state.discursTalks) ? state.discursTalks : [];

    if (talks30.length === 0) {
      body += `<p>Nicio cuvântare de 30 minute salvată încă.</p>`;
    } else {
      const sorted = [...talks30].sort((a, b) => new Date(b.data) - new Date(a.data));
      sorted.forEach(talk => {
        const sections = Array.isArray(talk.sections) ? talk.sections : [];
        const totalMin = sections.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

        body += `<h3>${escHtml(talk.titlu || 'Fără titlu')} — ${escHtml(formatDate(talk.data))} (${totalMin} min)</h3>`;
        if (talk.verset) body += `<p><strong>Verset:</strong> ${escHtml(talk.verset)}</p>`;

        if (sections.length) {
          body += `<p><strong>Subtitluri:</strong></p><ol>`;
          sections.forEach(s => {
            body += `<li>${escHtml(s.title)} (${escHtml(String(s.duration))} min)</li>`;
          });
          body += `</ol>`;
        }

        body += `<p><strong>Notițe:</strong></p>`;
        body += `<p>${escHtml(talk.note || '').replace(/\n/g, '<br>') || '—'}</p>`;
        body += `<hr>`;
      });
    }

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Cuvântări</title>
        <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; color: #1a2035; }
          h1 { color: #2b5797; font-size: 20pt; margin-bottom: 4pt; }
          h2 { color: #4f8ef7; font-size: 15pt; margin-top: 22pt; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
          h3 { font-size: 13pt; margin-top: 16pt; margin-bottom: 2pt; }
          .meta { color: #666; font-size: 10pt; margin-bottom: 14pt; }
          hr { border: none; border-top: 1px solid #ddd; margin: 14pt 0; }
        </style>
      </head>
      <body>${body}</body>
      </html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const dateForFile = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `cuvantari-studiu-meu-${dateForFile}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast('Cuvântările au fost exportate în Word! 📝', 'success');
  } catch (error) {
    console.error('Export Word error:', error);
    showToast('Nu s-au putut exporta cuvântările.', 'error');
  }
}

// ============================================
// GHID INSTALARE APLICAȚIE (Android / iPhone) — secțiunea INFORMAȚIE din Setări
// ============================================
let _installGuideInitDone = false;

function detectInstallOS() {
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  // iPadOS 13+ pe Safari se maschează ca Mac cu suport touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return 'ios';
  return null;
}

function showInstallPanel(os) {
  document.getElementById('installPanelAndroid')?.classList.toggle('active', os === 'android');
  document.getElementById('installPanelIos')?.classList.toggle('active', os === 'ios');
  document.getElementById('installBtnAndroid')?.classList.toggle('active', os === 'android');
  document.getElementById('installBtnIos')?.classList.toggle('active', os === 'ios');
}

function initInstallGuide() {
  if (_installGuideInitDone) return;
  _installGuideInitDone = true;

  const icon = document.getElementById('installDetectedIcon');
  const text = document.getElementById('installDetectedText');
  const detected = detectInstallOS();

  if (detected === 'android') {
    if (icon) icon.textContent = '🤖';
    if (text) text.textContent = 'Am detectat un dispozitiv Android — vezi pașii pentru Chrome mai jos.';
    showInstallPanel('android');
  } else if (detected === 'ios') {
    if (icon) icon.textContent = '🍎';
    if (text) text.textContent = 'Am detectat un iPhone — vezi pașii pentru Safari mai jos.';
    showInstallPanel('ios');
  } else {
    if (icon) icon.textContent = '❔';
    if (text) text.textContent = 'Nu am putut detecta automat dispozitivul.';
    showInstallPanel('android');
  }
}
