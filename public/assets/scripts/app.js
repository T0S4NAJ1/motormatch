'use strict';

/* ============================================================
   app.js — Controller Beranda MotorMatch (versi dengan login)
   Bagian 1: Beranda (katalog motor) — publik
   Bagian 2: Rekomendasi (wizard 6 kategori) — butuh login,
             dibuka di /user-dashboard.html

   Navigasi sadar sesi:
   - Belum login  -> tampil tombol Login & Daftar
   - Sudah login  -> tampil nama user, menu Rekomendasi, Logout
   Tombol/link ber-class ".go-rec" mengarah ke rekomendasi:
   - login  -> /user-dashboard.html
   - belum  -> /login.html
   ============================================================ */

// Fungsi format angka ke Rupiah
function fmt(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return '0';
  const num = Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
}

const Gallery = (() => {
  let brand = 'all';
  let tipe  = 'all';
  let cc    = 'all';

  function filtered() {
    return (window.MOTORS || []).filter(m => {
      if (brand !== 'all' && m.brand !== brand)   return false;
      if (tipe  !== 'all' && m.category !== tipe) return false;
      if (cc !== 'all') {
        if (cc === 'kecil' && m.cc > 125)  return false;
        if (cc === 'sedang' && (m.cc <= 125 || m.cc > 250)) return false;
      }
      return true;
    });
  }

  function card(m) {
    return `
      <div class="motor-card" data-modal-id="${m.id}">
        <div class="motor-thumb">
          <img src="${m.img}" alt="${m.brand} ${m.model}" loading="lazy"
               onerror="this.onerror=null;this.src='assets/images/placeholder.svg'">
          <span class="match-badge">${m.category}</span>
        </div>
        <div class="motor-info">
          <div class="motor-name-row">
            <span class="motor-name">${m.brand} ${m.model}</span>
            <span class="motor-year-tag">${m.year}</span>
          </div>
          <div class="motor-tags">
            <span class="tag">${m.cc}cc</span>
            <span class="tag">${m.power} hp</span>
            <span class="tag">${m.bbm} km/L</span>
          </div>
          <div class="motor-price">Rp ${fmt(m.harga)}</div>
        </div>
      </div>`;
  }

  function render() {
    const grid  = document.getElementById('gallery-grid');
    const count = document.getElementById('gallery-count');
    const list  = filtered();
    if (count) count.innerHTML = `Menampilkan <strong>${list.length}</strong> motor`;
    if (!grid) return;
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : `<div class="gallery-empty">Tidak ada motor untuk filter ini.</div>`;
  }

  function setBrand(value, btn) {
    brand = value;
    document.querySelectorAll('#gallery-brand .chip')
            .forEach(c => c.classList.toggle('active', c === btn));
    render();
  }
  function setTipe(value, btn) {
    tipe = value;
    document.querySelectorAll('#gallery-tipe .chip')
            .forEach(c => c.classList.toggle('active', c === btn));
    render();
  }
  function setCC(value, btn) {
    cc = value;
    document.querySelectorAll('#gallery-cc .chip')
            .forEach(c => c.classList.toggle('active', c === btn));
    render();
  }

  return { render, setBrand, setTipe, setCC };
})();


/* ----- Status login: simpan agar tombol .go-rec tahu harus ke mana ----- */
let isLoggedIn = false;
let currentUser = null;

function applySession(user) {
  isLoggedIn  = !!user;
  currentUser = user || null;

  const show = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };

  if (user) {
    show('nav-login', false);
    show('nav-register', false);
    show('nav-rekomendasi', true);
    show('nav-logout', true);
    show('nav-user-badge', true);
    const badge = document.getElementById('nav-user-badge');
    if (badge) badge.textContent = `[Login] ${user.full_name}`;
  } else {
    show('nav-login', true);
    show('nav-register', true);
    show('nav-rekomendasi', true);   // tetap terlihat; klik -> diarahkan ke login
    show('nav-logout', false);
    show('nav-user-badge', false);
  }
}

function goToRecommendation() {
  // Belum login -> ke halaman login (lalu kembali otomatis ke rekomendasi)
  location.href = isLoggedIn
    ? '/user-dashboard.html'
    : '/login.html?next=' + encodeURIComponent('/user-dashboard.html');
}


document.addEventListener('DOMContentLoaded', async () => {

  // 1) Muat data motor (MySQL bila ada, fallback data lokal)
  const statusEl = document.getElementById('db-status');
  if (window.DB && typeof DB.loadFromAPI === 'function') {
    const state = await DB.loadFromAPI();
    if (statusEl) {
      statusEl.textContent = state.source === 'mysql'
        ? `${state.count} data tersedia`
        : `${state.count} data lokal`;
      statusEl.classList.toggle('ok',   state.source === 'mysql');
      statusEl.classList.toggle('warn', state.source !== 'mysql');
    }
  }

  // 2) Render galeri
  Gallery.render();

  // 3) Cek sesi login (tidak memblokir beranda — beranda tetap publik)
  if (window.Auth && typeof Auth.me === 'function') {
    try {
      const user = await Auth.me();
      applySession(user);
    } catch (_) {
      Auth.clearSession && Auth.clearSession();
      applySession(null);
    }
  } else {
    applySession(null);
  }

  // 4) Tombol "Lihat Galeri Motor"
  const galeriBtn = document.getElementById('btn-lihat-galeri');
  if (galeriBtn) {
    galeriBtn.addEventListener('click', () =>
      document.getElementById('galeri-section').scrollIntoView({ behavior: 'smooth' }));
  }

  // 5) Event global
  document.body.addEventListener('click', e => {
    const t = e.target;

    // Tombol/link menuju rekomendasi (login-gated)
    if (t.closest('.go-rec')) {
      document.getElementById('motorModal').classList.remove('open');
      goToRecommendation();
      return;
    }

    // Link Riwayat
    if (t.closest('#nav-register')) {
      return; // Biarkan link berfungsi normal ke /history.html
    }

    // Logout
    if (t.closest('#nav-logout')) {
      if (window.Auth) Auth.logout();
      return;
    }

    // Navigasi data-page (hanya 'home' pada beranda)
    const pageEl = t.closest('[data-page]');
    if (pageEl) { showPage(pageEl.dataset.page); return; }

    // Logo -> beranda
    if (t.closest('.logo')) { showPage('home'); return; }

    // Detail motor
    const modalEl = t.closest('[data-modal-id]');
    if (modalEl) { openModal(Number(modalEl.dataset.modalId)); return; }

    // Tutup modal
    if (t === document.getElementById('motorModal') || t.closest('#modal-close')) {
      document.getElementById('motorModal').classList.remove('open');
      return;
    }

    // Filter galeri: merk
    const brandChip = t.closest('#gallery-brand .chip');
    if (brandChip) { Gallery.setBrand(brandChip.dataset.brand, brandChip); return; }

    // Filter galeri: jenis
    const tipeChip = t.closest('#gallery-tipe .chip');
    if (tipeChip) { Gallery.setTipe(tipeChip.dataset.tipe, tipeChip); return; }

    // Filter galeri: cc
    const ccChip = t.closest('#gallery-cc .chip');
    if (ccChip) { Gallery.setCC(ccChip.dataset.cc, ccChip); return; }

    // Hamburger (mobile)
    if (t.closest('#nav-hamburger')) {
      document.getElementById('nav-links').classList.toggle('open');
      return;
    }
  });

  // 6) Escape menutup modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('motorModal').classList.remove('open');
    }
  });
});
