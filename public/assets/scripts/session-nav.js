'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const loginLink = document.getElementById('nav-login');
  const logoutBtn = document.getElementById('nav-logout');
  const userBadge = document.getElementById('nav-user-badge');
  const navRegister = document.getElementById('nav-register');

  function show(el, state) {
    if (el) el.hidden = !state;
  }

  try {
    const user = await Auth.me();
    show(loginLink, false);
    show(logoutBtn, true);
    show(userBadge, true);
    if (userBadge) userBadge.textContent = user.full_name;
    // History link should always be visible when logged in
  } catch (_) {
    Auth.clearSession();
    show(loginLink, true);
    show(logoutBtn, false);
    show(userBadge, false);
  }

  if (logoutBtn) logoutBtn.addEventListener('click', Auth.logout);
});
