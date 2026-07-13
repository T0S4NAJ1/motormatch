'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await Auth.guard('user');
  if (!user) return;

  // Update user session display
  const sessionEl = document.getElementById('user-session');
  if (sessionEl) sessionEl.textContent = user.full_name;

  // Status database
  const statusEl = document.getElementById('db-status');
  if (statusEl) {
    if (window.DB && typeof DB.loadFromAPI === 'function') {
      const state = await DB.loadFromAPI();
      statusEl.textContent = state.source === 'mysql'
        ? `${state.count} data tersedia`
        : `${state.count} data lokal`;
      statusEl.classList.toggle('ok', state.source === 'mysql');
      statusEl.classList.toggle('warn', state.source !== 'mysql');
    }
  }

  // Initialize wizard
  Wizard.initEvents();
  Wizard.renderStep();

  document.body.addEventListener('click', event => {
    const target = event.target;

    const pageEl = target.closest('[data-page]');
    if (pageEl) {
      showPage(pageEl.dataset.page);
      return;
    }

    const modalEl = target.closest('[data-modal-id]');
    if (modalEl) {
      openModal(Number(modalEl.dataset.modalId));
      return;
    }

    if (target === document.getElementById('motorModal') || target.closest('#modal-close')) {
      document.getElementById('motorModal').classList.remove('open');
      return;
    }

    if (target.closest('#modal-cta')) {
      document.getElementById('motorModal').classList.remove('open');
      Wizard.reset();
      showPage('wizard');
      return;
    }

    if (target.closest('#btn-ubah-pref')) {
      Wizard.reset();
      showPage('wizard');
      return;
    }

    if (target.closest('#nav-hamburger')) {
      document.getElementById('nav-links').classList.toggle('open');
      return;
    }

    if (target.closest('#logout-btn')) {
      Auth.logout();
    }
  });
});
