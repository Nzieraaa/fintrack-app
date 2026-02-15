'use strict';
/* ════════════════════════════════════════════
   FinTrack v3 — app.js
   • Full-screen page swap (NO browser scroll)
   • Format: Rp 50.000,- (real-time)
   • Galaxy dark mode (canvas stars)
   • localStorage (ready for Firebase)
   • ZERO emoji in UI
════════════════════════════════════════════ */

// ══════════════════════════════════
// STATE
// ══════════════════════════════════
const App = {
  currentPage: null,
  pageHistory: [],
  user: null,
  trxType: 'pemasukan',

  db: {
    savings:   JSON.parse(localStorage.getItem('ft3_sv')   || '[]'),
    flexible:  JSON.parse(localStorage.getItem('ft3_fl')   || '[]'),
    todos:     JSON.parse(localStorage.getItem('ft3_td')   || '[]'),
    trx:       JSON.parse(localStorage.getItem('ft3_trx')  || '[]'),
    budget:    +localStorage.getItem('ft3_bgt')  || 0,
    emergency: +localStorage.getItem('ft3_emg')  || 500000,
  },

  save() {
    localStorage.setItem('ft3_sv',  JSON.stringify(this.db.savings));
    localStorage.setItem('ft3_fl',  JSON.stringify(this.db.flexible));
    localStorage.setItem('ft3_td',  JSON.stringify(this.db.todos));
    localStorage.setItem('ft3_trx', JSON.stringify(this.db.trx));
    localStorage.setItem('ft3_bgt', this.db.budget);
    localStorage.setItem('ft3_emg', this.db.emergency);
  }
};

// ══════════════════════════════════
// MONEY FORMAT
// ══════════════════════════════════
const CURRENCY_SYMBOLS = { 'Rp': 'id-ID', '$': 'en-US', '€': 'de-DE', '¥': 'ja-JP' };

function parseRaw(str) {
  if (typeof str === 'number') return str;
  return parseFloat((str + '').replace(/[^\d]/g, '')) || 0;
}

function formatMoney(num, symbol = 'Rp') {
  const n = Math.round(parseFloat(num) || 0);
  const locale = CURRENCY_SYMBOLS[symbol] || 'id-ID';
  const formatted = n.toLocaleString(locale, { minimumFractionDigits: 0 });
  if (symbol === 'Rp') return `Rp ${formatted},-`;
  if (symbol === '$')  return `$ ${formatted},-`;
  if (symbol === '€')  return `€ ${formatted},-`;
  if (symbol === '¥')  return `¥ ${formatted},-`;
  return `${symbol} ${formatted},-`;
}

// Real-time input formatter
function onMoneyInput(el, curSelId) {
  const raw = el.value.replace(/[^\d]/g, '');
  if (!raw) { el.value = ''; return; }
  const n = parseInt(raw, 10);
  const sym = curSelId ? (document.getElementById(curSelId)?.value || 'Rp') : 'Rp';
  const locale = CURRENCY_SYMBOLS[sym] || 'id-ID';
  el.value = n.toLocaleString(locale);
  // Keep cursor at end
  requestAnimationFrame(() => {
    try { el.setSelectionRange(el.value.length, el.value.length); } catch(e) {}
  });
}

function updateCurrencyPrefix() {
  // Re-format any existing value when currency changes
  const tEl = document.getElementById('nt-target');
  const aEl = document.getElementById('nt-amount');
  if (tEl && tEl.value) onMoneyInput(tEl, 'nt-cur');
  if (aEl && aEl.value) onMoneyInput(aEl, 'nt-cur');
  calcEst();
}

// ══════════════════════════════════
// AUTH NAVIGATION (splash/signin/register layer)
// ══════════════════════════════════
const AUTH_PAGES = ['splash', 'signin', 'register'];

function authGo(page) {
  AUTH_PAGES.forEach(p => {
    const el = document.getElementById('pg-' + p);
    if (el) el.classList.remove('active');
  });
  const target = document.getElementById('pg-' + page);
  if (target) {
    target.classList.add('active');
    // Scroll to top of auth page
    target.querySelector('.auth-center') && (target.querySelector('.auth-center').scrollTop = 0);
    target.scrollTop = 0;
  }
}

// ══════════════════════════════════
// APP NAVIGATION (full page swap)
// ══════════════════════════════════
const MAIN_PAGES = [
  'dashboard','celengan','target-baru',
  'tabungan-fleksibel','tambah-fleksibel',
  'todo','tambah-todo',
  'laporan','pengaturan'
];

// NAV_PAGES = pages shown in bottom nav / sidebar
const NAV_PAGES = ['dashboard','celengan','todo','laporan','pengaturan'];

function navTo(page) {
  // Clear history when navigating via nav bar (root pages)
  App.pageHistory = [];
  goTo(page);
}

function goTo(page) {
  const fromId = App.currentPage ? 'page-' + App.currentPage : null;
  const toEl   = document.getElementById('page-' + page);
  if (!toEl) return;

  // Push history
  if (App.currentPage && App.currentPage !== page) {
    App.pageHistory.push(App.currentPage);
  }

  // Hide current
  if (fromId) {
    const fromEl = document.getElementById(fromId);
    if (fromEl) fromEl.classList.remove('active');
  }

  // Show new
  App.currentPage = page;
  toEl.classList.add('active');

  // Reset scroll position of page-content inside this page
  const content = toEl.querySelector('.page-content');
  if (content) content.scrollTop = 0;

  // Update nav indicators
  updateNavActive(page);

  // Run page render
  onPageEnter(page);
}

function goBack() {
  if (App.pageHistory.length === 0) {
    goTo('dashboard');
    return;
  }
  const prev = App.pageHistory.pop();
  const fromEl = document.getElementById('page-' + App.currentPage);
  const toEl   = document.getElementById('page-' + prev);
  if (!toEl) { goTo('dashboard'); return; }

  if (fromEl) fromEl.classList.remove('active');
  App.currentPage = prev;
  toEl.classList.add('active');

  const content = toEl.querySelector('.page-content');
  if (content) content.scrollTop = 0;

  updateNavActive(prev);
  onPageEnter(prev);
}

function updateNavActive(page) {
  // Bottom nav
  document.querySelectorAll('#bottom-nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  // Sidebar
  document.querySelectorAll('#sidebar .sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

function onPageEnter(page) {
  switch (page) {
    case 'dashboard':         renderDashboard();      break;
    case 'celengan':          renderCelengan();        break;
    case 'tabungan-fleksibel':renderFleksibel();       break;
    case 'todo':              renderTodo();            break;
    case 'laporan':           renderLaporan();         break;
    case 'pengaturan':        renderPengaturan();      break;
  }
}

// ══════════════════════════════════
// THEME
// ══════════════════════════════════
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('ft3_theme', next);
  applyThemeUI(next);
  if (next === 'dark') initGalaxy(); else stopGalaxy();
}

function applyThemeUI(theme) {
  const dark = theme === 'dark';

  // Moon / sun icon path data
  const moonPath = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  const sunPath  = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  const icoInner = dark ? sunPath : moonPath;

  // Update all theme icon elements
  ['topbar-theme-ico','sb-theme-ico','pf-theme-ico'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = icoInner;
  });

  // Sidebar label
  const sbLbl = document.getElementById('sb-theme-lbl');
  if (sbLbl) sbLbl.textContent = dark ? 'Mode Terang' : 'Mode Gelap';

  // Pengaturan page
  const pfName = document.getElementById('pf-theme-name');
  const pfDesc = document.getElementById('pf-theme-desc');
  const pfTgl  = document.getElementById('pf-dark-toggle');
  if (pfName) pfName.textContent = dark ? 'Mode Terang' : 'Mode Gelap (Galaxy)';
  if (pfDesc) pfDesc.textContent = dark ? 'Kembali ke tema terang' : 'Aktifkan tema galaxy';
  if (pfTgl)  pfTgl.classList.toggle('on', dark);

  // Meta theme-color
  const meta = document.getElementById('meta-tc');
  if (meta) meta.content = dark ? '#0c0b18' : '#f7e8f2';
}

// ══════════════════════════════════
// GALAXY STARS (canvas)
// ══════════════════════════════════
let galaxyRAF = null;
const stars = [];

function initGalaxy() {
  const canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // Generate stars
  stars.length = 0;
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      speed: Math.random() * 0.005 + 0.002,
      phase: Math.random() * Math.PI * 2
    });
  }

  let t = 0;
  function draw() {
    if (document.documentElement.getAttribute('data-theme') !== 'dark') {
      canvas.style.display = 'none';
      return;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.01;
    stars.forEach(s => {
      const alpha = (Math.sin(t * s.speed * 60 + s.phase) + 1) / 2;
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,210,255,${alpha * 0.65})`;
      ctx.fill();
    });
    galaxyRAF = requestAnimationFrame(draw);
  }
  if (galaxyRAF) cancelAnimationFrame(galaxyRAF);
  draw();
}

function stopGalaxy() {
  if (galaxyRAF) cancelAnimationFrame(galaxyRAF);
  const canvas = document.getElementById('galaxy-canvas');
  if (canvas) canvas.style.display = 'none';
}

// ══════════════════════════════════
// TOAST
// ══════════════════════════════════
function showToast(msg, type = 'default') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type !== 'default' ? ' ' + type : '');
  t.textContent = msg;
  root.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 380);
  }, 2800);
}

// ══════════════════════════════════
// IMAGE PREVIEW
// ══════════════════════════════════
function previewImg(input, areaId) {
  const area = document.getElementById(areaId);
  if (!area || !input.files?.[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    area.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;"/>`;
  };
  reader.readAsDataURL(input.files[0]);
}

// ══════════════════════════════════
// CHIP SELECT HELPER
// ══════════════════════════════════
function chipSel(el) {
  el.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// ══════════════════════════════════
// AUTH — Firebase
// ══════════════════════════════════

// Loading state helper
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '.6' : '1';
  btn.textContent = loading ? 'Memproses...' : btn.dataset.label || btn.textContent;
}

async function doSignIn() {
  const email = document.getElementById('si-email')?.value.trim();
  const pass  = document.getElementById('si-pass')?.value;
  if (!email || !pass) { showToast('Email dan password wajib diisi', 'error'); return; }
  try {
    const btn = document.querySelector('#pg-signin .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
    const user = await window.FB.signIn(email, pass);
    await enterApp(user);
  } catch (err) {
    handleAuthError(err);
    const btn = document.querySelector('#pg-signin .btn-primary');
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }
  }
}

async function doRegister() {
  const name  = document.getElementById('rg-name')?.value.trim();
  const email = document.getElementById('rg-email')?.value.trim();
  const pass  = document.getElementById('rg-pass')?.value;
  const pass2 = document.getElementById('rg-pass2')?.value;

  if (!name)           { showToast('Nama lengkap wajib diisi', 'error'); return; }
  if (!email)          { showToast('Email wajib diisi', 'error'); return; }
  if (pass.length < 8) { showToast('Password minimal 8 karakter', 'error'); return; }
  if (pass !== pass2)  { showToast('Konfirmasi password tidak cocok', 'error'); return; }

  try {
    const btn = document.querySelector('#pg-register .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Membuat akun...'; }
    const user = await window.FB.register(name, email, pass);
    showToast('Akun berhasil dibuat!', 'success');
    await enterApp(user);
  } catch (err) {
    handleAuthError(err);
    const btn = document.querySelector('#pg-register .btn-primary');
    if (btn) { btn.disabled = false; btn.textContent = 'Buat Akun'; }
  }
}

async function doOAuth(provider) {
  try {
    let user;
    if (provider === 'Google') {
      user = await window.FB.googleSignIn();
    } else if (provider === 'Facebook') {
      user = await window.FB.facebookSignIn();
    }
    if (user) await enterApp(user);
  } catch (err) {
    handleAuthError(err);
  }
}

function handleAuthError(err) {
  const map = {
    'auth/user-not-found':       'Email tidak terdaftar',
    'auth/wrong-password':       'Password salah',
    'auth/invalid-credential':   'Email atau password salah',
    'auth/email-already-in-use': 'Email sudah digunakan',
    'auth/weak-password':        'Password terlalu lemah (min. 6 karakter)',
    'auth/invalid-email':        'Format email tidak valid',
    'auth/popup-closed-by-user': 'Login dibatalkan',
    'auth/network-request-failed':'Periksa koneksi internetmu',
    'auth/too-many-requests':    'Terlalu banyak percobaan, coba lagi nanti',
    'auth/popup-blocked':        'Popup diblokir browser. Izinkan popup untuk login Google',
  };
  const msg = map[err.code] || ('Error: ' + (err.message || 'Terjadi kesalahan'));
  showToast(msg, 'error');
  console.error('[Auth Error]', err.code, err.message);
}

async function enterApp(fbUser) {
  // Ambil nama dari Firestore atau fallback ke displayName
  let name = fbUser.displayName || 'Pengguna';
  try {
    const data = await window.FB.getUserData(fbUser.uid);
    if (data?.name) name = data.name;
  } catch(e) {}

  App.user = {
    uid:   fbUser.uid,
    name,
    email: fbUser.email,
    photo: fbUser.photoURL || null
  };

  // Load data dari Firestore
  await loadUserData(fbUser.uid);

  // Transisi masuk ke app
  const authLayer = document.getElementById('auth-layer');
  const appEl     = document.getElementById('app');

  authLayer.style.transition = 'opacity .35s ease';
  authLayer.style.opacity    = '0';
  setTimeout(() => {
    authLayer.style.display = 'none';
    appEl.style.display     = 'flex';
    appEl.style.opacity     = '0';
    appEl.style.transition  = 'opacity .35s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => { appEl.style.opacity = '1'; }));

    const today = new Date().toISOString().split('T')[0];
    ['nt-start','td-due'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value) el.value = today;
    });

    goTo('dashboard');
    showToast(`Selamat datang, ${name}!`, 'success');
  }, 350);
}

async function loadUserData(uid) {
  try {
    const [savings, flexible, todos, trx, userData] = await Promise.all([
      window.FB.getSavings(uid),
      window.FB.getFlexible(uid),
      window.FB.getTodos(uid),
      window.FB.getTransactions(uid),
      window.FB.getUserData(uid)
    ]);
    App.db.savings  = savings;
    App.db.flexible = flexible;
    App.db.todos    = todos;
    App.db.trx      = trx;
    if (userData?.budget)    App.db.budget    = userData.budget;
    if (userData?.emergency) App.db.emergency = userData.emergency;
  } catch (err) {
    console.error('[Firestore] Load error:', err);
    showToast('Gagal memuat data, menggunakan data lokal', 'warn');
    // Fallback ke localStorage
    App.db.savings  = JSON.parse(localStorage.getItem('ft3_sv')  || '[]');
    App.db.todos    = JSON.parse(localStorage.getItem('ft3_td')  || '[]');
    App.db.flexible = JSON.parse(localStorage.getItem('ft3_fl')  || '[]');
    App.db.trx      = JSON.parse(localStorage.getItem('ft3_trx') || '[]');
  }
}

async function doLogout() {
  if (!confirm('Yakin mau keluar dari FinTrack?')) return;
  try {
    await window.FB.signOut();
  } catch(e) {}

  App.user        = null;
  App.currentPage = null;
  App.pageHistory = [];
  App.db = { savings:[], flexible:[], todos:[], trx:[], budget:0, emergency:500000 };

  const appEl     = document.getElementById('app');
  const authLayer = document.getElementById('auth-layer');
  appEl.style.opacity    = '0';
  appEl.style.transition = 'opacity .3s ease';
  setTimeout(() => {
    appEl.style.display        = 'none';
    authLayer.style.display    = 'block';
    authLayer.style.opacity    = '0';
    authLayer.style.transition = 'opacity .3s ease';
    authGo('splash');
    requestAnimationFrame(() => requestAnimationFrame(() => { authLayer.style.opacity = '1'; }));
  }, 280);
  showToast('Sampai jumpa!');
}

function checkSession() {
  // Firebase onAuthReady akan handle auto-login
  function startAuth() {
    window.FB.onAuthReady(async (fbUser) => {
      if (fbUser) {
        await enterApp(fbUser);
      }
      // Jika tidak ada user, tetap di splash (sudah tampil default)
    });
  }

  if (window.FB) {
    // Firebase sudah siap langsung
    startAuth();
  } else {
    // Tunggu event firebase-ready dari firebase.js
    window.addEventListener('firebase-ready', startAuth, { once: true });
  }
}

// ══════════════════════════════════
// DASHBOARD
// ══════════════════════════════════
function renderDashboard() {
  const $ = id => document.getElementById(id);

  // User name
  if ($('dsh-uname') && App.user) $('dsh-uname').textContent = App.user.name;

  // Budget calc
  const spent = App.db.trx
    .filter(t => t.type === 'pengeluaran')
    .reduce((a, b) => a + b.amount, 0);
  const remaining = Math.max(App.db.budget - spent, 0);
  const pct = App.db.budget > 0 ? Math.round((remaining / App.db.budget) * 100) : 0;

  if ($('dsh-budget')) $('dsh-budget').textContent = formatMoney(remaining);
  if ($('dsh-bbar'))   $('dsh-bbar').style.width   = pct + '%';
  if ($('dsh-bpct'))   $('dsh-bpct').textContent   = `${pct}% sisa budget bulan ini`;
  if ($('dsh-scount')) $('dsh-scount').textContent  = App.db.savings.filter(s => s.current < s.target).length;

  // Alert
  const pending = App.db.todos.filter(t => t.status === 'belum');
  const alertEl = $('dsh-alert');
  if (alertEl) {
    alertEl.style.display = pending.length > 0 ? 'flex' : 'none';
    const txt = $('dsh-alert-txt');
    if (txt) txt.textContent = `${pending.length} tagihan belum dibayar — cek To Do List`;
  }

  // Savings preview (max 4)
  const svEl = $('dsh-savings');
  if (svEl) {
    const active = App.db.savings.filter(s => s.current < s.target).slice(0, 4);
    svEl.innerHTML = active.length === 0
      ? emptyState('Belum ada tabungan aktif', 'piggy')
      : active.map(s => savingCardHTML(s)).join('');
  }

  // Todos preview (max 3)
  const tdEl = $('dsh-todos');
  if (tdEl) {
    const upcoming = App.db.todos.filter(t => t.status === 'belum').slice(0, 3);
    tdEl.innerHTML = upcoming.length === 0
      ? emptyState('Tidak ada tagihan mendatang', 'check')
      : upcoming.map(t => todoItemHTML(t)).join('');
  }
}

// ══════════════════════════════════
// SAVINGS (Target)
// ══════════════════════════════════
function savingCardHTML(s) {
  const sym  = s.currency || 'Rp';
  const pct  = s.target > 0 ? Math.min(Math.round((s.current / s.target) * 100), 100) : 0;
  const days = calcDaysLeft(s);
  const freqMap = { 1: 'hari', 7: 'minggu', 30: 'bulan' };
  const fl = freqMap[s.freq] || 'periode';
  const barClass = pct >= 100 ? 'full' : pct >= 60 ? '' : pct >= 30 ? 'warn' : 'low';

  return `<div class="saving-card" onclick="openSaving('${s.id}')">
    <div class="sc-thumb">
      ${s.imgData
        ? `<img src="${s.imgData}"/>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><path d="M17 10c0-4-3.6-7-8-7S1 6 1 10c0 3.1 2 5.7 5 6.7V20h2v2h2v-2h2v-3.3c3-.9 5-3.6 5-6.7z"/><circle cx="16" cy="6" r="3"/><path d="M19 6h5"/></svg>`
      }
    </div>
    <div class="sc-name">${s.name}</div>
    <div class="sc-amount">${formatMoney(s.current, sym)}</div>
    <div class="sc-period">${formatMoney(s.amount, sym)} / ${fl}</div>
    <div class="sc-bar progress-track sm"><div class="progress-fill ${barClass}" style="width:${pct}%"></div></div>
    <div class="sc-foot">
      <span class="sc-days">${days > 0 ? `${days} hari lagi` : 'Tercapai'}</span>
      <span class="sc-pct">${pct}%</span>
    </div>
  </div>`;
}

function calcDaysLeft(s) {
  const rem = Math.max(s.target - s.current, 0);
  if (!s.amount || rem === 0) return 0;
  return Math.ceil((rem / s.amount) * (s.freq || 1));
}

function renderCelengan() {
  const active   = App.db.savings.filter(s => s.current < s.target);
  const achieved = App.db.savings.filter(s => s.current >= s.target && s.target > 0);

  const la = document.getElementById('list-aktif');
  const ld = document.getElementById('list-done');

  if (la) la.innerHTML = active.length === 0
    ? `<div style="grid-column:1/-1;">${emptyState('Belum ada tabungan aktif. Tap + untuk membuat', 'piggy')}</div>`
    : active.map(savingCardHTML).join('');

  if (ld) ld.innerHTML = achieved.length === 0
    ? `<div style="grid-column:1/-1;">${emptyState('Belum ada tabungan yang tercapai. Semangat!', 'trophy')}</div>`
    : achieved.map(s => achievedCardHTML(s)).join('');
}

function achievedCardHTML(s) {
  const sym = s.currency || 'Rp';
  return `<div class="saving-card">
    <div class="sc-thumb">${s.imgData ? `<img src="${s.imgData}"/>` : `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`}</div>
    <div class="sc-name">${s.name}</div>
    <div class="sc-amount">${formatMoney(s.target, sym)}</div>
    <div class="sc-period" style="color:var(--clr-success);font-weight:700;">Target tercapai!</div>
    <div class="sc-bar progress-track sm"><div class="progress-fill full" style="width:100%"></div></div>
    <div class="sc-foot"><span class="sc-days" style="color:var(--clr-success);">Selesai</span><span class="sc-pct">100%</span></div>
  </div>`;
}

function switchCelenganTab(tab) {
  const btnA = document.getElementById('tb-aktif');
  const btnD = document.getElementById('tb-done');
  const la   = document.getElementById('list-aktif');
  const ld   = document.getElementById('list-done');
  const chips= document.getElementById('chips-aktif');
  if (!btnA || !btnD || !la || !ld) return;
  const isAktif = tab === 'aktif';
  btnA.classList.toggle('active', isAktif);
  btnD.classList.toggle('active', !isAktif);
  la.style.display   = isAktif ? '' : 'none';
  ld.style.display   = isAktif ? 'none' : '';
  if (chips) chips.style.display = isAktif ? '' : 'none';
}

function openSaving(id) {
  const s = App.db.savings.find(x => x.id === id);
  if (!s) return;
  const sym = s.currency || 'Rp';
  const pct = s.target > 0 ? Math.round((s.current / s.target) * 100) : 0;
  const amt = prompt(
    `${s.name}\n` +
    `Terkumpul : ${formatMoney(s.current, sym)}\n` +
    `Target    : ${formatMoney(s.target, sym)} (${pct}%)\n\n` +
    `Masukkan jumlah setoran, atau -angka untuk tarik:`
  );
  if (amt === null) return;
  const n = parseFloat((amt + '').replace(/[^\d.-]/g, ''));
  if (isNaN(n)) { showToast('Jumlah tidak valid', 'error'); return; }
  s.current = Math.max(0, s.current + n);
  App.save();
  renderCelengan();
  showToast(n >= 0
    ? `Setoran ${formatMoney(n, sym)} berhasil dicatat`
    : `Penarikan berhasil dicatat`,
    'success'
  );
}

function saveTarget() {
  const name   = document.getElementById('nt-name')?.value.trim();
  const rawTgt = document.getElementById('nt-target')?.value;
  const rawAmt = document.getElementById('nt-amount')?.value;
  const freq   = parseInt(document.getElementById('nt-freq')?.value || '1');
  const sym    = document.getElementById('nt-cur')?.value  || 'Rp';
  const start  = document.getElementById('nt-start')?.value || '';
  const target = parseRaw(rawTgt);
  const amount = parseRaw(rawAmt);

  if (!name)     { showToast('Nama tabungan wajib diisi', 'error'); return; }
  if (target <= 0){ showToast('Target harus lebih dari 0', 'error'); return; }
  if (amount <= 0){ showToast('Nominal setoran harus lebih dari 0', 'error'); return; }

  const imgArea = document.getElementById('img-area-nt');
  const imgEl   = imgArea?.querySelector('img');

  App.db.savings.push({
    id: 'sv_' + Date.now(),
    name, target, current: 0, amount, freq, currency: sym,
    startDate: start,
    imgData: imgEl?.src || null,
    created: new Date().toISOString()
  });
  App.save();
  showToast('Target tabungan berhasil disimpan!', 'success');

  // Reset form
  ['nt-name','nt-target','nt-amount'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const ia = document.getElementById('img-area-nt');
  if (ia) ia.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg><p>Tambah gambar motivasi</p>`;
  const eb = document.getElementById('est-box');
  if (eb) eb.style.display = 'none';

  setTimeout(() => goTo('celengan'), 600);
}

function calcEst() {
  const tEl  = document.getElementById('nt-target');
  const aEl  = document.getElementById('nt-amount');
  const fEl  = document.getElementById('nt-freq');
  const box  = document.getElementById('est-box');
  const vEl  = document.getElementById('est-val');
  const dEl  = document.getElementById('est-date');
  if (!tEl || !aEl || !fEl || !box) return;

  const target = parseRaw(tEl.value);
  const amount = parseRaw(aEl.value);
  const freq   = parseInt(fEl.value);

  if (target > 0 && amount > 0) {
    const periods = Math.ceil(target / amount);
    const days    = periods * freq;
    const months  = Math.floor(days / 30);
    const remDays = days % 30;
    let label = '';
    if (months > 0)  label += months + ' bulan ';
    if (remDays > 0) label += remDays + ' hari';
    if (!label)      label = 'kurang dari 1 hari';

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const dtLabel = endDate.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

    if (vEl)  vEl.textContent  = '~' + label.trim();
    if (dEl)  dEl.textContent  = 'Perkiraan selesai: ' + dtLabel;
    box.style.display = 'block';
  } else {
    box.style.display = 'none';
  }
}

// ══════════════════════════════════
// FLEXIBLE SAVINGS
// ══════════════════════════════════
function renderFleksibel() {
  const el = document.getElementById('flex-list');
  if (!el) return;
  el.innerHTML = App.db.flexible.length === 0
    ? `<div style="grid-column:1/-1;">${emptyState('Belum ada tabungan fleksibel. Tap + untuk membuat', 'piggy')}</div>`
    : App.db.flexible.map(f => {
        const sym = f.currency || 'Rp';
        return `<div class="saving-card" onclick="openFleksibel('${f.id}')">
          <div class="sc-thumb"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/></svg></div>
          <div class="sc-name">${f.name}</div>
          <div class="sc-amount">${formatMoney(f.saldo, sym)}</div>
          <div class="sc-period">Tabungan Fleksibel</div>
          ${f.note ? `<div class="sc-days" style="margin-top:8px;font-size:12px;">${f.note}</div>` : ''}
        </div>`;
      }).join('');
}

function openFleksibel(id) {
  const f = App.db.flexible.find(x => x.id === id);
  if (!f) return;
  const sym = f.currency || 'Rp';
  const amt = prompt(`${f.name}\nSaldo: ${formatMoney(f.saldo, sym)}\n\nMasukkan jumlah (+deposit / -tarik):`);
  if (amt === null) return;
  const n = parseFloat((amt + '').replace(/[^\d.-]/g, ''));
  if (isNaN(n)) { showToast('Jumlah tidak valid', 'error'); return; }
  f.saldo = Math.max(0, f.saldo + n);
  App.save();
  renderFleksibel();
  showToast(n >= 0 ? `Setoran berhasil` : `Penarikan berhasil`, 'success');
}

function saveFleksibel() {
  const name  = document.getElementById('fl-name')?.value.trim();
  const sym   = document.getElementById('fl-cur')?.value || 'Rp';
  const saldo = parseRaw(document.getElementById('fl-saldo')?.value || '');
  const note  = document.getElementById('fl-note')?.value.trim() || '';

  if (!name) { showToast('Nama tabungan wajib diisi', 'error'); return; }

  App.db.flexible.push({ id: 'fl_' + Date.now(), name, currency: sym, saldo, note, created: new Date().toISOString() });
  App.save();
  showToast('Tabungan fleksibel disimpan!', 'success');

  ['fl-name','fl-saldo','fl-note'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  setTimeout(() => goTo('tabungan-fleksibel'), 600);
}

// ══════════════════════════════════
// TODO
// ══════════════════════════════════
const CAT_ICONS = {
  home:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  digital:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  food:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 2l1.5 16.5A2 2 0 0 0 6.5 20h11a2 2 0 0 0 2-1.5L21 2"/><path d="M8 2v5c0 1.1.9 2 2 2s2-.9 2-2V2"/></svg>`,
  transport: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  edu:       `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  health:    `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  entertain: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><polygon points="5,3 19,12 5,21 5,3"/></svg>`,
  shop:      `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  other:     `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
};
const CAT_COLORS = {
  home:'var(--clr-info-bg)', digital:'var(--clr-primary-light)', food:'var(--clr-warning-bg)',
  transport:'var(--clr-success-bg)', edu:'var(--clr-info-bg)', health:'var(--clr-danger-bg)',
  entertain:'var(--clr-primary-light)', shop:'var(--clr-warning-bg)', other:'var(--bg-input)',
};
const CAT_STROKES = {
  home:'var(--clr-info)', digital:'var(--clr-primary)', food:'var(--clr-warning)',
  transport:'var(--clr-success)', edu:'var(--clr-info)', health:'var(--clr-danger)',
  entertain:'var(--clr-primary)', shop:'var(--clr-warning)', other:'var(--txt-soft)',
};

function todoItemHTML(t) {
  const done = t.status === 'selesai';
  const late = t.status === 'terlewat';
  const chkCls  = done ? 'done' : late ? 'late' : '';
  const strikeSt = done ? 'text-decoration:line-through;opacity:.7;' : '';
  const dueSt    = late ? 'color:var(--clr-danger);font-weight:700;' : '';
  const dueMsg   = done ? 'Sudah dibayar' : late ? 'Terlewat!' : (t.due ? 'Jatuh tempo: ' + fmtDate(t.due) : '-');
  const icon     = CAT_ICONS[t.cat] || CAT_ICONS.other;
  const bg       = CAT_COLORS[t.cat] || 'var(--bg-input)';
  const stroke   = CAT_STROKES[t.cat] || 'var(--txt-soft)';

  const checkIcon = done
    ? `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>`
    : late
    ? `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    : '';

  return `<div class="todo-item" style="${strikeSt}">
    <div class="t-check ${chkCls}" onclick="toggleTodo('${t.id}')" style="position:relative;">
      ${checkIcon}
    </div>
    <div class="t-cat-ico" style="background:${bg};color:${stroke};">${icon}</div>
    <div class="t-info">
      <div class="t-name">${t.name}</div>
      <div class="t-due" style="${dueSt}">${dueMsg}</div>
    </div>
    <div class="t-amount">${formatMoney(t.amount)}</div>
  </div>`;
}

function renderTodo(filter = 'semua') {
  const all = App.db.todos;
  let list  = filter === 'semua' ? all : all.filter(t => t.status === filter);

  const total  = all.reduce((a, b) => a + Number(b.amount || 0), 0);
  const done   = all.filter(t => t.status === 'selesai').length;
  const pct    = all.length > 0 ? Math.round((done / all.length) * 100) : 0;

  const $ = id => document.getElementById(id);
  if ($('td-total')) $('td-total').textContent = formatMoney(total);
  if ($('td-pbar'))  $('td-pbar').style.width  = pct + '%';
  if ($('td-ptext')) $('td-ptext').textContent  = `${pct}% sudah ditandai (${done}/${all.length})`;

  const el = $('td-list');
  if (!el) return;
  el.innerHTML = list.length === 0
    ? emptyState(filter === 'semua' ? 'Belum ada tagihan. Tap + untuk menambah' : 'Tidak ada item dengan filter ini', 'check')
    : list.map(todoItemHTML).join('');
}

function filterTd(f, el) {
  chipSel(el);
  renderTodo(f);
}

function toggleTodo(id) {
  const t = App.db.todos.find(x => x.id === id);
  if (!t) return;
  const states = ['belum', 'selesai', 'terlewat'];
  t.status = states[(states.indexOf(t.status) + 1) % states.length];
  App.save();
  renderTodo();
  const msg = {
    'selesai': 'Tagihan ditandai selesai',
    'terlewat': 'Ditandai terlewat',
    'belum': 'Status direset ke belum'
  }[t.status];
  showToast(msg, t.status === 'selesai' ? 'success' : 'default');
}

function saveTodo() {
  const name   = document.getElementById('td-name')?.value.trim();
  const cat    = document.getElementById('td-cat')?.value || 'other';
  const amount = parseRaw(document.getElementById('td-amount')?.value || '');
  const due    = document.getElementById('td-due')?.value || '';
  const period = document.getElementById('td-period')?.value || 'Bulanan';
  const note   = document.getElementById('td-note')?.value?.trim() || '';

  if (!name) { showToast('Nama tagihan wajib diisi', 'error'); return; }

  App.db.todos.push({
    id: 'td_' + Date.now(),
    name, cat, amount, due, period, note,
    status: 'belum',
    created: new Date().toISOString()
  });
  App.save();
  showToast('Pengeluaran berhasil disimpan!', 'success');

  ['td-name','td-amount','td-note'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  setTimeout(() => goTo('todo'), 600);
}

// ══════════════════════════════════
// LAPORAN
// ══════════════════════════════════
function setTrxType(type) {
  App.trxType = type;
  const bi = document.getElementById('btn-in');
  const bo = document.getElementById('btn-out');
  if (!bi || !bo) return;
  const onSt  = 'flex:1;padding:10px;font-weight:700;border-radius:var(--r-pill);font-family:inherit;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;transition:var(--ease);border:2px solid;';
  const offSt = onSt + 'background:transparent;color:var(--txt-muted);border-color:var(--border);';
  if (type === 'pemasukan') {
    bi.style.cssText = onSt + `background:var(--clr-success-bg);color:var(--clr-success);border-color:var(--clr-success);`;
    bo.style.cssText = offSt;
  } else {
    bi.style.cssText = offSt;
    bo.style.cssText = onSt + `background:var(--clr-danger-bg);color:var(--clr-danger);border-color:var(--clr-danger);`;
  }
}

function renderLaporan() {
  const $ = id => document.getElementById(id);
  const income = App.db.trx.filter(t => t.type === 'pemasukan').reduce((a,b) => a + b.amount, 0);
  const outgo  = App.db.trx.filter(t => t.type === 'pengeluaran').reduce((a,b) => a + b.amount, 0);
  const sisa   = Math.max(App.db.budget - outgo, 0);
  const pct    = App.db.budget > 0 ? Math.round((sisa / App.db.budget) * 100) : 0;

  if ($('lp-sisa'))   $('lp-sisa').textContent   = formatMoney(sisa);
  if ($('lp-budget')) $('lp-budget').textContent  = formatMoney(App.db.budget);
  if ($('lp-bar'))    $('lp-bar').style.width     = pct + '%';
  if ($('lp-pct'))    $('lp-pct').textContent     = `${pct}% sisa budget`;
  if ($('lp-in'))     $('lp-in').textContent      = formatMoney(income);
  if ($('lp-out'))    $('lp-out').textContent     = formatMoney(outgo);

  const emg = $('lp-emergency');
  if (emg) emg.style.display = (sisa < App.db.emergency && App.db.budget > 0) ? 'flex' : 'none';

  const tl = $('trx-list');
  if (tl) {
    const list = [...App.db.trx].reverse().slice(0, 30);
    tl.innerHTML = list.length === 0
      ? emptyState('Belum ada transaksi dicatat', 'receipt')
      : list.map(t => `<div class="trx-item">
          <div class="trx-icon ${t.type === 'pemasukan' ? 'income' : 'expense'}">
            ${t.type === 'pemasukan'
              ? `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
              : `<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`
            }
          </div>
          <div class="trx-info">
            <div class="trx-name">${t.desc || (t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran')}</div>
            <div class="trx-date">${new Date(t.date).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
          <div class="trx-val ${t.type === 'pemasukan' ? 'income' : 'expense'}">
            ${t.type === 'pemasukan' ? '+' : '-'}${formatMoney(t.amount)}
          </div>
        </div>`).join('');
  }
}

function saveTrx() {
  const amount = parseRaw(document.getElementById('trx-amt')?.value || '');
  const desc   = document.getElementById('trx-desc')?.value.trim() || '';
  if (amount <= 0) { showToast('Nominal harus lebih dari 0', 'error'); return; }

  App.db.trx.push({
    id: 'trx_' + Date.now(),
    type: App.trxType,
    amount, desc,
    date: new Date().toISOString()
  });
  App.save();
  showToast('Transaksi berhasil dicatat', 'success');
  ['trx-amt','trx-desc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  renderLaporan();
}

// ══════════════════════════════════
// PENGATURAN
// ══════════════════════════════════
function renderPengaturan() {
  const $ = id => document.getElementById(id);
  if (App.user) {
    if ($('pf-name'))   $('pf-name').textContent  = App.user.name;
    if ($('pf-email'))  $('pf-email').textContent = App.user.email;
    const av = $('pf-avatar');
    if (av) av.textContent = (App.user.name || '?').charAt(0).toUpperCase();
  }
  if ($('pf-budget')) $('pf-budget').textContent = `Budget: ${formatMoney(App.db.budget)}`;
  if ($('pf-emg'))    $('pf-emg').textContent    = `Alert saat saldo < ${formatMoney(App.db.emergency)}`;
  // Dark toggle sync
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const tgl = $('pf-dark-toggle');
  if (tgl) tgl.classList.toggle('on', isDark);
}

function setBudget() {
  const val = prompt('Masukkan budget bulanan (angka saja):', App.db.budget || '');
  if (val === null) return;
  const n = parseFloat((val + '').replace(/[^\d]/g, ''));
  if (isNaN(n) || n < 0) { showToast('Nominal tidak valid', 'error'); return; }
  App.db.budget = n;
  App.save();
  renderPengaturan();
  showToast(`Budget ${formatMoney(n)} berhasil disimpan`, 'success');
}

function setEmergency() {
  const val = prompt('Batas emergency fund (angka saja):', App.db.emergency || '500000');
  if (val === null) return;
  const n = parseFloat((val + '').replace(/[^\d]/g, ''));
  if (isNaN(n) || n < 0) { showToast('Nominal tidak valid', 'error'); return; }
  App.db.emergency = n;
  App.save();
  renderPengaturan();
  showToast(`Batas emergency ${formatMoney(n)} disimpan`, 'success');
}

// ══════════════════════════════════
// UTILS
// ══════════════════════════════════
function fmtDate(str) {
  if (!str) return '-';
  return new Date(str).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
}

function emptyState(msg, type) {
  const icons = {
    piggy:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><path d="M17 10c0-4-3.6-7-8-7S1 6 1 10c0 3.1 2 5.7 5 6.7V20h2v2h2v-2h2v-3.3c3-.9 5-3.6 5-6.7z"/><circle cx="16" cy="6" r="3"/><path d="M19 6h5"/></svg>`,
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><polyline points="20,6 9,17 4,12"/></svg>`,
    trophy:  `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
    receipt: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`,
  };
  return `<div class="empty-state">
    <div class="empty-icon">${icons[type] || icons.check}</div>
    <p>${msg}</p>
  </div>`;
}

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  const saved = localStorage.getItem('ft3_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  applyThemeUI(saved);
  if (saved === 'dark') initGalaxy();

  // Ensure all main pages start hidden
  MAIN_PAGES.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.classList.remove('active');
  });

  // Restore session or show splash
  checkSession();
});
