'use strict';

/* ============================================================
   app.js — Controller Beranda MotorMatch (versi dengan login)
   Bagian 1: Beranda (katalog motor) — publik
   Bagian 2: Rekomendasi (wizard 6 kategori) — butuh login.

   Navigasi sadar sesi:
   - Belum login  -> tampil tombol Login & Daftar
   - Sudah login  -> tampil nama user, menu Rekomendasi, Logout
   Tombol/link ber-class ".go-rec" mengarah ke rekomendasi:
   - login  -> /landing.html
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
        if (cc === 'kecil1' && (m.cc < 100 || m.cc > 150)) return false;
        if (cc === 'kecil2' && (m.cc < 151 || m.cc > 250)) return false;
        if (cc === 'sedang' && (m.cc < 251 || m.cc > 600)) return false;
        if (cc === 'besar' && m.cc < 601) return false;
      }
      return true;
    });
  }

  function card(m) {
    // FIX: Pakai data-motor + openSpecWizardFromCard (sama seperti katalog di landing.html)
    // openModal + data-modal-id lama tidak berfungsi karena CSS motorModal ada issue
    const motorJson = JSON.stringify(m).replace(/'/g, "&#39;");
    return `
      <div class="motor-card" data-motor='${motorJson}' onclick="openSpecWizardFromCard(this)">
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
    show('nav-register', true);   // FIX: Riwayat harus tetap tampil saat login (bukan disembunyikan!)
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

// ============================================================
// Navigasi SPA — pindah antar section dalam SATU halaman
// (tidak lagi navigate ke landing.html!)
// ============================================================
function navigateTo(pageName) {
  if (typeof showPage === 'function') showPage(pageName);

  // Update active state di navbar
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageName);
  });

  // Aksi spesifik per halaman
  if (pageName === 'wizard' && typeof Wizard !== 'undefined') {
    Wizard.reset(); // Reset ke step 1 dan render ulang
  }
  if (pageName === 'katalog' && typeof Katalog !== 'undefined') {
    Katalog.render(); // Render grid katalog
  }
  // Scroll ke atas saat pindah page
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToRecommendation() {
  if (isLoggedIn) {
    // FIX: SPA — tampilkan wizard DALAM halaman ini, tidak lagi ke landing.html!
    navigateTo('wizard');
  } else {
    // Belum login → ke login, lalu kembali ke index.html?page=wizard
    location.href = '/login.html?next=' + encodeURIComponent('/index.html?page=wizard');
  }
}

// Expose to global scope for use by other pages
window.goToRecommendation = goToRecommendation;


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

  // 3) Cek sesi login
  if (typeof Auth !== 'undefined' && typeof Auth.me === 'function') {
    try {
      const user = await Auth.me();
      applySession(user);
    } catch (_) {
      typeof Auth.clearSession === 'function' && Auth.clearSession();
      applySession(null);
    }
  } else {
    applySession(null);
  }

  // 4) Inisialisasi Wizard (FIX: harus dipanggil sekali setelah DOM siap)
  if (typeof Wizard !== 'undefined') {
    Wizard.initEvents();
  }

  // 5) Cek URL param → langsung ke halaman tertentu (misal: /index.html?page=wizard setelah login)
  const urlParams = new URLSearchParams(window.location.search);
  const targetPage = urlParams.get('page');
  if (targetPage) {
    if (targetPage === 'katalog') {
      // Katalog bisa diakses tanpa login — scroll ke galeri
      setTimeout(() => {
        const galeriEl = document.getElementById('galeri-section');
        if (galeriEl) galeriEl.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else if (isLoggedIn) {
      navigateTo(targetPage);
    }
  }

  // 6) Tombol "Lihat Galeri Motor"
  const galeriBtn = document.getElementById('btn-lihat-galeri');
  if (galeriBtn) {
    galeriBtn.addEventListener('click', () =>
      document.getElementById('galeri-section').scrollIntoView({ behavior: 'smooth' }));
  }

  // 5) Event global
  document.body.addEventListener('click', e => {
    const t = e.target;

    // Navigasi SPA via data-page (Beranda, Katalog, Hasil, Wizard)
    const pageEl = t.closest('[data-page]');
    if (pageEl && !t.closest('a[href]')) {
      const pageName = pageEl.dataset.page;
      if (pageName === 'wizard') {
        goToRecommendation(); // Cek login dulu
      } else {
        navigateTo(pageName);
      }
      return;
    }

    // Tombol .go-rec (hero + CTA section)
    if (t.closest('.go-rec')) {
      if (typeof closeSpecWizard === 'function') closeSpecWizard();
      const motorModal = document.getElementById('motorModal');
      if (motorModal) motorModal.classList.remove('open');
      goToRecommendation();
      return;
    }

    // Tombol "← Ubah Preferensi" di halaman hasil
    if (t.id === 'btn-ubah-pref' || t.closest('#btn-ubah-pref')) {
      navigateTo('wizard');
      return;
    }

    // Logo → beranda
    if (t.closest('.logo')) {
      navigateTo('home');
      return;
    }

    // Link Riwayat — biarkan navigasi normal ke /history.html
    if (t.closest('#nav-register')) {
      return;
    }

    // Logout
    if (t.closest('#nav-logout')) {
      if (typeof Auth !== 'undefined') Auth.logout();
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

    // Filter katalog: tipe button
    const filterTipeBtn = t.closest('#filter-tipe .filter-btn');
    if (filterTipeBtn && typeof Katalog !== 'undefined') {
      Katalog.setTipe(filterTipeBtn.dataset.tipe, filterTipeBtn); return;
    }

    // Filter katalog: cc button
    const filterCCBtn = t.closest('#filter-cc .filter-btn');
    if (filterCCBtn && typeof Katalog !== 'undefined') {
      Katalog.setCC(filterCCBtn.dataset.cc, filterCCBtn); return;
    }

    // Hamburger (mobile)
    if (t.closest('#nav-hamburger')) {
      document.getElementById('nav-links').classList.toggle('open');
      return;
    }
  });

  // Filter katalog: search & sort & brand checkboxes
  const katSearch = document.getElementById('kat-search');
  if (katSearch) katSearch.addEventListener('input', () => { if (typeof Katalog !== 'undefined') Katalog.filter(); });

  const katSort = document.getElementById('kat-sort');
  if (katSort) katSort.addEventListener('change', () => { if (typeof Katalog !== 'undefined') Katalog.filter(); });

  document.querySelectorAll('.brand-cb').forEach(cb => {
    cb.addEventListener('change', () => { if (typeof Katalog !== 'undefined') Katalog.filter(); });
  });

  // 6) Escape menutup modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // FIX: gallery sekarang pakai specWizardModal, bukan motorModal
      if (typeof closeSpecWizard === 'function') closeSpecWizard();
      const motorModal = document.getElementById('motorModal');
      if (motorModal) motorModal.classList.remove('open');
    }
  });
});
