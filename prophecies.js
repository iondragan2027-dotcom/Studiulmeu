'use strict';

// ============================================
// PROFEȚII ȘI ÎMPLINIREA LOR
// ============================================
function addProphecy() {
  const newProphecy = {
    id: Date.now().toString(),
    text: '',
    year: '',
    fulfillment: '',
    reference: ''
  };
  state.prophecies.push(newProphecy);
  saveState();
  renderProphecies();
  setTimeout(() => editProphecy(newProphecy.id), 100);
}

function deleteProphecy(id) {
  if (!confirm('Ștergi această profeție?')) return;
  state.prophecies = state.prophecies.filter(p => p.id !== id);
  saveState();
  renderProphecies();
  showToast('Profeția a fost ștearsă.', 'success');
}

function editProphecy(id) {
  const row = document.querySelector(`tr[data-prophecy-id="${id}"]`);
  if (!row) return;

  const prophecy = state.prophecies.find(p => p.id === id);
  if (!prophecy) return;

  row.classList.add('editing');

  const cells = row.querySelectorAll('td');
  cells[0].innerHTML = `<textarea class="prophecy-input-text">${escHtml(prophecy.text)}</textarea>`;
  cells[1].innerHTML = `<input type="text" class="prophecy-input-year" value="${escHtml(prophecy.year)}" placeholder="ex: 607 î.e.n." />`;
  cells[2].innerHTML = `<textarea class="prophecy-input-fulfillment">${escHtml(prophecy.fulfillment)}</textarea>`;
  cells[3].innerHTML = `<input type="text" class="prophecy-input-reference" value="${escHtml(prophecy.reference)}" placeholder="ex: Daniel 4:17" />`;
  cells[4].innerHTML = `
    <div class="edit-actions">
      <button class="save-edit" onclick="saveProphecyEdit('${id}')">💾 Salvează</button>
      <button class="cancel-edit" onclick="cancelProphecyEdit('${id}')">✕</button>
    </div>
  `;

  const firstInput = row.querySelector('textarea, input');
  if (firstInput) firstInput.focus();
}

function saveProphecyEdit(id) {
  const row = document.querySelector(`tr[data-prophecy-id="${id}"]`);
  if (!row) return;

  const prophecy = state.prophecies.find(p => p.id === id);
  if (!prophecy) return;

  const textInput = row.querySelector('.prophecy-input-text');
  const yearInput = row.querySelector('.prophecy-input-year');
  const fulfillmentInput = row.querySelector('.prophecy-input-fulfillment');
  const referenceInput = row.querySelector('.prophecy-input-reference');

  if (textInput) prophecy.text = textInput.value.trim();
  if (yearInput) prophecy.year = yearInput.value.trim();
  if (fulfillmentInput) prophecy.fulfillment = fulfillmentInput.value.trim();
  if (referenceInput) prophecy.reference = referenceInput.value.trim();

  if (!prophecy.text && !prophecy.year && !prophecy.fulfillment && !prophecy.reference) {
    state.prophecies = state.prophecies.filter(p => p.id !== id);
    showToast('Câmpurile goale au fost eliminate.', 'success');
  } else {
    showToast('Profeția a fost salvată! ✅', 'success');
  }

  saveState();
  renderProphecies();
}

function cancelProphecyEdit(id) {
  const row = document.querySelector(`tr[data-prophecy-id="${id}"]`);
  if (!row) return;

  const prophecy = state.prophecies.find(p => p.id === id);
  if (!prophecy) return;

  if (!prophecy.text && !prophecy.year && !prophecy.fulfillment && !prophecy.reference) {
    state.prophecies = state.prophecies.filter(p => p.id !== id);
    saveState();
  }

  renderProphecies();
}

function renderProphecies() {
  const tbody = document.getElementById('prophecyTableBody');
  const empty = document.getElementById('prophecyEmpty');
  if (!tbody) return;

  const sorted = [...state.prophecies].sort((a, b) => {
    const yearA = parseInt(a.year) || 0;
    const yearB = parseInt(b.year) || 0;
    return yearA - yearB;
  });

  if (sorted.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  tbody.innerHTML = sorted.map(p => `
    <tr data-prophecy-id="${p.id}">
      <td class="prophecy-text">${escHtml(p.text) || '—'}</td>
      <td class="prophecy-year">${escHtml(p.year) || '—'}</td>
      <td class="prophecy-fulfillment">${escHtml(p.fulfillment) || '—'}</td>
      <td class="prophecy-reference">${p.reference ? escHtml(p.reference) : '—'}</td>
      <td>
        <div class="prophecy-actions">
          <button class="edit-btn" onclick="editProphecy('${p.id}')" title="Editează">✏️</button>
          <button class="delete-btn" onclick="deleteProphecy('${p.id}')" title="Șterge">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function exportProphecies() {
  if (state.prophecies.length === 0) {
    showToast('Nu există profeții de exportat.', 'error');
    return;
  }

  let text = '📜 PROFEȚII ȘI ÎMPLINIREA LOR\n';
  text += '='.repeat(50) + '\n\n';

  const sorted = [...state.prophecies].sort((a, b) => {
    const yearA = parseInt(a.year) || 0;
    const yearB = parseInt(b.year) || 0;
    return yearA - yearB;
  });

  sorted.forEach((p, i) => {
    text += `${i + 1}. PROFECȚIA: ${p.text || '—'}\n`;
    text += `   📅 ANUL: ${p.year || '—'}\n`;
    text += `   ✅ ÎMPLINIREA: ${p.fulfillment || '—'}\n`;
    text += `   📖 REFERINȚĂ: ${p.reference || '—'}\n\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('Profețiile au fost copiate în clipboard! 📋', 'success');
  }).catch(() => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profetii-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Profețiile au fost exportate ca fișier! 📄', 'success');
  });
}

function addExampleProphecies() {
  if (state.prophecies.length > 0) {
    if (!confirm('Ai deja profeții salvate. Adaug exemplele?')) return;
  }

  const base = Date.now();
  const examples = [
    { id: `${base}_1`, text: 'Distrugerea Ierusalimului și a templului', year: '607 î.e.n.', fulfillment: 'Babilonienii au distrus Ierusalimul și templul lui Iehova, iar poporul a fost dus în captivitate.', reference: '2 Cronici 36:17-21' },
    { id: `${base}_2`, text: 'Revenirea evreilor din exil', year: '537 î.e.n.', fulfillment: 'Cirus al Persiei a permis evreilor să se întoarcă în Ierusalim și să reconstruiască templul.', reference: 'Ezra 1:1-4' },
    { id: `${base}_3`, text: 'Nașterea lui Isus Mesia', year: '2 î.e.n.', fulfillment: 'Isus s-a născut în Betleem, așa cum a fost profețit.', reference: 'Mica 5:1; Matei 2:1' }
  ];

  state.prophecies = [...state.prophecies, ...examples];
  saveState();
  renderProphecies();
  showToast('Exemple de profeții adăugate! 📜', 'success');
}

// ============================================
