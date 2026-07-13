'use strict';

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./backend/database/database-service.js');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// CORS: specific origin, bukan wildcard
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

// Rate limiting untuk brute force protection
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 menit
const MAX_LOGIN_ATTEMPTS = 5;

// Request timeout
const REQUEST_TIMEOUT = 30000; // 30 detik

// Status database - diakses dari handleAPI
let _dbReady = false;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jfif': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJSON(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // CORS - hanya izinkan origin spesifik
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, details = null) {
  const payload = { error: true, message };
  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  }
  sendJSON(res, status, payload);
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let timeout;

    // Set timeout untuk membaca body
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('Request timeout saat membaca body'));
      }, REQUEST_TIMEOUT);
    };

    resetTimeout();

    req.on('data', chunk => {
      raw += chunk.toString();
      if (raw.length > 1_000_000) {
        clearTimeout(timeout);
        req.destroy();
        reject(new Error('Payload terlalu besar (maksimal 1MB)'));
      }
      resetTimeout();
    });

    req.on('end', () => {
      clearTimeout(timeout);
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Format JSON tidak valid'));
      }
    });

    req.on('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}


function getToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

async function requireUser(req, res) {
  try {
    const user = await db.getUserByToken(getToken(req));
    if (!user) {
      sendError(res, 401, 'Sesi tidak valid. Silakan login kembali.');
      return null;
    }
    return user;
  } catch (error) {
    console.error('[requireUser error]', error.message);
    sendError(res, 500, 'Gagal memverifikasi session. Silakan login kembali.');
    return null;
  }
}

async function handleAPI(req, res) {
  if (req.method === 'OPTIONS') return sendJSON(res, 204, {});

  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;
  const params = urlObj.searchParams;

  try {
    if (pathname === '/api/auth/register') {
      if (req.method !== 'POST') return sendError(res, 405, 'Method tidak diizinkan');

      try {
        const payload = await readJSONBody(req);

        // Validasi input
        if (!payload.username || !payload.username.trim()) {
          return sendError(res, 400, 'Username wajib diisi');
        }
        if (!payload.password) {
          return sendError(res, 400, 'Password wajib diisi');
        }

        await db.registerUser(payload);
        const session = await db.loginUser(payload);
        return sendJSON(res, 201, { success: true, message: 'Registrasi berhasil', ...session });
      } catch (error) {
        console.error('[Register error]', error.message);
        if (error.message.includes('sudah digunakan')) {
          return sendError(res, 409, error.message);
        }
        return sendError(res, 400, error.message);
      }
    }

    if (pathname === '/api/auth/login') {
      if (req.method !== 'POST') return sendError(res, 405, 'Method tidak diizinkan');

      // Rate limiting check
      const clientIP = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const attempts = loginAttempts.get(clientIP) || { count: 0, firstAttempt: now };

      // Reset jika window sudah lewat
      if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
        attempts.count = 0;
        attempts.firstAttempt = now;
      }

      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - attempts.firstAttempt)) / 1000);
        res.writeHead(429, {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': retryAfter,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        });
        return res.end(JSON.stringify({
          error: true,
          message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.`,
        }));
      }

      attempts.count++;
      loginAttempts.set(clientIP, attempts);

      try {
        const payload = await readJSONBody(req);

        // Validasi input
        if (!payload.username || !payload.username.trim()) {
          return sendError(res, 400, 'Username wajib diisi');
        }
        if (!payload.password) {
          return sendError(res, 400, 'Password wajib diisi');
        }

        const session = await db.loginUser(payload);
        // Reset attempts on success
        loginAttempts.delete(clientIP);
        return sendJSON(res, 200, { success: true, message: 'Login berhasil', ...session });
      } catch (error) {
        console.error('[Login error]', error.message);
        return sendError(res, 401, 'Username atau password salah');
      }
    }

    if (pathname === '/api/auth/me') {
      if (req.method !== 'GET') return sendError(res, 405, 'Method tidak diizinkan');
      const user = await requireUser(req, res);
      if (!user) return;
      return sendJSON(res, 200, { user });
    }

    if (pathname === '/api/auth/logout') {
      if (req.method !== 'POST') return sendError(res, 405, 'Method tidak diizinkan');
      await db.logoutUser(getToken(req));
      return sendJSON(res, 200, { success: true, message: 'Logout berhasil' });
    }

    // Questions API endpoint
    if (pathname === '/api/questions') return sendJSON(res, 200, db.QUESTIONS);

    // History API - authenticated user
    if (pathname === '/api/history') {
      const user = await requireUser(req, res);
      if (!user) return;

      if (req.method === 'GET') {
        try {
          const history = await db.getRecommendationHistory(user.id);
          return sendJSON(res, 200, history);
        } catch (error) {
          console.error('[Get history error]', error.message);
          return sendError(res, 500, 'Gagal mengambil riwayat');
        }
      }

      if (req.method === 'DELETE') {
        try {
          const payload = await readJSONBody(req);
          if (payload.deleteAll) {
            await db.deleteAllHistory(user.id);
            return sendJSON(res, 200, { success: true, message: 'Semua riwayat berhasil dihapus' });
          }
          if (payload.id) {
            await db.deleteHistory(payload.id, user.id);
            return sendJSON(res, 200, { success: true, message: 'Riwayat berhasil dihapus' });
          }
          return sendError(res, 400, 'ID riwayat diperlukan');
        } catch (error) {
          console.error('[Delete history error]', error.message);
          return sendError(res, 500, 'Gagal menghapus riwayat');
        }
      }

      return sendError(res, 405, 'Method tidak diizinkan untuk /api/history');
    }

    if (pathname === '/api/motors') {
      if (req.method === 'GET') {
        try {
          const motors = await db.getAllMotors();
          return sendJSON(res, 200, motors);
        } catch (error) {
          console.error('[Get motors error]', error.message);
          return sendError(res, 500, 'Gagal mengambil data motor');
        }
      }

      if (req.method === 'POST') {
        // Penambahan motor dinonaktifkan. Admin hanya boleh mengedit data yang sudah ada.
        return sendError(res, 403, 'Penambahan motor dinonaktifkan. Admin hanya dapat mengedit data motor yang sudah ada.');
      }

      return sendError(res, 405, 'Method tidak diizinkan untuk /api/motors');
    }

    let match = pathname.match(/^\/api\/motors\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);

      if (req.method === 'GET') {
        try {
          const motor = await db.getMotorById(id);
          if (!motor) return sendError(res, 404, 'Motor tidak ditemukan');
          return sendJSON(res, 200, motor);
        } catch (error) {
          console.error('[Get motor error]', error.message);
          return sendError(res, 500, 'Gagal mengambil data motor');
        }
      }

      if (req.method === 'PUT') {
        // Edit motor dinonaktifkan karena tidak ada role admin
        return sendError(res, 403, 'Pengeditan motor dinonaktifkan.');
      }

      if (req.method === 'DELETE') {
        // Penghapusan motor dinonaktifkan. Admin hanya boleh mengedit data yang sudah ada.
        return sendError(res, 403, 'Penghapusan motor dinonaktifkan. Admin hanya dapat mengedit data motor yang sudah ada.');
      }

      return sendError(res, 405, 'Method tidak diizinkan untuk motor detail');
    }

    match = pathname.match(/^\/api\/motors\/brand\/(.+)$/);
    if (match) {
      try {
        const motors = await db.getMotorsByBrand(decodeURIComponent(match[1]));
        return sendJSON(res, 200, motors);
      } catch (error) {
        console.error('[Get motors by brand error]', error.message);
        return sendError(res, 500, 'Gagal mengambil data motor');
      }
    }

    if (pathname === '/api/filter') {
      try {
        const motors = await db.filterMotors({
          budget: params.get('budget') ? Number(params.get('budget')) : undefined,
          tipe: params.get('tipe') || undefined,
          ccSegment: params.get('ccSegment') || undefined,
          tinggi: params.get('tinggi') ? Number(params.get('tinggi')) : undefined,
          bbm_tipe: params.get('bbm_tipe') || undefined,
        });
        return sendJSON(res, 200, motors);
      } catch (error) {
        console.error('[Filter motors error]', error.message);
        return sendError(res, 500, 'Gagal menyaring data motor');
      }
    }

    if (pathname === '/api/history') {
      const user = await requireUser(req, res);
      if (!user) return;

      if (req.method === 'GET') {
        try {
          const history = await db.getRecommendationHistory(user.id);
          return sendJSON(res, 200, history);
        } catch (error) {
          console.error('[Get history error]', error.message);
          return sendError(res, 500, 'Gagal mengambil riwayat');
        }
      }

      if (req.method === 'DELETE') {
        try {
          const payload = await readJSONBody(req);
          if (payload.deleteAll) {
            await db.deleteAllHistory(user.id);
            return sendJSON(res, 200, { success: true, message: 'Semua riwayat berhasil dihapus' });
          }
          if (payload.id) {
            await db.deleteHistory(payload.id, user.id);
            return sendJSON(res, 200, { success: true, message: 'Riwayat berhasil dihapus' });
          }
          return sendError(res, 400, 'ID riwayat diperlukan');
        } catch (error) {
          console.error('[Delete history error]', error.message);
          return sendError(res, 500, 'Gagal menghapus riwayat');
        }
      }

      return sendError(res, 405, 'Method tidak diizinkan untuk /api/history');
    }

    if (pathname === '/api/history/save') {
      if (req.method !== 'POST') return sendError(res, 405, 'Method tidak diizinkan');
      const user = await requireUser(req, res);
      if (!user) return;
      try {
        const payload = await readJSONBody(req);
        const { answers, result, topMotor } = payload;
        const id = await db.saveRecommendationHistory(user.id, answers, result, topMotor);
        return sendJSON(res, 201, { success: true, id });
      } catch (error) {
        console.error('[Save history error]', error.message);
        return sendError(res, 500, 'Gagal menyimpan riwayat');
      }
    }

    return sendError(res, 404, 'Endpoint API tidak dikenal atau method tidak sesuai');
  } catch (error) {
    console.error('[API ERROR]', error.message);
    console.error('[Stack]', error.stack);
    // Jangan kirim error.message mentah ke client - hanya log di server
    return sendError(res, 500, 'Gagal memproses request API. Silakan coba beberapa saat lagi.');
  }
}

function safeFilePath(requestUrl) {
  const urlPath = decodeURIComponent(requestUrl.split('?')[0]);
  const cleanPath = urlPath === '/' ? '/login.html' : urlPath;
  const filePath = path.normalize(path.join(PUBLIC_DIR, cleanPath));
  if (!filePath.startsWith(PUBLIC_DIR)) return null;
  return filePath;
}

function serveStatic(req, res) {
  const filePath = safeFilePath(req.url);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const fallback = path.join(PUBLIC_DIR, 'login.html');
      return fs.readFile(fallback, (fallbackErr, html) => {
        if (fallbackErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Server error');
        }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        return res.end(html);
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleAPI(req, res);
  return serveStatic(req, res);
});

(async () => {
  console.log('\nMotorMatch — starting...');

  try {
    await db.init();
    _dbReady = true;
    console.log('  ✅ Auto setup database selesai');
  } catch (error) {
    console.error(`  ❌ Auto setup MySQL gagal: ${error.message}`);
    console.log('  Frontend tetap bisa dibuka dalam mode data lokal.');
    console.log('  Cek XAMPP/Laragon/MySQL dan file .env jika ingin mode database.');
  }

  server.listen(PORT, () => {
    console.log(`Server aktif: http://localhost:${PORT}`);
    console.log(`API health:  http://localhost:${PORT}/api/health`);
    console.log(`Mode data:   ${_dbReady ? 'MySQL aktif' : 'Lokal/fallback'}\n`);
  });
})();

process.on('SIGINT', async () => {
  console.log('\nMenutup server...');
  await db.close();
  process.exit(0);
});
