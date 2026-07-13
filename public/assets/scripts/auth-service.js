'use strict';

const Auth = (() => {
  const tokenKey = 'motormatch_token';
  const userKey = 'motormatch_user';
  const REQUEST_TIMEOUT = 10000; // 10 detik

  function getToken() {
    return localStorage.getItem(tokenKey) || '';
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(userKey) || 'null');
    } catch (_) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
  }

  function headers(extra = {}) {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(path, {
        ...options,
        headers: headers(options.headers || {}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Tangani response non-JSON
      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (_) {
          // JSON malformed tapi response OK - return empty object
          if (res.ok) return {};
          throw new Error('Format response tidak valid');
        }
      } else {
        // Response bukan JSON
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Server error: ${res.status}`);
        }
        return {};
      }

      // Tangani error dari API
      if (!res.ok) {
        throw new Error(data.details || data.message || `Request gagal: ${res.status}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Silakan coba lagi.');
      }

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Tidak dapat terhubung ke server. Pastikan koneksi internet aktif.');
      }

      throw error;
    }
  }

  async function me() {
    try {
      const data = await request('/api/auth/me', { method: 'GET' });
      if (data.user) {
        localStorage.setItem(userKey, JSON.stringify(data.user));
        return data.user;
      }
      throw new Error('Data user tidak valid');
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function login(username, password) {
    // Validasi client-side sebelum request
    if (!username || !username.trim()) {
      throw new Error('Username wajib diisi');
    }
    if (!password) {
      throw new Error('Password wajib diisi');
    }

    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password: password
        }),
      });

      if (!data.token || !data.user) {
        throw new Error('Respons server tidak valid. Silakan coba lagi.');
      }

      setSession(data.token, data.user);
      return data.user;
    } catch (error) {
      // Log error untuk debugging (hapus di production)
      console.error('[Auth.login error]', error.message);
      throw error;
    }
  }

  async function register(payload) {
    // Validasi client-side
    if (!payload.full_name || !payload.full_name.trim()) {
      throw new Error('Nama lengkap wajib diisi');
    }
    if (!payload.username || !payload.username.trim()) {
      throw new Error('Username wajib diisi');
    }
    if (!payload.password) {
      throw new Error('Password wajib diisi');
    }

    try {
      const data = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: payload.full_name.trim(),
          username: payload.username.trim().toLowerCase(),
          password: payload.password
        }),
      });

      if (!data.token || !data.user) {
        throw new Error('Respons server tidak valid. Silakan coba lagi.');
      }

      setSession(data.token, data.user);
      return data.user;
    } catch (error) {
      console.error('[Auth.register error]', error.message);
      throw error;
    }
  }

  async function logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (_) {
      // Lanjutkan logout meskipun request gagal
    }
    clearSession();

    // Cek apakah sudah di halaman login
    if (!location.pathname.includes('login.html')) {
      location.href = '/login.html';
    }
  }

  async function guard(role) {
    try {
      const user = await me();
      if (role && user.role !== role) {
        // Redirect berdasarkan role saat ini
        location.href = user.role === 'admin' ? '/admin.html' : '/index.html';
        return null;
      }
      return user;
    } catch (error) {
      clearSession();
      const nextParam = encodeURIComponent(location.pathname);
      location.href = `/login.html?next=${nextParam}`;
      return null;
    }
  }

  function redirectByRole(user) {
    location.href = '/index.html';
  }

  // Cek apakah user sudah login (sync)
  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  return {
    getToken,
    getUser,
    setSession,
    clearSession,
    headers,
    request,
    me,
    login,
    register,
    logout,
    guard,
    redirectByRole,
    isLoggedIn,
  };
})();
