/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   SAW CALCULATOR - MOTORMATCH                           ║
 * ║                                                                             ║
 * ║  Modul: Main entry point untuk Simple Additive Weighting (SAW)          ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 2.0.0 (Modular)                                                ║
 * ║                                                                             ║
 * ║  Catatan:                                                                  ║
 * ║  - Modul ini adalah wrapper yang menggunakan saw-core.js                  ║
 * ║  - Untuk penggunaan langsung, import saw-core.js, saw-normalizer.js,     ║
 * ║    dan saw-weights.js secara terpisah                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

// ════════════════════════════════════════════════════════════════════════════════
//                              COMMENTS LOGIC
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Catatan penggunaan modul ini:
 *
 * OLD (v1): Semua logika dalam satu file saw-calculator.js
 * NEW (v2): Modular - pisahkan jadi:
 *   - saw-normalizer.js  → Normalisasi Min-Max
 *   - saw-weights.js    → Perhitungan bobot dinamis
 *   - saw-core.js       → Logika utama SAW
 *
 * Untuk backward compatibility, modul ini tetap mengekspor fungsi runSAW
 * yang sama dengan versi sebelumnya.
 */

// ════════════════════════════════════════════════════════════════════════════════
//                           DELEGATE TO SAW-CORE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Fungsi utama SAW - delegate ke saw-core.js
 *
 * Catatan: Jika saw-core.js belum di-load, fallback ke implementasi lokal.
 *
 * @param {Object} answers - Jawaban user
 * @returns {Object} Hasil rekomendasi
 */
let _runSAW = null;

function getSAWRunner() {
  // Gunakan runSAW dari saw-core.js jika tersedia
  if (typeof window !== 'undefined' && window.runSAW) {
    return window.runSAW;
  }

  // Fallback: implementasi lokal (dari saw-core.js yang diinline)
  if (_runSAW) return _runSAW;

  // Fallback terakhir: fungsi sederhana
  console.warn('[SAW] Using fallback SAW implementation');
  return function(answers) {
    return {
      results: [],
      weights: {},
      error: 'SAW runner not available'
    };
  };
}

/**
 * Jalankan rekomendasi SAW
 *
 * @param {Object} answers - Jawaban user dari wizard
 * @returns {Object} Hasil rekomendasi
 *
 * Contoh answers:
 * {
 *   budget: "50000000",
 *   usage: "harian",
 *   tipe: "Matic",
 *   prioritas: "bbm",
 *   cc: "sedang",
 *   tinggi: "165"
 * }
 */
function runSAW(answers) {
  const runner = getSAWRunner();
  return runner(answers);
}

// ════════════════════════════════════════════════════════════════════════════════
//                         KONSTANTA & CONFIG
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Konfigurasi untuk backward compatibility
 * dengan kode lama yang mungkin menggunakan konstanta ini
 */
const SAW_CONFIG = Object.freeze({
  SAW_WEIGHT: 0.80,      // Bobot untuk skor SAW
  ERGO_WEIGHT: 0.20,     // Bobot untuk skor ergonomis
  MIN_RESULTS: 1,        // Minimum hasil
  SOFT_BUDGET_MARGIN: 0.25,  // Margin budget
  TINGGI_TOLERANSI: 10,  // Toleransi tinggi
});

// ════════════════════════════════════════════════════════════════════════════════
//                         API HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Kirim request ke backend API untuk rekomendasi SAW
 *
 * @param {Object} answers - Jawaban user
 * @param {boolean} includeDebug - Include debug info
 * @returns {Promise<Object>} Hasil rekomendasi
 */
async function fetchSAWFromAPI(answers, includeDebug = false) {
  const endpoint = includeDebug ? '/api/recommend/debug' : '/api/recommend';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answers)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[SAW API] Request failed:', error.message);
    throw error;
  }
}

/**
 * Mode operasi SAW calculator
 *
 * - 'local': Hitung SAW di frontend (default)
 * - 'api': Hitung SAW di backend via API
 */
const SAW_MODE = {
  LOCAL: 'local',
  API: 'api',
};

let currentMode = SAW_MODE.LOCAL;

/**
 * Set mode SAW (local atau api)
 *
 * @param {string} mode - Mode: 'local' atau 'api'
 */
function setSAWMode(mode) {
  if (mode === SAW_MODE.API || mode === SAW_MODE.LOCAL) {
    currentMode = mode;
    console.log(`[SAW] Mode changed to: ${mode}`);
  }
}

/**
 * Jalankan SAW sesuai mode saat ini
 *
 * @param {Object} answers - Jawaban user
 * @param {Object} options - Options { useAPI: boolean, includeDebug: boolean }
 * @returns {Promise<Object>} Hasil rekomendasi
 */
async function runSAWWithMode(answers, options = {}) {
  const { useAPI = false, includeDebug = false } = options;

  // Jika diminta menggunakan API atau mode adalah API
  if (useAPI || currentMode === SAW_MODE.API) {
    return fetchSAWFromAPI(answers, includeDebug);
  }

  // Fallback ke perhitungan lokal
  return runSAW(answers);
}

// ════════════════════════════════════════════════════════════════════════════════
//                         EXPORT & EXPOSE
// ════════════════════════════════════════════════════════════════════════════════

// Browser global
if (typeof window !== 'undefined') {
  window.runSAW = runSAW;
  window.SAW_CONFIG = SAW_CONFIG;
  window.fetchSAWFromAPI = fetchSAWFromAPI;
  window.SAW_MODE = SAW_MODE;
  window.setSAWMode = setSAWMode;
  window.runSAWWithMode = runSAWWithMode;
}

// Node.js module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runSAW,
    SAW_CONFIG,
    fetchSAWFromAPI,
    SAW_MODE,
    setSAWMode,
    runSAWWithMode,
  };
}
