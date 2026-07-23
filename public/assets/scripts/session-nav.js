'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const loginLink   = document.getElementById('nav-login');
  const logoutBtn   = document.getElementById('nav-logout');
  const userBadge   = document.getElementById('nav-user-badge');
  const navRegister = document.getElementById('nav-register');   // DAFTAR (landing.html) atau Riwayat aktif (history.html)
  const navRiwayat  = document.getElementById('nav-riwayat');    // Riwayat link (landing.html only)

  // FIX: nav-register punya arti beda di tiap halaman:
  //   - landing.html  → tombol DAFTAR (sembunyikan saat sudah login)
  //   - history.html  → tombol Riwayat aktif (JANGAN disembunyikan)
  const isLandingPage = window.location.pathname.replace(/\/$/, '').endsWith('landing.html');

  function show(el, state) {
    if (el) el.hidden = !state;
  }

  try {
    const user = await Auth.me();
    // Sudah login:
    show(loginLink, false);
    if (isLandingPage) show(navRegister, false); // Sembunyikan DAFTAR hanya di landing.html
    show(navRiwayat, true);                      // Tampilkan Riwayat
    show(logoutBtn, true);
    show(userBadge, true);
    if (userBadge) userBadge.textContent = user.full_name;
  } catch (_) {
    // Belum login:
    Auth.clearSession();
    show(loginLink, true);
    if (isLandingPage) show(navRegister, true);  // Tampilkan DAFTAR di landing.html
    show(navRiwayat, false);                     // Sembunyikan Riwayat
    show(logoutBtn, false);
    show(userBadge, false);
  }

  if (logoutBtn) logoutBtn.addEventListener('click', Auth.logout);
});
