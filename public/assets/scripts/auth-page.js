'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// Toast notification untuk pesan sukses/info
function showToast(message, duration = 3000) {
  const existing = $('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #323232;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
  `;

  // Tambah style animasi
  if (!$('#toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function showMessage(message, type = 'error') {
  const box = $('#auth-message');
  if (!box) return;

  box.textContent = message;
  box.className = `auth-message show ${type}`;

  // Scroll ke message jika tidak visible
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearMessage() {
  const box = $('#auth-message');
  if (box) {
    box.textContent = '';
    box.className = 'auth-message';
  }
}

function setLoading(form, loading) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;

  btn.disabled = loading;
  btn.textContent = loading ? 'Memproses...' : btn.dataset.label || 'Submit';

  // Tambah opacity overlay
  if (loading) {
    btn.style.opacity = '0.7';
    btn.style.cursor = 'wait';
  } else {
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

function enableForm(form, enable) {
  const inputs = form.querySelectorAll('input, select, button');
  inputs.forEach(input => {
    if (input.type !== 'submit') {
      input.disabled = !enable;
    }
  });
}

function redirectAfterAuth(user) {
  if (!user) {
    location.href = '/index.html';
    return;
  }

  // Hormati ?next= jika ada
  const next = new URLSearchParams(location.search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    location.href = next;
    return;
  }

  Auth.redirectByRole(user);
}

function handleAuthError(error, form) {
  console.error('[Auth Error]', error);

  // Reset form state
  setLoading(form, false);
  enableForm(form, true);

  // Parse error message
  let message = error.message || 'Terjadi kesalahan. Silakan coba lagi.';

  // Handle specific error types
  if (message.includes('Failed to fetch') || message.includes('tidak dapat terhubung')) {
    message = 'Tidak dapat terhubung ke server. Silakan periksa koneksi internet Anda.';
  } else if (message.includes('timeout')) {
    message = 'Request timeout. Server sedang sibuk, silakan coba lagi.';
  } else if (message.includes('Username wajib') || message.includes('Password wajib')) {
    message = error.message; // Use client-side validation message
  }

  showMessage(message, 'error');
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;

  // Clear previous messages
  clearMessage();
  setLoading(form, true);
  enableForm(form, false);

  try {
    const username = form.username?.value?.trim() || '';
    const password = form.password?.value || '';

    // Basic validation
    if (!username) {
      throw new Error('Username wajib diisi');
    }
    if (!password) {
      throw new Error('Password wajib diisi');
    }

    const user = await Auth.login(username, password);
    showMessage('Login berhasil! Mengalihkan...', 'ok');

    // Small delay untuk UX
    setTimeout(() => redirectAfterAuth(user), 500);
  } catch (error) {
    handleAuthError(error, form);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;

  // Clear previous messages
  clearMessage();
  setLoading(form, true);
  enableForm(form, false);

  try {
    const fullName = form.full_name?.value?.trim() || '';
    const username = form.username?.value?.trim() || '';
    const password = form.password?.value || '';
    const confirmPassword = form.confirm_password?.value || '';

    // Basic validation
    if (!fullName) {
      throw new Error('Nama lengkap wajib diisi');
    }
    if (!username) {
      throw new Error('Username wajib diisi');
    }
    if (!password) {
      throw new Error('Password wajib diisi');
    }
    if (password !== confirmPassword) {
      throw new Error('Password dan konfirmasi password tidak cocok');
    }

    const user = await Auth.register({
      full_name: fullName,
      username: username,
      password: password
    });

    showMessage('Registrasi berhasil! Mengalihkan...', 'ok');
    showToast('Selamat datang di MotorMatch!');

    setTimeout(() => redirectAfterAuth(user), 500);
  } catch (error) {
    handleAuthError(error, form);
  }
}

// Handle online/offline status
function handleOnlineStatus() {
  if (!navigator.onLine) {
    showMessage('Koneksi internet terputus. Silakan periksa koneksi Anda.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Cek apakah sudah login
  if (Auth.isLoggedIn()) {
    // Verifikasi session dengan server
    Auth.me()
      .then(user => {
        if (user) {
          redirectAfterAuth(user);
        } else {
          Auth.clearSession();
        }
      })
      .catch(() => {
        // Session invalid atau expired
        Auth.clearSession();
      });
    return;
  }

  const loginForm = $('#login-form');
  const registerForm = $('#register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);

    // Clear error on input
    loginForm.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        if ($('#auth-message')?.classList.contains('error')) {
          clearMessage();
        }
      });
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);

    // Clear error on input
    registerForm.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        if ($('#auth-message')?.classList.contains('error')) {
          clearMessage();
        }
      });
    });
  }

  // Handle online/offline
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
});
