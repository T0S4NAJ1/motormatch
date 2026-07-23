/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   SAW CALCULATOR - MOTORMATCH                           ║
 * ║                                                                             ║
 * ║  Modul: Main entry point untuk Simple Additive Weighting (SAW)          ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 3.0.0 (API-based fallback)                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

console.log('[SAW] saw-calculator.js loaded');

/**
 * Fungsi utama SAW - menggunakan API backend atau fallback lokal
 *
 * @param {Object} answers - Jawaban user
 * @returns {Object} Hasil rekomendasi
 */
async function runSAWAsync(answers) {
  console.log('[SAW] runSAWAsync called with:', answers);

  // Coba gunakan implementasi lokal dari saw-core.js
  if (typeof window._sawCoreImpl === 'function') {
    console.log('[SAW] Using local saw-core.js implementation');
    return window._sawCoreImpl(answers);
  }

  // Fallback: gunakan API backend
  console.log('[SAW] Using API backend fallback');
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('[SAW] API fallback failed:', e);
  }

  return {
    results: [],
    error: 'Tidak ada implementasi SAW tersedia'
  };
}

// Sinkron wrapper untuk backward compatibility
function runSAW(answers) {
  console.log('[SAW] runSAW called (sync wrapper)');

  // Coba gunakan implementasi lokal dari saw-core.js
  if (typeof window._sawCoreImpl === 'function') {
    console.log('[SAW] Using local saw-core.js');
    return window._sawCoreImpl(answers);
  }

  // Fallback error
  console.error('[SAW] No SAW implementation available');
  return {
    results: [],
    weights: { C1: 0.25, C2: 0.25, C3: 0.25, C4: 0.25 },
    error: 'SAW runner not available'
  };
}

// Konfigurasi
const SAW_CONFIG = Object.freeze({
  SAW_WEIGHT: 0.80,
  ERGO_WEIGHT: 0.20,
  MIN_RESULTS: 1,
  SOFT_BUDGET_MARGIN: 0.25,
  TINGGI_TOLERANSI: 10,
});

const SAW_MODE = { LOCAL: 'local', API: 'api' };
let currentMode = SAW_MODE.LOCAL;

function setSAWMode(mode) {
  if (mode === SAW_MODE.API || mode === SAW_MODE.LOCAL) {
    currentMode = mode;
    console.log(`[SAW] Mode changed to: ${mode}`);
  }
}

async function fetchSAWFromAPI(answers, includeDebug = false) {
  const endpoint = includeDebug ? '/api/recommend/debug' : '/api/recommend';
  console.log('[SAW API] Sending answers:', JSON.stringify(answers, null, 2));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers)
    });
    console.log('[SAW API] Response status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('[SAW API] Got', result.results?.length, 'results');
      console.log('[SAW API] First result CC:', result.results?.[0]?.cc);
      return result;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error('[SAW API] Request failed:', error.message);
    throw error;
  }
}

async function runSAWWithMode(answers, options = {}) {
  const { useAPI = false, includeDebug = false } = options;
  if (useAPI || currentMode === SAW_MODE.API) {
    return fetchSAWFromAPI(answers, includeDebug);
  }
  return runSAW(answers);
}

// Export untuk browser
if (typeof window !== 'undefined') {
  window.runSAW = runSAW;
  window.runSAWAsync = runSAWAsync;
  window.SAW_CONFIG = SAW_CONFIG;
  window.fetchSAWFromAPI = fetchSAWFromAPI;
  window.SAW_MODE = SAW_MODE;
  window.setSAWMode = setSAWMode;
  window.runSAWWithMode = runSAWWithMode;
  console.log('[SAW] All exports registered');
}

// Node.js module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runSAW,
    runSAWAsync,
    SAW_CONFIG,
    fetchSAWFromAPI,
    SAW_MODE,
    setSAWMode,
    runSAWWithMode,
  };
}
