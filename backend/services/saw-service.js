/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                 SAW SERVICE - BACKEND (Node.js)                       ║
 * ║                                                                             ║
 * ║  Modul: Inti Algoritma Simple Additive Weighting (SAW)                  ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 1.0.0                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const { SAWNormalizer } = require('../utils/saw-normalizer.js');
const { SAWWeightCalculator } = require('../utils/saw-weights.js');

// ════════════════════════════════════════════════════════════════════════════════
//                               KONSTANTA
// ════════════════════════════════════════════════════════════════════════════════

/** Margin pelonggaran budget (+25%) */
const SOFT_BUDGET_MARGIN = 0.25;

/** Toleransi tinggi badan user (cm) */
const TINGGI_TOLERANSI = 10;

/** Jumlah minimum hasil */
const MIN_RESULTS = 1;

/** Bobot untuk skor SAW */
const SAW_WEIGHT = 0.80;

/** Bobot untuk skor ergonomis */
const ERGO_WEIGHT = 0.20;

// ════════════════════════════════════════════════════════════════════════════════
//                            HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Pembulatan ke 4 desimal
 */
function roundTo(x, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round(x * factor) / factor;
}

/**
 * Format angka ke Rupiah
 */
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// ════════════════════════════════════════════════════════════════════════════════
//                          ERGONOMIC SCORING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Menghitung skor ergonomis berdasarkan tinggi badan user
 *
 * @param {Object} motor - Object motor
 * @param {number} tinggiUser - Tinggi badan user (cm)
 * @returns {number} Skor ergonomis [0, 1]
 */
function calculateErgonomicScore(motor, tinggiUser) {
  if (!tinggiUser || tinggiUser === 'null') {
    return 0.80;
  }

  const tinggiNum = Number(tinggiUser);
  const seatH = Number(motor.seat_h) || 760;

  // Hitung tinggi minimum
  const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
  const diff = tinggiNum - minTinggi;

  if (diff >= 15 && diff <= 30) return 1.0;
  if (diff >= 5 && diff < 15)  return 0.9;
  if (diff > 30 && diff <= 45) return 0.8;
  if (diff >= 0 && diff < 5)   return 0.75;
  if (diff > 45)               return 0.6;
  if (diff >= -10)             return 0.7;
  if (diff >= -20)             return 0.5;
  return 0.3;
}

// ════════════════════════════════════════════════════════════════════════════════
//                          FILTERING MOTORS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Menyaring motor berdasarkan kriteria
 */
function filterMotors(motors, filters) {
  const { budget, tipe, cc, tinggi } = filters;
  let filtered = [...motors];

  // FILTER 1: TIPE MOTOR (STRICT)
  if (tipe && tipe !== 'null') {
    filtered = filtered.filter(m => m.category === tipe);
  }

  // FILTER 2: BUDGET (soft filter)
  if (budget && budget > 0 && budget !== 'null') {
    const maxPrice = budget * (1 + SOFT_BUDGET_MARGIN);
    filtered = filtered.filter(m => m.harga <= maxPrice);
  }

  // FILTER 3: KAPASITAS CC
  if (cc && cc !== 'null') {
    switch (cc) {
      case 'kecil':
        filtered = filtered.filter(m => m.cc <= 125);
        break;
      case 'sedang':
        filtered = filtered.filter(m => m.cc > 125 && m.cc <= 250);
        break;
      case 'besar':
        filtered = filtered.filter(m => m.cc > 250 && m.cc <= 500);
        break;
      case 'super':
        filtered = filtered.filter(m => m.cc > 500);
        break;
    }
  }

  // FILTER 4: TINGGI BADAN
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
 * Progressive filtering - melonggarkan filter bertahap
 */
function progressiveFilter(motors, filters) {
  const { budget, tipe, cc, tinggi } = filters;
  const relaxed = [];

  // STEP 0: Normal filter
  let filtered = filterMotors(motors, { budget, tipe, cc, tinggi });
  if (filtered.length >= MIN_RESULTS) {
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // STEP 1: Budget +25%
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.25, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +25%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // STEP 2: Budget +50%
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.50, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +50%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // STEP 3: Budget +100%
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 2.0, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +100%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // STEP 4: Hapus CC filter
  if (cc && cc !== 'null') {
    filtered = filterMotors(motors, { budget, tipe, cc: null, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Kapasitas mesin dilonggarkan');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // STEP 5: Toleransi tinggi +15cm
  if (tinggi && tinggi > 0) {
    filtered = motors.filter(m => {
      if (tipe && tipe !== 'null' && m.category !== tipe) return false;
      const seatH = Number(m.seat_h) || 760;
      const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
      return minTinggi <= tinggi + 15;
    });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Toleransi tinggi +15cm');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // STEP 6: Budget tanpa batas
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: null, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget dilonggarkan');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // STEP 7: Semua tipe (tipe tetap strict)
  filtered = motors.filter(m => {
    if (tipe && tipe !== 'null' && m.category !== tipe) return false;
    return true;
  });

  if (filtered.length >= MIN_RESULTS) {
    relaxed.push('Filter lain dilonggarkan');
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // STEP 8: Fallback
  relaxed.push('Hasil default');
  return {
    motors: filtered.length > 0 ? filtered : motors.slice(0, 1),
    relaxed,
    appliedTipe: tipe
  };
}

// ════════════════════════════════════════════════════════════════════════════════
//                          SAW SCORING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Menghitung skor SAW untuk satu motor
 * Formula: V_i = Σ (W_j × R_ij)
 */
function calculateSAWScore(normalized, weights) {
  let score = 0;

  Object.keys(weights).forEach(kriterion => {
    const normValue = normalized[kriterion] ?? 0.5;
    score += normValue * weights[kriterion];
  });

  return roundTo(score);
}

// ════════════════════════════════════════════════════════════════════════════════
//                        BUILD REASONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Membangun alasan kenapa motor ini direkomendasikan
 */
function buildReasons(motor, answers, allMotors) {
  const reasons = [];
  const { prioritas, usage, tipe } = answers;

  const avgHarga = allMotors.reduce((s, m) => s + m.harga, 0) / allMotors.length;
  const maxBbm = Math.max(...allMotors.map(m => m.bbm));
  const maxPower = Math.max(...allMotors.map(m => m.power));
  const minHarga = Math.min(...allMotors.map(m => m.harga));

  // ALASAN: HARGA
  if (motor.harga <= minHarga * 1.1) {
    reasons.push('Harga termurah di kelasnya');
  } else if (motor.harga < avgHarga * 0.75) {
    reasons.push('Harga sangat terjangkau');
  } else if (motor.harga < avgHarga) {
    reasons.push('Harga kompetitif');
  }

  // ALASAN: BBM
  if (motor.bbm >= maxBbm * 0.95) {
    reasons.push(`Paling irit ${motor.bbm} km/L`);
  } else if (motor.bbm >= maxBbm * 0.85) {
    reasons.push('Sangat irit bahan bakar');
  } else if (motor.bbm >= maxBbm * 0.70) {
    reasons.push('Efisiensi BBM baik');
  }

  // ALASAN: PERFORMA
  if (motor.power >= maxPower * 0.90) {
    reasons.push(`Performa tertinggi ${motor.power} HP`);
  } else if (motor.power >= maxPower * 0.75) {
    reasons.push('Performa tinggi di kelasnya');
  } else if (motor.power >= maxPower * 0.60) {
    reasons.push('Performa mumpuni');
  }

  // BERDASARKAN PRIORITAS
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

  // BERDASARKAN USAGE
  if (usage === 'harian' && motor.bbm >= maxBbm * 0.70) {
    reasons.push('Ideal untuk penggunaan harian');
  }
  if (usage === 'touring' && motor.fuel_l >= 10) {
    reasons.push('Jangkauan touring luas');
  }
  if (usage === 'sport' && motor.power >= maxPower * 0.60) {
    reasons.push('Layak untuk spirited riding');
  }

  // BERDASARKAN TIPE
  if (tipe === 'Matic' && motor.category === 'Matic') {
    reasons.push('Matic otomatis & praktis');
  }
  if (tipe === 'Sport' && motor.category === 'Sport') {
    reasons.push('Sport full fairing');
  }
  if (tipe === 'Naked' && motor.category === 'Naked') {
    reasons.push('Naked streetfighter style');
  }

  return reasons.slice(0, 3);
}

// ════════════════════════════════════════════════════════════════════════════════
//                    MAIN SAW RECOMMENDATION FUNCTION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * ════════════════════════════════════════════════════════════════════════════════╗
 *  runSAW - Fungsi Utama Rekomendasi SAW                                          ║
 * ════════════════════════════════════════════════════════════════════════════════╝
 *
 * @param {Object} answers - Jawaban user dari wizard
 * @param {Array} motorsData - Data motor
 *
 * @returns {Object} Hasil rekomendasi lengkap
 */
function runSAW(answers, motorsData = null) {
  // ── STEP 1: Ambil data motor ─────────────────────────────────────────────────
  if (!motorsData || motorsData.length === 0) {
    console.error('[SAW Service] Error: Data motor tidak tersedia');
    return {
      results: [],
      weights: {},
      relaxed: ['Data motor tidak tersedia'],
      calculation: {},
      meta: {
        method: 'SAW',
        confidence: 0,
        closeRace: false,
        error: 'Data motor tidak tersedia'
      }
    };
  }

  // ── STEP 2: Parse jawaban user ───────────────────────────────────────────────
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

  // ── STEP 3: Progressive filtering ─────────────────────────────────────────────
  const { motors: filteredMotors, relaxed, appliedTipe } = progressiveFilter(
    motorsData,
    { budget, tipe, cc, tinggi }
  );

  if (filteredMotors.length === 0) {
    return {
      results: [],
      weights: {},
      relaxed,
      calculation: {},
      meta: {
        method: 'SAW',
        confidence: 0,
        closeRace: false,
        error: 'Tidak ada motor yang cocok'
      }
    };
  }

  // ── STEP 4: Hitung normalisasi ────────────────────────────────────────────────
  const normalizer = new SAWNormalizer(filteredMotors);

  // ── STEP 5: Hitung bobot ─────────────────────────────────────────────────────
  const weightCalculator = new SAWWeightCalculator(answers);
  const weights = weightCalculator.getWeights();

  // ── STEP 6: Hitung skor untuk setiap motor ────────────────────────────────────
  const scoredMotors = filteredMotors.map(motor => {
    const normalized = normalizer.normalizeMotor(motor);
    const sawScore = calculateSAWScore(normalized, weights);
    const ergoScore = calculateErgonomicScore(motor, tinggi);
    const finalScore = sawScore * SAW_WEIGHT + ergoScore * ERGO_WEIGHT;

    return {
      ...motor,
      sawScore,
      ergoScore,
      Vi: roundTo(finalScore),
      normalized,
    };
  });

  // ── STEP 7: Sort dan ranking ───────────────────────────────────────────────────
  scoredMotors.sort((a, b) => {
    if (b.Vi !== a.Vi) return b.Vi - a.Vi;

    const pwA = a.power / a.weight;
    const pwB = b.power / b.weight;
    if (pwB !== pwA) return pwB - pwA;

    return b.year - a.year;
  });

  scoredMotors.forEach((motor, index) => {
    motor.rank = index + 1;
  });

  // ── STEP 8: Hitung confidence ──────────────────────────────────────────────────
  let confidence = 0.5;
  let closeRace = false;

  if (scoredMotors.length >= 2) {
    const topScore = scoredMotors[0].Vi;
    const secondScore = scoredMotors[1].Vi;
    const gap = topScore > 0 ? (topScore - secondScore) / topScore : 0;

    closeRace = gap < 0.05;
    confidence = Math.min(1, Math.max(0.3, gap * 10 + 0.4));
  }

  // ── STEP 9: Format output ─────────────────────────────────────────────────────
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
    reasons: m.rank <= 3 ? buildReasons(m, answers, filteredMotors) : [],
  }));

  return {
    results,
    weights,
    calculation: {
      candidatesCount: filteredMotors.length,
      matrix: normalizer.getMatrixForDisplay(),
      filterApplied: {
        tipe: appliedTipe || 'Semua',
        budget: budget ? `${formatRupiah(budget)} (strict)` : 'No limit',
        cc: cc || 'Semua',
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
  SAW_WEIGHT,
  ERGO_WEIGHT,
};
