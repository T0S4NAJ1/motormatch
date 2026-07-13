'use strict';

document.addEventListener('DOMContentLoaded', function() {
  console.log('main.js DOMContentLoaded');

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
    });
  }

  // Filter handlers
  var filterTipe = document.getElementById('filter-tipe');
  if (filterTipe) {
    filterTipe.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (btn && window.Katalog) window.Katalog.setTipe(btn.dataset.tipe, btn);
    });
  }

  var filterCC = document.getElementById('filter-cc');
  if (filterCC) {
    filterCC.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (btn && window.Katalog) window.Katalog.setCC(btn.dataset.cc, btn);
    });
  }

  var katSearch = document.getElementById('kat-search');
  if (katSearch) {
    katSearch.addEventListener('input', function() {
      if (window.Katalog) window.Katalog.filter();
    });
  }

  var katSort = document.getElementById('kat-sort');
  if (katSort) {
    katSort.addEventListener('change', function() {
      if (window.Katalog) window.Katalog.filter();
    });
  }

  var brandCbs = document.querySelectorAll('.brand-cb');
  for (var i = 0; i < brandCbs.length; i++) {
    brandCbs[i].addEventListener('change', function() {
      if (window.Katalog) window.Katalog.filter();
    });
  }

  // Modal close handlers
  document.addEventListener('click', function(e) {
    var motorModal = document.getElementById('motorModal');
    if (!motorModal) return;

    // Close modal when clicking overlay
    if (motorModal.classList.contains('open')) {
      if (e.target === motorModal) {
        motorModal.classList.remove('open');
        return;
      }
      if (e.target.closest('#modal-close')) {
        motorModal.classList.remove('open');
        return;
      }
    }
  });

  // Escape key closes modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var motorModal = document.getElementById('motorModal');
      if (motorModal) motorModal.classList.remove('open');
    }
  });

  console.log('main.js initialization complete');
});
