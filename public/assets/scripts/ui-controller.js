'use strict';

console.log('ui-controller.js loaded');

// PERBAIKAN BUG: fungsi showPage tidak pernah didefinisikan sebelumnya,
// padahal dipanggil di app.js, recommendation-result.js, dan user-dashboard.js.
// Akibatnya, setelah SAW selesai menghitung, showPage('hasil') melempar
// ReferenceError yang membuat hasil rekomendasi tertimpa pesan error.
window.showPage = function(name) {
  console.log('showPage called with:', name);
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove('active');
  }
  var target = document.getElementById('page-' + name);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    console.warn('showPage: page-' + name + ' tidak ditemukan di halaman ini');
  }
};

window.formatRupiah = function(n) {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1000000000) {
    return (n / 1000000000).toFixed(1).replace('.', ',') + ' miliar';
  }
  if (n >= 100000000) {
    return (n / 1000000).toFixed(0).replace('.', ',') + ' jt';
  }
  return n.toLocaleString('id-ID');
};

window.testClick = function(id) {
  console.log('testClick called with id:', id);
  var m = (window.MOTORS || []).find(function(x) { return x.id === id; });
  if (!m) {
    console.error('Motor not found:', id);
    return;
  }
  console.log('Found motor:', m.brand, m.model);
  window.openModal(id);
};

window.openModal = function(id) {
  console.log('openModal called with id:', id);
  var m = (window.MOTORS || []).find(function(x) { return x.id === id; });
  if (!m) {
    console.error('Motor not found:', id);
    return;
  }

  console.log('Setting modal content for:', m.brand, m.model);

  // Set header info
  var brandEl = document.getElementById('modal-brand');
  var nameEl = document.getElementById('modal-name');
  if (brandEl) brandEl.textContent = m.brand;
  if (nameEl) nameEl.textContent = m.model + ' ' + m.year;

  // Set image
  var modalImg = document.getElementById('modal-img');
  if (modalImg) {
    modalImg.src = m.img || 'assets/images/placeholder.svg';
    modalImg.alt = m.brand + ' ' + m.model;
    modalImg.onerror = function() { this.src = 'assets/images/placeholder.svg'; };
  }

  // Set specification values
  var specs = {
    'spec-harga': 'Rp ' + window.formatRupiah(m.harga),
    'spec-cc': m.cc + ' cc',
    'spec-power': m.power + ' HP',
    'spec-torque': m.torque + ' Nm',
    'spec-bbm': m.bbm + ' km/L',
    'spec-weight': m.weight + ' kg',
    'spec-seat': m.seat_h + ' mm',
    'spec-fuel': m.fuel_l + ' L',
    'spec-category': m.category,
    'spec-bbm-tipe': m.bbm_tipe || 'Pertalite',
    'spec-nyaman': m.nyaman + '/10'
  };

  for (var key in specs) {
    var el = document.getElementById(key);
    if (el) el.textContent = specs[key];
  }

  // Calculate criteria values
  var allMotors = window.MOTORS || [];
  var minH = Math.min.apply(null, allMotors.map(function(x) { return x.harga; }));
  var maxB = Math.max.apply(null, allMotors.map(function(x) { return x.bbm; }));
  var maxP = Math.max.apply(null, allMotors.map(function(x) { return x.power; }));
  var maxN = Math.max.apply(null, allMotors.map(function(x) { return x.nyaman; }));

  var r1 = Math.round((minH / m.harga) * 100);
  var r2 = Math.round((m.bbm / maxB) * 100);
  var r3 = Math.round((m.power / maxP) * 100);
  var r4 = Math.round((m.nyaman / maxN) * 100);

  var barsEl = document.getElementById('modal-bars');
  if (barsEl) {
    barsEl.innerHTML = '<div class="crit-bar-row">' +
      '<div class="crit-bar-label-row"><span>Harga</span><span>' + r1 + '%</span></div>' +
      '<div class="crit-bar-bg"><div class="crit-bar-fill bar-blue" style="width:' + r1 + '%"></div></div>' +
      '</div>' +
      '<div class="crit-bar-row">' +
      '<div class="crit-bar-label-row"><span>BBM</span><span>' + r2 + '%</span></div>' +
      '<div class="crit-bar-bg"><div class="crit-bar-fill bar-green" style="width:' + r2 + '%"></div></div>' +
      '</div>' +
      '<div class="crit-bar-row">' +
      '<div class="crit-bar-label-row"><span>Performa</span><span>' + r3 + '%</span></div>' +
      '<div class="crit-bar-bg"><div class="crit-bar-fill bar-amber" style="width:' + r3 + '%"></div></div>' +
      '</div>' +
      '<div class="crit-bar-row">' +
      '<div class="crit-bar-label-row"><span>Kenyamanan</span><span>' + r4 + '%</span></div>' +
      '<div class="crit-bar-bg"><div class="crit-bar-fill bar-purple" style="width:' + r4 + '%"></div></div>' +
      '</div>';
  }

  // Show modal
  var modal = document.getElementById('motorModal');
  if (modal) {
    modal.classList.add('open');
    console.log('Modal should be visible now');
  } else {
    console.error('motorModal element not found!');
  }
};

console.log('openModal and testClick functions defined');
