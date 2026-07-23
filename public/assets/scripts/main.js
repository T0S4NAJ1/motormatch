'use strict';

document.addEventListener('DOMContentLoaded', function() {
  console.log('main.js DOMContentLoaded');

  // 1. Load data motor dari API (fallback ke lokal)
  var statusEl = document.getElementById('db-status');
  if (window.DB && typeof DB.loadFromAPI === 'function') {
    DB.loadFromAPI().then(function(state) {
      if (statusEl) {
        statusEl.textContent = state.source === 'mysql'
          ? state.count + ' data tersedia'
          : state.count + ' data lokal';
        statusEl.classList.toggle('ok', state.source === 'mysql');
        statusEl.classList.toggle('warn', state.source !== 'mysql');
      }
      // Setelah data API dimuat, refresh grid
      populateHomeGrid();
      if (window.Katalog) window.Katalog.render();
    });
  }

  // 2. Inisialisasi Wizard (FIX: sebelumnya tidak pernah dipanggil!)
  if (window.Wizard) {
    Wizard.initEvents();
    Wizard.renderStep();
  }

  // 3. Isi home-motor-grid dengan motor populer (FIX: sebelumnya selalu kosong!)
  populateHomeGrid();

  // 4. Cek URL parameter untuk langsung ke halaman tertentu
  //    Contoh: /landing.html?page=wizard → langsung buka wizard
  var urlParams = new URLSearchParams(window.location.search);
  var targetPage = urlParams.get('page');
  if (targetPage) {
    navigateTo(targetPage);
  }

  // 5. Handler klik global untuk navigasi data-page & berbagai tombol
  //    (FIX: sebelumnya tidak ada handler untuk data-page di landing.html!)
  document.body.addEventListener('click', function(e) {
    var t = e.target;

    // Navigasi antar halaman via data-page (Beranda, Katalog, Wizard, dll.)
    var pageEl = t.closest('[data-page]');
    if (pageEl) {
      // Jangan intercept jika elemen ini punya href (link asli)
      var tagName = pageEl.tagName.toLowerCase();
      if (tagName === 'a' && pageEl.getAttribute('href') && !pageEl.getAttribute('href').startsWith('#')) {
        return; // biarkan link navigasi normal
      }
      navigateTo(pageEl.dataset.page);
      // Update active state di navbar
      document.querySelectorAll('.nav-link').forEach(function(nl) {
        nl.classList.remove('active');
      });
      var activeNav = document.querySelector('.nav-link[data-page="' + pageEl.dataset.page + '"]');
      if (activeNav) activeNav.classList.add('active');
      return;
    }

    // Tombol CTA di dalam modal spec: "Cari Rekomendasi Motor →"
    // (FIX: sebelumnya tidak ada handler!)
    if (t.id === 'modal-cta' || t.closest('#modal-cta')) {
      var motorModal = document.getElementById('motorModal');
      if (motorModal) motorModal.classList.remove('open');
      navigateTo('wizard');
      return;
    }

    // Tombol "← Ubah Preferensi" di halaman hasil
    // (FIX: sebelumnya tidak ada handler!)
    if (t.id === 'btn-ubah-pref' || t.closest('#btn-ubah-pref')) {
      if (window.Wizard) Wizard.reset();
      navigateTo('wizard');
      return;
    }

    // Tombol "Cara Kerja" di hero
    // (FIX: sebelumnya tidak ada handler!)
    if (t.id === 'btn-learn' || t.closest('#btn-learn')) {
      var howSection = document.getElementById('how-section');
      if (howSection) howSection.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // Tutup motorModal saat klik overlay atau tombol ✕
    var motorModal = document.getElementById('motorModal');
    if (motorModal && motorModal.classList.contains('open')) {
      if (e.target === motorModal || t.closest('#modal-close')) {
        motorModal.classList.remove('open');
        return;
      }
    }

    // Hamburger nav (mobile)
    if (t.closest('#nav-hamburger')) {
      var navLinks = document.getElementById('nav-links');
      if (navLinks) navLinks.classList.toggle('open');
      return;
    }
  });

  // 6. Filter handler — Tipe
  var filterTipe = document.getElementById('filter-tipe');
  if (filterTipe) {
    filterTipe.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (btn && window.Katalog) window.Katalog.setTipe(btn.dataset.tipe, btn);
    });
  }

  // 7. Filter handler — CC
  var filterCC = document.getElementById('filter-cc');
  if (filterCC) {
    filterCC.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (btn && window.Katalog) window.Katalog.setCC(btn.dataset.cc, btn);
    });
  }

  // 8. Filter handler — Search
  var katSearch = document.getElementById('kat-search');
  if (katSearch) {
    katSearch.addEventListener('input', function() {
      if (window.Katalog) window.Katalog.filter();
    });
  }

  // 9. Filter handler — Sort
  var katSort = document.getElementById('kat-sort');
  if (katSort) {
    katSort.addEventListener('change', function() {
      if (window.Katalog) window.Katalog.filter();
    });
  }

  // 10. Filter handler — Brand checkboxes
  var brandCbs = document.querySelectorAll('.brand-cb');
  for (var i = 0; i < brandCbs.length; i++) {
    brandCbs[i].addEventListener('change', function() {
      if (window.Katalog) window.Katalog.filter();
    });
  }

  // 11. Escape key menutup semua modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var motorModal = document.getElementById('motorModal');
      if (motorModal) motorModal.classList.remove('open');
      if (window.closeSpecWizard) closeSpecWizard();
    }
  });

  console.log('main.js selesai diinisialisasi');
});

/**
 * Navigasi antar halaman (page-home, page-wizard, page-hasil, page-katalog)
 * Setelah navigasi ke wizard → render langkah pertama
 * Setelah navigasi ke katalog → render grid katalog
 */
function navigateTo(pageName) {
  if (window.showPage) {
    showPage(pageName);
  }
  if (pageName === 'wizard' && window.Wizard) {
    // FIX: Panggil reset() bukan renderStep()
    // renderStep() hanya me-render step saat ini (bisa di tengah)
    // reset() → step=0, hapus semua jawaban, lalu render ulang dari awal
    Wizard.reset();
  }
  if (pageName === 'katalog' && window.Katalog) {
    Katalog.render();
  }
}

/**
 * Isi section "Motor Populer" di halaman beranda landing.html
 * Menggunakan 6 motor pertama dari window.MOTORS sebagai sampel populer
 */
function populateHomeGrid() {
  var grid = document.getElementById('home-motor-grid');
  if (!grid) return;

  var motors = window.MOTORS || [];
  if (!motors.length) return;

  // Pilih 6 motor sebagai "populer" (misal: 2 matic, 2 sport, 2 naked)
  var matic  = motors.filter(function(m) { return m.category === 'Matic'; }).slice(0, 2);
  var sport  = motors.filter(function(m) { return m.category === 'Sport'; }).slice(0, 2);
  var naked  = motors.filter(function(m) { return m.category === 'Naked'; }).slice(0, 2);
  var popular = matic.concat(sport, naked);
  if (!popular.length) popular = motors.slice(0, 6);

  var badgeCls = { Matic: 'badge-matic', Sport: 'badge-sport', Naked: 'badge-naked' };
  var html = '';

  popular.forEach(function(m) {
    var hargaFmt = m.harga ? m.harga.toLocaleString('id-ID') : '0';
    var motorJson = JSON.stringify(m).replace(/'/g, "&#39;");
    html += '<div class="kat-card" data-motor=\'' + motorJson + '\' onclick="openSpecWizardFromCard(this)">';
    html += '  <div class="kat-img">';
    html += '    <img src="' + m.img + '" alt="' + m.brand + ' ' + m.model + '" loading="lazy"';
    html += '         onerror="this.onerror=null;this.src=\'assets/images/placeholder.svg\'">';
    html += '    <span class="kat-type-badge ' + (badgeCls[m.category] || '') + '">' + m.category + '</span>';
    html += '    <div class="kat-tooltip">';
    html += '      <div class="tooltip-header">';
    html += '        <span class="tooltip-brand">' + m.brand + '</span>';
    html += '        <span class="tooltip-model">' + m.model + '</span>';
    html += '        <span class="tooltip-year">' + m.year + '</span>';
    html += '      </div>';
    html += '      <div class="tooltip-specs">';
    html += '        <div class="tooltip-spec"><span class="tooltip-label">CC</span><span class="tooltip-value">' + m.cc + 'cc</span></div>';
    html += '        <div class="tooltip-spec"><span class="tooltip-label">Power</span><span class="tooltip-value">' + m.power + ' hp</span></div>';
    html += '        <div class="tooltip-spec"><span class="tooltip-label">BBM</span><span class="tooltip-value">' + m.bbm + ' km/L</span></div>';
    html += '      </div>';
    html += '      <div class="tooltip-price">Rp ' + hargaFmt + '</div>';
    html += '      <div class="tooltip-hint">Klik untuk detail spesifikasi</div>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="kat-body">';
    html += '    <div class="kat-name">' + m.brand + ' ' + m.model + '</div>';
    html += '    <div class="kat-price">Rp ' + hargaFmt + '</div>';
    html += '    <div class="kat-specs">';
    html += '      <span class="kat-spec">' + m.cc + 'cc</span>';
    html += '      <span class="kat-spec">' + m.power + ' hp</span>';
    html += '      <span class="kat-spec">' + m.bbm + ' km/L</span>';
    html += '      <span class="kat-spec">' + m.year + '</span>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';
  });

  grid.innerHTML = html;
  console.log('home-motor-grid diisi dengan', popular.length, 'motor populer');
}
