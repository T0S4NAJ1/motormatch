'use strict';

console.log('motor-catalog.js loaded');

const Katalog = (function() {
  console.log('Katalog IIFE running');

  let tipe = 'all';
  let cc = 'all';

  function formatRupiah(n) {
    if (!Number.isFinite(n) || n < 0) return '0';
    if (n >= 1000000000) {
      return (n / 1000000000).toFixed(1).replace('.', ',') + ' miliar';
    }
    if (n >= 100000000) {
      return (n / 1000000).toFixed(0).replace('.', ',') + ' jt';
    }
    return n.toLocaleString('id-ID');
  }

  function render() {
    console.log('Katalog.render called');
    renderGrid(window.MOTORS || []);
  }

  function filter() {
    const search = (document.getElementById('kat-search') || {}).value || '';
    const sort = (document.getElementById('kat-sort') || {}).value || 'default';
    const brands = [...document.querySelectorAll('.brand-cb:checked')].map(function(el) { return el.value; });

    var list = (window.MOTORS || []).filter(function(m) {
      if (!brands.includes(m.brand)) return false;
      if (tipe !== 'all' && m.category !== tipe) return false;
      if (cc !== 'all') {
        if (cc === 'kecil1' && (m.cc < 100 || m.cc > 150)) return false;
        if (cc === 'kecil2' && (m.cc < 151 || m.cc > 250)) return false;
        if (cc === 'sedang' && (m.cc < 251 || m.cc > 600)) return false;
        if (cc === 'besar' && m.cc < 601) return false;
      }
      if (search && !(m.brand + ' ' + m.model).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    if (sort === 'harga-asc') list.sort(function(a, b) { return a.harga - b.harga; });
    if (sort === 'harga-desc') list.sort(function(a, b) { return b.harga - a.harga; });
    if (sort === 'nama') list.sort(function(a, b) { return (a.brand + a.model).localeCompare(b.brand + b.model); });
    if (sort === 'cc-asc') list.sort(function(a, b) { return a.cc - b.cc; });
    if (sort === 'cc-desc') list.sort(function(a, b) { return b.cc - a.cc; });

    renderGrid(list);
  }

  function renderGrid(motors) {
    console.log('renderGrid called with', motors.length, 'motors');
    var grid = document.getElementById('katalog-grid');
    if (!grid) {
      console.error('katalog-grid not found!');
      return;
    }

    if (!motors.length) {
      grid.innerHTML = '<div class="no-result">Tidak ada motor yang sesuai filter.</div>';
      return;
    }

    var badgeCls = { Matic: 'badge-matic', Sport: 'badge-sport', Naked: 'badge-naked' };
    var html = '';

    for (var i = 0; i < motors.length; i++) {
      var m = motors[i];
      var harga = formatRupiah(m.harga);
      // Hover tooltip card - with click to open modal
      var card = '<div class="kat-card" data-motor=\'' + JSON.stringify(m).replace(/'/g, "&#39;") + '\' onclick="openSpecWizardFromCard(this)">';
      card += '<div class="kat-img">';
      card += '<img src="' + m.img + '" alt="' + m.brand + ' ' + m.model + '" loading="lazy" onerror="this.onerror=null;this.src=\'assets/images/placeholder.svg\'">';
      card += '<span class="kat-type-badge ' + (badgeCls[m.category] || '') + '">' + m.category + '</span>';
      // Hover tooltip with specs
      card += '<div class="kat-tooltip">';
      card += '<div class="tooltip-header">';
      card += '<span class="tooltip-brand">' + m.brand + '</span>';
      card += '<span class="tooltip-model">' + m.model + '</span>';
      card += '<span class="tooltip-year">' + m.year + '</span>';
      card += '</div>';
      card += '<div class="tooltip-specs">';
      card += '<div class="tooltip-spec"><span class="tooltip-label">CC</span><span class="tooltip-value">' + m.cc + 'cc</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">Power</span><span class="tooltip-value">' + m.power + ' hp</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">Torque</span><span class="tooltip-value">' + m.torque + ' Nm</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">BBM</span><span class="tooltip-value">' + m.bbm + ' km/L</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">Berat</span><span class="tooltip-value">' + m.weight + ' kg</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">Tinggi Jok</span><span class="tooltip-value">' + m.seat_h + ' mm</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">Tangki</span><span class="tooltip-value">' + m.fuel_l + ' L</span></div>';
      card += '<div class="tooltip-spec"><span class="tooltip-label">Kenyamanan</span><span class="tooltip-value">' + m.nyaman + '/10</span></div>';
      card += '</div>';
      card += '<div class="tooltip-price">Rp ' + harga + '</div>';
      card += '<div class="tooltip-hint">Klik untuk detail</div>';
      card += '</div>';
      card += '</div>';
      card += '<div class="kat-body">';
      card += '<div class="kat-name">' + m.brand + ' ' + m.model + '</div>';
      card += '<div class="kat-price">Rp ' + harga + '</div>';
      card += '<div class="kat-specs">';
      card += '<span class="kat-spec">' + m.cc + 'cc</span>';
      card += '<span class="kat-spec">' + m.power + ' hp</span>';
      card += '<span class="kat-spec">' + m.bbm + ' km/L</span>';
      card += '<span class="kat-spec">' + m.year + '</span>';
      card += '</div>';
      card += '</div>';
      card += '</div>';
      html += card;
    }

    grid.innerHTML = html;
    console.log('Grid updated with', motors.length, 'cards');
  }

  function setTipe(val, el) {
    tipe = val;
    var btns = document.querySelectorAll('#filter-tipe .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (el) el.classList.add('active');
    filter();
  }

  function setCC(val, el) {
    cc = val;
    var btns = document.querySelectorAll('#filter-cc .filter-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
    if (el) el.classList.add('active');
    filter();
  }

  return { render: render, filter: filter, setTipe: setTipe, setCC: setCC };
})();

window.Katalog = Katalog;
console.log('Katalog exposed to window');
