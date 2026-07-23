/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                        SAW CORE - MOTORMATCH                             ║
 * ║                                                                             ║
 * ║  Modul: Inti Algoritma Simple Additive Weighting (SAW)                  ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 1.0.0                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *                                    TEORI
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  SIMPLE ADDITIVE WEIGHTING (SAW)
 *
 *  Metode SAW adalah salah satu metode Sistem Pendukung Keputusan (SPK)
 *  yang paling sederhana dan banyak digunakan.
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │                         LANGKAH-LANGKAH SAW                            │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │                                                                         │
 *  │  LANGKAH 1: Tentukan Alternatif dan Kriteria                            │
 *  │  ┌──────────┬──────────┬──────────┬──────────┐                         │
 *  │  │  Motor   │  Harga   │   BBM    │  Power   │                         │
 *  │  ├──────────┼──────────┼──────────┼──────────┤                         │
 *  │  │ Honda B. │ 18.750.000│  59.5   │   6.57   │                         │
 *  │  │ Yamaha M.│ 17.500.000│  61.6   │   9.4    │                         │
 *  │  │ Honda V.  │ 27.000.000│  46.8   │  15.8    │                         │
 *  │  └──────────┴──────────┴──────────┴──────────┘                         │
 *  │                                                                         │
 *  │  LANGKAH 2: Normalisasi Matrix (R)                                      │
 *  │                                                                         │
 *  │    BENEFIT: R = (X - min) / (max - min)                                │
 *  │    COST:    R = (max - X) / (max - min)                                │
 *  │                                                                         │
 *  │  LANGKAH 3: Hitung Skor Total (V)                                       │
 *  │                                                                         │
 *  │    V_i = Σ (W_j × R_ij)                                                │
 *  │                                                                         │
 *  │    V = Bobot × Normalisasi                                              │
 *  │                                                                         │
 *  │  LANGKAH 4: Perangkingan                                                │
 *  │                                                                         │
 *  │    Urutkan V_i dari terbesar → terkecil                                 │
 *  │    Motor dengan V tertinggi = rekomendasi terbaik                        │
 *  │                                                                         │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *                               KONSTANTA
 * ════════════════════════════════════════════════════════════════════════════════
 */

'use strict';

console.log('[SAW] saw-core.js LOADING - motor-data-store should be loaded first');

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           KONSTANTA FILTERING                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/** Margin pelonggaran budget (+25%) */
const SOFT_BUDGET_MARGIN = 0.25;

/** Toleransi tinggi badan user (cm) */
const TINGGI_TOLERANSI = 10;

/** Jumlah minimum hasil yang harus ditampilkan */
const MIN_RESULTS = 5;

/** Bobot untuk skor SAW */
const SAW_WEIGHT = 0.80;

/** Bobot untuk skor ergonomis */
const ERGO_WEIGHT = 0.20;

/** Jumlah desimal untuk pembulatan */
const DECIMAL_PLACES = 4;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           HELPER FUNCTIONS                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Pembulatan ke N desimal
 * @param {number} x - Nilai
 * @param {number} decimals - Jumlah desimal
 * @returns {number}
 */
function roundTo(x, decimals = DECIMAL_PLACES) {
  const factor = Math.pow(10, decimals);
  return Math.round(x * factor) / factor;
}

/**
 * Format angka ke Rupiah
 * @param {number} num - Jumlah
 * @returns {string}
 */
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         ERGONOMIC SCORING                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Menghitung skor ergonomis berdasarkan tinggi badan user
 *
 * @param {Object} motor - Object motor
 * @param {number} tinggiUser - Tinggi badan user (cm)
 * @returns {number} Skor ergonomis [0, 1]
 *
 * Teori:
 * - Jika tinggi user >> tinggi_min motor → user kesusahaan
 * - Jika tinggi user < tinggi_min motor → jangkauan kurang
 * - Jika selisih -10cm ~ +30cm → ergonomis optimal
 */
function calculateErgonomicScore(motor, tinggiUser) {
  // Jika tinggi user tidak diketahui, beri skor moderate
  if (!tinggiUser || tinggiUser === 'null') {
    return 0.80;
  }

  const tinggiNum = Number(tinggiUser);
  const seatH = Number(motor.seat_h) || 760;

  // Hitung tinggi minimum yang bisa menapak tanah
  // Formula: (seat_h - 600) * 0.22 + 120
  const minTinggi = Math.round((seatH - 600) * 0.22 + 120);

  // Selisih tinggi user dengan tinggi minimum motor
  const diff = tinggiNum - minTinggi;

  // Penilaian berdasarkan selisih
  if (diff >= 15 && diff <= 30) return 1.0;  // Optimal
  if (diff >= 5 && diff < 15)  return 0.9;   // Bagus
  if (diff > 30 && diff <= 45) return 0.8;   // Acceptable
  if (diff >= 0 && diff < 5)   return 0.75;  // Sedikit tight
  if (diff > 45)               return 0.6;   // Terlalu tinggi
  if (diff >= -10)             return 0.7;   // Sedikit rendah
  if (diff >= -20)             return 0.5;   // Kurang ideal
  return 0.3; // Terlalu rendah
}

/**
 * Cek apakah motor masuk dalam segment CC
 */
function inCCSegment(m, seg) {
  switch (seg) {
    case 'kecil1': return m.cc >= 100 && m.cc <= 150;
    case 'kecil2': return m.cc >= 151 && m.cc <= 250;
    case 'sedang': return m.cc >= 251 && m.cc <= 600;
    case 'besar':  return m.cc >= 601 && m.cc <= 1000;
    default:       return true;
  }
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                          FILTERING MOTORS                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Menyaring motor berdasarkan kriteria
 *
 * @param {Array} motors - Semua motor
 * @param {Object} filters - Filter criteria
 * @returns {Array} Motor yang sudah disaring
 *
 * Filter yang diterapkan:
 * 1. Tipe motor (STRICT - tidak pernah dilonggarkan)
 * 2. Budget
 * 3. Kapasitas CC
 * 4. Tinggi badan
 */
function filterMotors(motors, filters) {
  const { budget, tipe, cc, tinggi } = filters;
  let filtered = [...motors];

  // ── FILTER 1: TIPE MOTOR (STRICT) ────────────────────────────────────────
  if (tipe && tipe !== 'null') {
    filtered = filtered.filter(m => m.category === tipe);
  }

  // ── FILTER 2: BUDGET (soft filter) ───────────────────────────────────────
  if (budget && budget > 0 && budget !== 'null') {
    const maxPrice = budget * (1 + SOFT_BUDGET_MARGIN);
    filtered = filtered.filter(m => m.harga <= maxPrice);
  }

  // ── FILTER 3: KAPASITAS CC ───────────────────────────────────────────────
  if (cc && cc !== 'null') {
    switch (cc) {
      case 'kecil1': // 100-150cc
        filtered = filtered.filter(m => m.cc >= 100 && m.cc <= 150);
        break;
      case 'kecil2': // 150-250cc
        filtered = filtered.filter(m => m.cc >= 151 && m.cc <= 250);
        break;
      case 'sedang': // 250-600cc
        filtered = filtered.filter(m => m.cc >= 251 && m.cc <= 600);
        break;
      case 'besar': // 600-1000cc
        filtered = filtered.filter(m => m.cc >= 601 && m.cc <= 1000);
        break;
    }
  }

  // ── FILTER 4: TINGGI BADAN ───────────────────────────────────────────────
  if (tinggi && tinggi > 0 && tinggi !== 'null') {
    filtered = filtered.filter(m => {
      const seatH = Number(m.seat_h) || 760;
      const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
      return minTinggi <= tinggi + TINGGI_TOLERANSI;
    });
  }

  return filtered;
}

/**
 * Progressive filtering - melonggarkan filter bertahap jika hasil < MIN_RESULTS
 *
 * Urutan pelonggaran (dari least aggressive ke most aggressive):
 * 1. Budget +25%
 * 2. Budget +50%
 * 3. CC: besar → sedang (601-1000cc → 251-600cc)
 * 4. CC: sedang → kecil2 (251-600cc → 151-250cc)
 * 5. Budget +100%
 * 6. Toleransi tinggi +20cm
 * 7. Budget tanpa batas
 * 8. Toleransi tinggi +30cm
 * 9. Semua tipe motor
 * 10. Semua CC (CC filter dihapus)
 *
 * NOTE: Filter CC dan Tipe MOTOR dilonggarkan bertahap, bukan dihapus sepenuhnya
 *
 * @param {Array} motors - Semua motor
 * @param {Object} filters - Filter awal
 * @returns {Object} { motors, relaxed, appliedTipe }
 */
function progressiveFilter(motors, filters) {
  const { budget, tipe, cc, tinggi } = filters;
  const relaxed = [];

  // ── STEP 0: Normal filter (strict) ───────────────────────────────────────
  let filtered = filterMotors(motors, { budget, tipe, cc, tinggi });
  if (filtered.length >= MIN_RESULTS) {
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // ── STEP 1: Budget +25% ──────────────────────────────────────────────────
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.25, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +25%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 2: Budget +50% ─────────────────────────────────────────────────
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.50, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +50%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 3: CC dilonggarkan (besar → sedang) ────────────────────────────
  if (cc === 'besar') {
    filtered = filterMotors(motors, { budget, tipe, cc: 'sedang', tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('CC dilonggarkan ke 251–600cc');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
    // Juga coba budget +25%
    if (budget && budget > 0) {
      filtered = filterMotors(motors, { budget: budget * 1.25, tipe, cc: 'sedang', tinggi });
      if (filtered.length >= MIN_RESULTS) {
        relaxed.push('CC dilonggarkan ke 251–600cc + Budget +25%');
        return { motors: filtered, relaxed, appliedTipe: tipe };
      }
    }
  }

  // ── STEP 4: CC dilonggarkan (sedang → kecil2) ────────────────────────────
  if (cc === 'sedang' || cc === 'besar') {
    const targetCC = cc === 'besar' ? 'sedang' : 'kecil2';
    filtered = filterMotors(motors, { budget, tipe, cc: targetCC, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      const ccLabel = targetCC === 'sedang' ? '251–600cc' : '151–250cc';
      relaxed.push(`CC dilonggarkan ke ${ccLabel}`);
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 5: Budget +100% ─────────────────────────────────────────────────
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 2.0, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +100%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 6: Toleransi tinggi +20cm ──────────────────────────────────────
  if (tinggi && tinggi > 0) {
    filtered = motors.filter(m => {
      if (tipe && tipe !== 'null' && m.category !== tipe) return false;
      if (cc && cc !== 'null' && !inCCSegment(m, cc)) return false;
      const seatH = Number(m.seat_h) || 760;
      const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
      return minTinggi <= tinggi + 20;
    });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Toleransi tinggi +20cm');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 7: Budget tanpa batas ───────────────────────────────────────────
  filtered = filterMotors(motors, { budget: null, tipe, cc, tinggi });
  if (filtered.length >= MIN_RESULTS) {
    relaxed.push('Budget dilonggarkan');
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // ── STEP 8: Toleransi tinggi +30cm (maksimum) ──────────────────────────
  if (tinggi && tinggi > 0) {
    filtered = motors.filter(m => {
      if (tipe && tipe !== 'null' && m.category !== tipe) return false;
      if (cc && cc !== 'null' && !inCCSegment(m, cc)) return false;
      const seatH = Number(m.seat_h) || 760;
      const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
      return minTinggi <= tinggi + 30;
    });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Toleransi tinggi +30cm');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 9: Semua tipe motor (CC filter tetap aktif) ────────────────────
  filtered = motors.filter(m => {
    if (cc && cc !== 'null' && !inCCSegment(m, cc)) return false;
    return true;
  });
  if (filtered.length >= MIN_RESULTS) {
    relaxed.push('Filter tipe dilonggarkan');
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // ── STEP 10: Semua CC (hanya budget filter aktif) ────────────────────────
  filtered = filterMotors(motors, { budget, tipe, cc: null, tinggi });
  if (filtered.length >= MIN_RESULTS) {
    relaxed.push('CC dilonggarkan ke semua');
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // ── STEP 11: CC dilonggarkan + Budget +25% ──────────────────────────────
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.25, tipe, cc: null, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('CC & Budget dilonggarkan +25%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // ── STEP 12: Fallback - KEMBALI KE HASIL AWAL DENGAN FILTER CC ──────────
  // Jika tidak ada hasil sama sekali dengan filter CC, kembalikan hasil strict
  filtered = filterMotors(motors, { budget, tipe, cc, tinggi });
  if (filtered.length > 0) {
    relaxed.push('Hasil dengan filter CC aktif');
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // ── STEP 13: Absolute fallback ──────────────────────────────────────────
  relaxed.push('Hasil default');
  return {
    motors: motors.slice(0, MIN_RESULTS),
    relaxed,
    appliedTipe: tipe
  };
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                          SAW SCORING                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Menghitung skor SAW untuk satu motor
 *
 * Formula:
 *   V_i = Σ (W_j × R_ij)
 *
 * @param {Object} normalized - Nilai normalisasi motor
 * @param {Object} weights - Bobot kriteria
 * @returns {number} Skor SAW
 */
function calculateSAWScore(normalized, weights) {
  let score = 0;

  Object.keys(weights).forEach(kriterion => {
    // Ambil nilai normalisasi, default 0.5 jika tidak ada
    const normValue = normalized[kriterion] ?? 0.5;
    score += normValue * weights[kriterion];
  });

  return roundTo(score);
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                        BUILD REASONS                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Membangun alasan kenapa motor ini direkomendasikan
 *
 * @param {Object} motor - Object motor
 * @param {Object} answers - Jawaban user
 * @param {Array} allMotors - Semua motor yang sudah difilter
 * @returns {Array} Array alasan
 */
function buildReasons(motor, answers, allMotors) {
  const reasons = [];
  const { prioritas, usage, tipe } = answers;

  // Statistik untuk perbandingan
  const avgHarga = allMotors.reduce((s, m) => s + m.harga, 0) / allMotors.length;
  const maxBbm = Math.max(...allMotors.map(m => m.bbm));
  const maxPower = Math.max(...allMotors.map(m => m.power));
  const minHarga = Math.min(...allMotors.map(m => m.harga));

  // ── ALASAN: HARGA ─────────────────────────────────────────────────────────
  if (motor.harga <= minHarga * 1.1) {
    reasons.push('Harga termurah di kelasnya');
  } else if (motor.harga < avgHarga * 0.75) {
    reasons.push('Harga sangat terjangkau');
  } else if (motor.harga < avgHarga) {
    reasons.push('Harga kompetitif');
  }

  // ── ALASAN: BBM ───────────────────────────────────────────────────────────
  if (motor.bbm >= maxBbm * 0.95) {
    reasons.push(`Paling irit ${motor.bbm} km/L`);
  } else if (motor.bbm >= maxBbm * 0.85) {
    reasons.push('Sangat irit bahan bakar');
  } else if (motor.bbm >= maxBbm * 0.70) {
    reasons.push('Efisiensi BBM baik');
  }

  // ── ALASAN: PERFORMA ─────────────────────────────────────────────────────
  if (motor.power >= maxPower * 0.90) {
    reasons.push(`Performa tertinggi ${motor.power} HP`);
  } else if (motor.power >= maxPower * 0.75) {
    reasons.push('Performa tinggi di kelasnya');
  } else if (motor.power >= maxPower * 0.60) {
    reasons.push('Performa mumpuni');
  }

  // ── ALASAN: BERDASARKAN PRIORITAS ────────────────────────────────────────
  if (prioritas === 'harga' && motor.harga <= avgHarga) {
    reasons.push('Ideal untuk budget Anda');
  }
  if (prioritas === 'bbm' && motor.bbm >= maxBbm * 0.85) {
    reasons.push('Paling irit di kelasnya');
  }
  if (prioritas === 'performa' && motor.power >= maxPower * 0.75) {
    reasons.push('Performa sesuai prioritas');
  }
  if (prioritas === 'nyaman' && motor.nyaman >= 8) {
    reasons.push('Kenyamanan tinggi');
  }

  // ── ALASAN: BERDASARKAN USAGE ─────────────────────────────────────────────
  if (usage === 'harian' && motor.bbm >= maxBbm * 0.70) {
    reasons.push('Ideal untuk penggunaan harian');
  }
  if (usage === 'touring' && motor.fuel_l >= 10) {
    reasons.push('Jangkauan touring luas');
  }
  if (usage === 'sport' && motor.power >= maxPower * 0.60) {
    reasons.push('Layak untuk spirited riding');
  }

  // ── ALASAN: BERDASARKAN TIPE ──────────────────────────────────────────────
  if (tipe === 'Matic' && motor.category === 'Matic') {
    reasons.push('Matic otomatis & praktis');
  }
  if (tipe === 'Sport' && motor.category === 'Sport') {
    reasons.push('Sport full fairing');
  }
  if (tipe === 'Naked' && motor.category === 'Naked') {
    reasons.push('Naked streetfighter style');
  }

  // Ambil 3 alasan teratas
  return reasons.slice(0, 3);
}

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    MAIN SAW RECOMMENDATION FUNCTION                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  runSAW - Fungsi Utama Rekomendasi SAW                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * @param {Object} answers - Jawaban user dari wizard
 * @param {Array} motorsData - Data motor (opsional, default dari window.MOTORS)
 *
 * @param {string} answers.budget - Budget maksimal (number atau 'null')
 * @param {string} answers.usage - Penggunaan: 'harian', 'touring', 'sport', 'keluarga'
 * @param {string} answers.tipe - Tipe motor: 'Matic', 'Sport', 'Naked', 'null'
 * @param {string} answers.prioritas - Prioritas: 'harga', 'bbm', 'performa', 'nyaman'
 * @param {string} answers.cc - Kapasitas CC: 'kecil1', 'kecil2', 'sedang', 'besar'
 * @param {string} answers.tinggi - Tinggi badan user (cm)
 *
 * @returns {Object} Hasil rekomendasi
 *
 * Contoh return:
 * {
 *   results: [...],
 *   weights: {...},
 *   calculation: {...},
 *   meta: {...}
 * }
 */
function runSAW(answers, motorsData = null) {
  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1: Ambil data motor
  // ════════════════════════════════════════════════════════════════════════════
  let motors = motorsData;

  console.log('[SAW] Starting with motorsData:', motorsData);
  console.log('[SAW] window.MOTORS:', typeof window !== 'undefined' ? window.MOTORS : 'N/A');
  console.log('[SAW] window.MOTORS length:', typeof window !== 'undefined' && window.MOTORS ? window.MOTORS.length : 'N/A');

  console.log('[SAW] Input answers:', JSON.stringify(answers));

  if (!motors || motors.length === 0) {
    // Coba ambil dari window.MOTORS (fallback)
    if (typeof window !== 'undefined' && window.MOTORS && window.MOTORS.length > 0) {
      motors = window.MOTORS;
      console.log('[SAW] Using window.MOTORS, count:', motors.length);
    } else if (typeof window !== 'undefined' && window.DB?.getAllMotors) {
      const dbMotors = window.DB.getAllMotors();
      console.log('[SAW] Using DB.getAllMotors, count:', dbMotors.length);
      if (dbMotors.length > 0) motors = dbMotors;
    }
  }

  if (!motors || motors.length === 0) {
    console.error('[SAW] Error: Data motor tidak tersedia');
    const defaultWeights = (typeof window !== 'undefined' && window.DEFAULT_WEIGHTS)
      ? window.DEFAULT_WEIGHTS
      : { C1: 0.25, C2: 0.25, C3: 0.25, C4: 0.25 };
    return {
      results: [],
      weights: defaultWeights,
      relaxed: ['Data motor tidak tersedia'],
      meta: {
        method: 'SAW',
        confidence: 0,
        closeRace: false,
        error: 'Data motor tidak tersedia'
      }
    };
  }

  console.log('[SAW] Using motors count:', motors.length);

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2: Parse jawaban user
  // ════════════════════════════════════════════════════════════════════════════
  const budget = (!answers.budget || answers.budget === 'null')
    ? null
    : Number(answers.budget);
  const usage = answers.usage || 'harian';
  const tipe = (!answers.tipe || answers.tipe === 'null')
    ? null
    : answers.tipe;
  const prioritas = answers.prioritas || 'seimbang';
  const cc = (!answers.cc || answers.cc === 'null')
    ? null
    : answers.cc;
  const tinggi = (!answers.tinggi || answers.tinggi === 'null')
    ? null
    : Number(answers.tinggi);

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3: Progressive filtering
  // ════════════════════════════════════════════════════════════════════════════
  const { motors: filteredMotors, relaxed, appliedTipe } = progressiveFilter(
    motors,
    { budget, tipe, cc, tinggi }
  );

  if (filteredMotors.length === 0) {
    return {
      results: [],
      weights: {},
      relaxed,
      meta: {
        method: 'SAW',
        confidence: 0,
        closeRace: false,
        error: 'Tidak ada motor yang cocok'
      }
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 4: Hitung normalisasi
  // ════════════════════════════════════════════════════════════════════════════
  let normalizer;
  if (typeof SAWNormalizer !== 'undefined') {
    normalizer = new SAWNormalizer(filteredMotors);
  } else {
    // Fallback jika SAWNormalizer belum di-load
    normalizer = {
      normalizeMotor: (m) => {
        // Sederhana fallback - normalisasi sederhana
        const features = ['harga', 'bbm', 'power', 'torque', 'weight', 'cc', 'seat_h', 'nyaman'];
        const result = {};
        features.forEach(f => { result[f] = 0.5; });
        return result;
      },
      stats: { min: {}, max: {}, range: {} }
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 5: Hitung bobot
  // ════════════════════════════════════════════════════════════════════════════
  let weightCalculator;
  if (typeof SAWWeightCalculator !== 'undefined') {
    weightCalculator = new SAWWeightCalculator(answers);
  } else {
    // Fallback jika SAWWeightCalculator belum di-load
    weightCalculator = {
      getWeights: () => ({ ...DEFAULT_WEIGHTS }),
      adjustmentLog: []
    };
  }

  const weights = weightCalculator.getWeights();

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 6: Hitung skor untuk setiap motor
  // ════════════════════════════════════════════════════════════════════════════
  const scoredMotors = filteredMotors.map(motor => {
    // Normalisasi motor
    const normalized = normalizer.normalizeMotor(motor);

    // Hitung skor SAW
    const sawScore = calculateSAWScore(normalized, weights);

    // Hitung skor ergonomis
    const ergoScore = calculateErgonomicScore(motor, tinggi);

    // Skor akhir: SAW (80%) + Ergonomis (20%)
    const finalScore = sawScore * SAW_WEIGHT + ergoScore * ERGO_WEIGHT;

    return {
      ...motor,
      sawScore,
      ergoScore,
      Vi: roundTo(finalScore),
      normalized,
    };
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 7: Sort dan ranking
  // ════════════════════════════════════════════════════════════════════════════
  scoredMotors.sort((a, b) => {
    // Primary: Urutkan berdasarkan Vi (skor akhir)
    if (b.Vi !== a.Vi) return b.Vi - a.Vi;

    // Secondary: Power-to-weight ratio
    const pwA = a.power / a.weight;
    const pwB = b.power / b.weight;
    if (pwB !== pwA) return pwB - pwA;

    // Tertiary: Tahun terbaru
    return b.year - a.year;
  });

  // Tambahkan rank
  scoredMotors.forEach((motor, index) => {
    motor.rank = index + 1;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 8: Hitung confidence
  // ════════════════════════════════════════════════════════════════════════════
  let confidence = 0.5;
  let closeRace = false;

  if (scoredMotors.length >= 2) {
    const topScore = scoredMotors[0].Vi;
    const secondScore = scoredMotors[1].Vi;
    const gap = topScore > 0 ? (topScore - secondScore) / topScore : 0;

    closeRace = gap < 0.05;
    confidence = Math.min(1, Math.max(0.3, gap * 10 + 0.4));
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 9: Build reasons untuk top 3
  // ════════════════════════════════════════════════════════════════════════════
  const topReasons = scoredMotors.length > 0
    ? buildReasons(scoredMotors[0], answers, filteredMotors)
    : [];

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 10: Format output
  // ════════════════════════════════════════════════════════════════════════════

  const ccLabelMap = {
    kecil1: '100–150cc',
    kecil2: '151–250cc',
    sedang: '251–600cc',
    besar: '601–1000cc'
  };

  // Format results untuk response
  const results = scoredMotors.map(m => ({
    rank: m.rank,
    id: m.id,
    brand: m.brand,
    model: m.model,
    year: m.year,
    category: m.category,
    cc: m.cc,
    harga: m.harga,
    hargaFormatted: formatRupiah(m.harga),
    bbm: m.bbm,
    power: m.power,
    torque: m.torque,
    nyaman: m.nyaman,
    img: m.img,
    Vi: m.Vi,
    sawScore: m.sawScore,
    ergoScore: m.ergoScore,
    normalized: m.normalized,
    reasons: m.rank <= 3 ? buildReasons(m, answers, filteredMotors) : [],
  }));

  return {
    results,
    weights,
    calculation: {
      candidatesCount: filteredMotors.length,
      filterApplied: {
        tipe: appliedTipe || 'Semua',
        budget: budget ? `${formatRupiah(budget)} (strict)` : 'No limit',
        cc: cc ? (ccLabelMap[cc] || cc) : 'Semua',
      },
      appliedRelaxation: relaxed,
    },
    meta: {
      method: 'SAW',
      confidence: roundTo(confidence, 2),
      closeRace,
      timestamp: new Date().toISOString(),
    }
  };
}

// ── Export ──────────────────────────────────────────────────────────────────────

// Browser global - SIMPAN di _sawCoreImpl agar bisa diakses wrapper
if (typeof window !== 'undefined') {
  window._sawCoreImpl = runSAW;  // Simpan implementasi asli
  window.runSAW = runSAW;        // Timpa dengan implementasi asli
  console.log('[SAW] Core loaded - _sawCoreImpl and runSAW set');
}

// Node.js module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runSAW,
    filterMotors,
    progressiveFilter,
    calculateErgonomicScore,
    calculateSAWScore,
    buildReasons,
    roundTo,
    formatRupiah,
    SOFT_BUDGET_MARGIN,
    TINGGI_TOLERANSI,
    MIN_RESULTS,
    SAW_WEIGHT,
    ERGO_WEIGHT,
  };
}
