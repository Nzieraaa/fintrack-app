/* ════════════════════════════════════════════
   FinTrack v3 — firebase-sync.js
   Override fungsi data di app.js agar
   semua write juga dikirim ke Firestore.
   File ini dimuat SETELAH app.js.
════════════════════════════════════════════ */

// ── Helper: apakah Firebase siap? ──────────
function fbReady() {
  return !!(window.FB && App.uid);
}

// ── SAVINGS ────────────────────────────────

window.saveTarget = async function() {
  const name   = document.getElementById('nt-name')?.value.trim();
  const rawTgt = document.getElementById('nt-target')?.value;
  const rawAmt = document.getElementById('nt-amount')?.value;
  const freq   = parseInt(document.getElementById('nt-freq')?.value || '1');
  const sym    = document.getElementById('nt-cur')?.value || 'Rp';
  const start  = document.getElementById('nt-start')?.value || '';
  const target = parseRaw(rawTgt);
  const amount = parseRaw(rawAmt);

  if (!name)      { showToast('Nama tabungan wajib diisi', 'error'); return; }
  if (target <= 0){ showToast('Target harus lebih dari 0', 'error'); return; }
  if (amount <= 0){ showToast('Nominal setoran harus lebih dari 0', 'error'); return; }

  const imgArea = document.getElementById('img-area-nt');
  const imgEl   = imgArea?.querySelector('img');

  const payload = {
    name, target, current: 0, amount, freq,
    currency: sym, startDate: start,
    imgData: imgEl?.src || null,
    created: new Date().toISOString()
  };

  let id = 'sv_' + Date.now();
  if (fbReady()) {
    try {
      id = await window.FB.addSaving(App.uid, payload);
      showToast('Target tabungan disimpan ke cloud!', 'success');
    } catch(e) {
      console.error(e);
      showToast('Disimpan lokal (offline)', 'warn');
    }
  } else {
    showToast('Target tabungan berhasil disimpan!', 'success');
  }

  App.db.savings.push({ id, ...payload });
  App.save();

  ['nt-name','nt-target','nt-amount'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const ia = document.getElementById('img-area-nt');
  if (ia) ia.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg><p>Tambah gambar motivasi</p>`;
  const eb = document.getElementById('est-box');
  if (eb) eb.style.display = 'none';
  setTimeout(() => goTo('celengan'), 600);
};

window.openSaving = async function(id) {
  const s = App.db.savings.find(x => x.id === id);
  if (!s) return;
  const sym = s.currency || 'Rp';
  const pct = s.target > 0 ? Math.round((s.current / s.target) * 100) : 0;
  const amt = prompt(
    `${s.name}\nTerkumpul : ${formatMoney(s.current, sym)}\nTarget    : ${formatMoney(s.target, sym)} (${pct}%)\n\nMasukkan jumlah setoran, atau -angka untuk tarik:`
  );
  if (amt === null) return;
  const n = parseFloat((amt + '').replace(/[^\d.-]/g, ''));
  if (isNaN(n)) { showToast('Jumlah tidak valid', 'error'); return; }
  s.current = Math.max(0, s.current + n);

  if (fbReady()) {
    try {
      await window.FB.updateSaving(App.uid, id, { current: s.current });
    } catch(e) { console.error(e); }
  }
  App.save();
  renderCelengan();
  showToast(n >= 0 ? `Setoran ${formatMoney(n, sym)} dicatat` : `Penarikan dicatat`, 'success');
};

// ── FLEXIBLE ───────────────────────────────

window.saveFleksibel = async function() {
  const name  = document.getElementById('fl-name')?.value.trim();
  const sym   = document.getElementById('fl-cur')?.value || 'Rp';
  const saldo = parseRaw(document.getElementById('fl-saldo')?.value || '');
  const note  = document.getElementById('fl-note')?.value?.trim() || '';

  if (!name) { showToast('Nama tabungan wajib diisi', 'error'); return; }

  const payload = { name, currency: sym, saldo, note, created: new Date().toISOString() };
  let id = 'fl_' + Date.now();
  if (fbReady()) {
    try {
      id = await window.FB.addFlexible(App.uid, payload);
    } catch(e) { console.error(e); }
  }
  App.db.flexible.push({ id, ...payload });
  App.save();
  showToast('Tabungan fleksibel disimpan!', 'success');
  ['fl-name','fl-saldo','fl-note'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  setTimeout(() => goTo('tabungan-fleksibel'), 600);
};

window.openFleksibel = async function(id) {
  const f = App.db.flexible.find(x => x.id === id);
  if (!f) return;
  const sym = f.currency || 'Rp';
  const amt = prompt(`${f.name}\nSaldo: ${formatMoney(f.saldo, sym)}\n\nMasukkan jumlah (+deposit / -tarik):`);
  if (amt === null) return;
  const n = parseFloat((amt + '').replace(/[^\d.-]/g, ''));
  if (isNaN(n)) { showToast('Jumlah tidak valid', 'error'); return; }
  f.saldo = Math.max(0, f.saldo + n);
  if (fbReady()) {
    try {
      await window.FB.updateFlexible(App.uid, id, { saldo: f.saldo });
    } catch(e) { console.error(e); }
  }
  App.save();
  renderFleksibel();
  showToast(n >= 0 ? 'Setoran berhasil' : 'Penarikan berhasil', 'success');
};

// ── TODOS ──────────────────────────────────

window.saveTodo = async function() {
  const name   = document.getElementById('td-name')?.value.trim();
  const cat    = document.getElementById('td-cat')?.value || 'other';
  const amount = parseRaw(document.getElementById('td-amount')?.value || '');
  const due    = document.getElementById('td-due')?.value || '';
  const period = document.getElementById('td-period')?.value || 'Bulanan';
  const note   = document.getElementById('td-note')?.value?.trim() || '';

  if (!name) { showToast('Nama tagihan wajib diisi', 'error'); return; }

  const payload = {
    name, cat, amount, due, period, note,
    status: 'belum',
    created: new Date().toISOString()
  };
  let id = 'td_' + Date.now();
  if (fbReady()) {
    try {
      id = await window.FB.addTodo(App.uid, payload);
    } catch(e) { console.error(e); }
  }
  App.db.todos.push({ id, ...payload });
  App.save();
  showToast('Pengeluaran berhasil disimpan!', 'success');
  ['td-name','td-amount','td-note'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  setTimeout(() => goTo('todo'), 600);
};

window.toggleTodo = async function(id) {
  const t = App.db.todos.find(x => x.id === id);
  if (!t) return;
  const states = ['belum', 'selesai', 'terlewat'];
  t.status = states[(states.indexOf(t.status) + 1) % states.length];
  if (fbReady()) {
    try {
      await window.FB.updateTodo(App.uid, id, { status: t.status });
    } catch(e) { console.error(e); }
  }
  App.save();
  renderTodo();
  const msg = { selesai:'Tagihan ditandai selesai', terlewat:'Ditandai terlewat', belum:'Status direset' }[t.status];
  showToast(msg, t.status === 'selesai' ? 'success' : 'default');
};

// ── TRANSACTIONS ───────────────────────────

window.saveTrx = async function() {
  const amount = parseRaw(document.getElementById('trx-amt')?.value || '');
  const desc   = document.getElementById('trx-desc')?.value.trim() || '';
  if (amount <= 0) { showToast('Nominal harus lebih dari 0', 'error'); return; }

  const payload = {
    type: App.trxType,
    amount, desc,
    date: new Date().toISOString()
  };
  let id = 'trx_' + Date.now();
  if (fbReady()) {
    try {
      id = await window.FB.addTransaction(App.uid, payload);
    } catch(e) { console.error(e); }
  }
  App.db.trx.unshift({ id, ...payload });
  App.save();
  showToast('Transaksi berhasil dicatat', 'success');
  ['trx-amt','trx-desc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  renderLaporan();
};

// ── SETTINGS ───────────────────────────────

window.setBudget = async function() {
  const val = prompt('Masukkan budget bulanan (angka saja):', App.db.budget || '');
  if (val === null) return;
  const n = parseFloat((val + '').replace(/[^\d]/g, ''));
  if (isNaN(n) || n < 0) { showToast('Nominal tidak valid', 'error'); return; }
  App.db.budget = n;
  App.save();
  if (fbReady()) {
    try {
      await window.FB.saveUserSettings(App.uid, { budget: n });
    } catch(e) { console.error(e); }
  }
  renderPengaturan();
  showToast(`Budget ${formatMoney(n)} disimpan`, 'success');
};

window.setEmergency = async function() {
  const val = prompt('Batas emergency fund (angka saja):', App.db.emergency || '500000');
  if (val === null) return;
  const n = parseFloat((val + '').replace(/[^\d]/g, ''));
  if (isNaN(n) || n < 0) { showToast('Nominal tidak valid', 'error'); return; }
  App.db.emergency = n;
  App.save();
  if (fbReady()) {
    try {
      await window.FB.saveUserSettings(App.uid, { emergency: n });
    } catch(e) { console.error(e); }
  }
  renderPengaturan();
  showToast(`Batas emergency ${formatMoney(n)} disimpan`, 'success');
};

console.log('[FinTrack] Firebase sync patch ready ✓');
