'use strict';

/* ============================================================
   SAW (Simple Additive Weighting) Calculator
   Metode rekomendasi motor dengan bobot kriteria

   Perbaikan:
   - Filter tipe motor selalu diterapkan secara STRICT
   - Normalisasi berdasarkan tipe motor yang DIPILIH
   - Perbandingan dilakukan dalam kategori yang sama
   ============================================================ */

const getMOTORS = () => window.MOTORS || [];

/* ============================================================
   CONSTANTS
   ============================================================ */
const SOFT_BUDGET_MARGIN = 0.25;
const TINGGI_TOLERANSI   = 10;
const MIN_RESULTS        = 1; // Minimal 1 hasil
const MAX_CC_DEFAULT     = 250;

const round4 = x => Math.round(x * 10000) / 10000;
const round2 = x => Math.round(x * 100) / 100;

/* ============================================================
   SAW NORMALIZER - TYPE SPECIFIC
   Normalisasi berdasarkan tipe motor yang DIPILIH user
   ============================================================ */
class SAWNormalizer {
  constructor(motors, selectedTipe) {
    this.motors = motors;
    this.selectedTipe = selectedTipe; // Tipe yang dipilih user
    this.stats = this.calculateStats();
  }

  calculateStats() {
    // Stats untuk semua motor yang sudah difilter
    const features = ['harga', 'bbm', 'power', 'torque', 'weight', 'cc', 'seat_h', 'fuel_l', 'nyaman'];
    const stats = {};

    features.forEach(f => {
      const values = this.motors.map(m => Number(m[f]) || 0);
      stats[f] = {
        min: Math.min(...values),
        max: Math.max(...values),
        range: Math.max(...values) - Math.min(...values)
      };
    });

    return stats;
  }

  // Normalize benefit criteria (higher is better)
  normalizeBenefit(value, feature) {
    const s = this.stats[feature];
    if (!s || s.range === 0) return 1;
    return (value - s.min) / s.range;
  }

  // Normalize cost criteria (lower is better)
  normalizeCost(value, feature) {
    const s = this.stats[feature];
    if (!s || s.range === 0) return 1;
    return (s.max - value) / s.range;
  }

  // Normalize motor untuk SAW
  normalizeMotor(motor) {
    return {
      harga:   this.normalizeCost(motor.harga, 'harga'),
      bbm:     this.normalizeBenefit(motor.bbm, 'bbm'),
      power:   this.normalizeBenefit(motor.power, 'power'),
      torque:  this.normalizeBenefit(motor.torque, 'torque'),
      weight:  this.normalizeCost(motor.weight, 'weight'),
      cc:      this.normalizeBenefit(motor.cc, 'cc'),
      seat_h:  this.normalizeBenefit(motor.seat_h, 'seat_h'),
      fuel_l:  this.normalizeBenefit(motor.fuel_l, 'fuel_l'),
      nyaman:  this.normalizeBenefit(motor.nyaman, 'nyaman')
    };
  }
}

/* ============================================================
   WEIGHT CALCULATOR
   Hitung bobot berdasarkan jawaban user
   ============================================================ */
function calculateWeights(answers) {
  // Default weights
  const weights = {
    harga:   0.20,
    bbm:     0.20,
    power:   0.20,
    torque:  0.10,
    weight:  0.05,
    cc:      0.05,
    seat_h:  0.05,
    fuel_l:  0.05,
    nyaman:  0.10
  };

  const { prioritas, usage, budget, tipe } = answers;

  // Adjust berdasarkan budget
  if (budget) {
    const budgetNum = Number(budget);
    if (budgetNum <= 20000000) {
      weights.harga = 0.30;
      weights.bbm = 0.25;
      weights.power = 0.10;
      weights.nyaman = 0.15;
    } else if (budgetNum <= 50000000) {
      weights.harga = 0.15;
      weights.bbm = 0.15;
      weights.power = 0.30;
      weights.nyaman = 0.15;
    } else if (budgetNum <= 150000000) {
      weights.harga = 0.05;
      weights.bbm = 0.10;
      weights.power = 0.40;
      weights.nyaman = 0.20;
    } else {
      weights.harga = 0.02;
      weights.bbm = 0.05;
      weights.power = 0.50;
      weights.nyaman = 0.20;
    }
  }

  // Prioritas utama
  switch (prioritas) {
    case 'harga':
      weights.harga = 0.45;
      weights.bbm = 0.25;
      weights.power = 0.05;
      break;
    case 'bbm':
      weights.bbm = 0.45;
      weights.harga = 0.25;
      weights.power = 0.05;
      break;
    case 'performa':
      weights.power = 0.45;
      weights.torque = 0.20;
      weights.cc = 0.10;
      break;
    case 'nyaman':
      weights.nyaman = 0.45;
      weights.seat_h = 0.20;
      weights.power = 0.05;
      break;
  }

  // Usage adjustment
  switch (usage) {
    case 'harian':
      weights.bbm = Math.max(weights.bbm, 0.30);
      weights.harga = Math.max(weights.harga, 0.15);
      weights.weight = Math.max(weights.weight, 0.10);
      break;
    case 'touring':
      weights.fuel_l = Math.max(weights.fuel_l, 0.20);
      weights.nyaman = Math.max(weights.nyaman, 0.20);
      weights.bbm = Math.max(weights.bbm, 0.15);
      break;
    case 'sport':
      weights.power = Math.max(weights.power, 0.40);
      weights.cc = Math.max(weights.cc, 0.15);
      weights.bbm = Math.min(weights.bbm, 0.05);
      break;
    case 'keluarga':
      weights.nyaman = Math.max(weights.nyaman, 0.30);
      weights.seat_h = Math.max(weights.seat_h, 0.15);
      weights.weight = Math.max(weights.weight, 0.10);
      break;
  }

  // Tipe motor adjustment - PASTIKAN tipe diterapkan dengan benar
  if (tipe && tipe !== 'null') {
    switch (tipe) {
      case 'Matic':
        // Matic: prioritas irit, ringan, praktis
        weights.harga = Math.max(weights.harga, 0.15);
        weights.bbm = Math.max(weights.bbm, 0.30);
        weights.weight = Math.max(weights.weight, 0.25);
        weights.nyaman = Math.max(weights.nyaman, 0.15);
        weights.power = 0.05;
        break;
      case 'Sport':
        // Sport: prioritas performa tinggi
        weights.power = Math.max(weights.power, 0.40);
        weights.cc = Math.max(weights.cc, 0.20);
        weights.torque = Math.max(weights.torque, 0.15);
        weights.harga = 0.05;
        weights.bbm = 0.05;
        weights.nyaman = 0.05;
        break;
      case 'Naked':
        // Naked: seimbang performa dan gaya
        weights.power = Math.max(weights.power, 0.30);
        weights.nyaman = Math.max(weights.nyaman, 0.25);
        weights.cc = Math.max(weights.cc, 0.15);
        weights.bbm = Math.max(weights.bbm, 0.10);
        break;
    }
  }

  // Normalize weights to sum = 1
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(k => {
    weights[k] = weights[k] / total;
  });

  return weights;
}

/* ============================================================
   SAW SCORING
   ============================================================ */
function calculateSAWScore(normalizedMotor, weights) {
  let score = 0;
  Object.keys(weights).forEach(k => {
    score += (normalizedMotor[k] || 0.5) * weights[k];
  });
  return round4(score);
}

/* ============================================================
   ERGONOMIC FIT SCORE
   ============================================================ */
function ergonomicScore(motor, tinggiUser) {
  if (!tinggiUser || tinggiUser === 'null') return 0.8;

  const tinggiNum = Number(tinggiUser);
  const seatH = Number(motor.seat_h) || 760;
  const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
  const diff = tinggiNum - minTinggi;

  if (diff >= 15 && diff <= 30) return 1.0;
  if (diff >= 5 && diff < 15) return 0.9;
  if (diff > 30 && diff <= 45) return 0.8;
  if (diff >= 0 && diff < 5) return 0.75;
  if (diff > 45) return 0.6;
  if (diff >= -10) return 0.7;
  if (diff >= -20) return 0.5;
  return 0.3;
}

/* ============================================================
   FILTER MOTORS - TIPE SELALU STRICT
   Tipe motor TIDAK PERNAH dilonggarkan
   ============================================================ */
function filterMotors(motors, filters) {
  const { budget, tipe, cc, tinggi } = filters;
  let filtered = [...motors];

  // 1. TIPE FILTER - STRICT, tidak pernah dilonggarkan
  if (tipe && tipe !== 'null') {
    filtered = filtered.filter(m => m.category === tipe);
  }

  // 2. Budget filter - bisa dilonggarkan nanti
  if (budget && budget > 0 && budget !== 'null') {
    const maxPrice = budget * (1 + SOFT_BUDGET_MARGIN);
    filtered = filtered.filter(m => m.harga <= maxPrice);
  }

  // 3. CC filter
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

  // 4. Tinggi filter
  if (tinggi && tinggi > 0 && tinggi !== 'null') {
    filtered = filtered.filter(m => {
      const seatH = Number(m.seat_h) || 760;
      const minTinggi = Math.round((seatH - 600) * 0.22 + 120);
      return minTinggi <= tinggi + TINGGI_TOLERANSI;
    });
  }

  return filtered;
}

/* ============================================================
   PROGRESSIVE FILTER - TIPE TIDAK PERNAH DILONGGARKAN
   ============================================================ */
function progressiveFilter(motors, filters) {
  const { budget, tipe, cc, tinggi } = filters;
  const relaxed = [];

  // Step 1: Normal filter (tipe sudah strict)
  let filtered = filterMotors(motors, { budget, tipe, cc, tinggi });
  if (filtered.length >= MIN_RESULTS) {
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // Step 2: Longgarkan budget +25%
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.25, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +25%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // Step 3: Longgarkan budget +50%
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 1.50, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +50%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // Step 4: Longgarkan budget +100% (2x)
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: budget * 2.0, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget ditambah +100%');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // Step 5: Hapus CC filter
  if (cc && cc !== 'null') {
    filtered = filterMotors(motors, { budget, tipe, cc: null, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Kapasitas mesin dilonggarkan');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // Step 6: Longgarkan tinggi +15cm
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

  // Step 7: Longgarkan budget tanpa batas
  if (budget && budget > 0) {
    filtered = filterMotors(motors, { budget: null, tipe, cc, tinggi });
    if (filtered.length >= MIN_RESULTS) {
      relaxed.push('Budget dilonggarkan');
      return { motors: filtered, relaxed, appliedTipe: tipe };
    }
  }

  // Step 8: Hapus semua filter KECUALI tipe (tipe tetap strict!)
  filtered = motors.filter(m => {
    if (tipe && tipe !== 'null' && m.category !== tipe) return false;
    return true;
  });

  if (filtered.length >= MIN_RESULTS) {
    relaxed.push('Filter lain dilonggarkan');
    return { motors: filtered, relaxed, appliedTipe: tipe };
  }

  // Fallback: tampilkan apa adanya (minimal harus ada motor)
  relaxed.push('Hasil default');
  return { motors: filtered.length > 0 ? filtered : motors.slice(0, 1), relaxed, appliedTipe: tipe };
}

/* ============================================================
   BUILD REASONS
   ============================================================ */
function buildReasons(motor, answers, allMotors) {
  const reasons = [];
  const { prioritas, usage, tipe } = answers;

  // Stats berdasarkan motor yang sudah difilter
  const avgHarga = allMotors.reduce((s, m) => s + m.harga, 0) / allMotors.length;
  const maxBbm = Math.max(...allMotors.map(m => m.bbm));
  const maxPower = Math.max(...allMotors.map(m => m.power));
  const minHarga = Math.min(...allMotors.map(m => m.harga));

  // Harga
  if (motor.harga <= minHarga * 1.1) {
    reasons.push('Harga termurah di kelasnya');
  } else if (motor.harga < avgHarga * 0.75) {
    reasons.push('Harga sangat terjangkau');
  } else if (motor.harga < avgHarga) {
    reasons.push('Harga kompetitif');
  }

  // BBM
  if (motor.bbm >= maxBbm * 0.95) {
    reasons.push('Paling irit ' + motor.bbm + ' km/L');
  } else if (motor.bbm >= maxBbm * 0.85) {
    reasons.push('Sangat irit');
  } else if (motor.bbm >= maxBbm * 0.70) {
    reasons.push('Efisiensi BBM baik');
  }

  // Performa
  if (motor.power >= maxPower * 0.90) {
    reasons.push('Performa tertinggi ' + motor.power + ' hp');
  } else if (motor.power >= maxPower * 0.75) {
    reasons.push('Performa tinggi');
  } else if (motor.power >= maxPower * 0.60) {
    reasons.push('Performa mumpuni');
  }

  // Berdasarkan prioritas
  if (prioritas === 'harga' && motor.harga <= avgHarga) {
    reasons.push('Ideal untuk budget');
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

  // Berdasarkan usage
  if (usage === 'harian' && motor.bbm >= maxBbm * 0.70) {
    reasons.push('Ideal untuk harian');
  }
  if (usage === 'touring' && motor.fuel_l >= 10) {
    reasons.push('Jangkauan touring luas');
  }
  if (usage === 'sport' && motor.power >= maxPower * 0.60) {
    reasons.push('Layak untuk spirited riding');
  }

  // Berdasarkan tipe yang dipilih
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

/* ============================================================
   MAIN SAW RECOMMENDATION FUNCTION
   ============================================================ */
function runSAW(answers) {
  let motors = getMOTORS();
  if (!motors || motors.length === 0) {
    if (window.DB && typeof window.DB.getAllMotors === 'function') {
      motors = window.DB.getAllMotors();
    }
  }

  if (!motors || motors.length === 0) {
    console.error('SAW Error: Data motor tidak tersedia');
    return {
      results: [],
      weights: { C1: 0.25, C2: 0.25, C3: 0.25, C4: 0.25 },
      relaxed: ['Data motor tidak tersedia'],
      topReasons: [],
      closeRace: false,
      confidence: 0
    };
  }

  // Parse answers
  const budget = (!answers.budget || answers.budget === 'null') ? null : Number(answers.budget);
  const usage = answers.usage || 'harian';
  const tipe = (!answers.tipe || answers.tipe === 'null') ? null : answers.tipe;
  const prioritas = answers.prioritas || 'seimbang';
  const cc = (!answers.cc || answers.cc === 'null') ? null : answers.cc;
  const tinggi = (!answers.tinggi || answers.tinggi === 'null') ? null : Number(answers.tinggi);

  // Progressive filter (tipe selalu strict)
  const { motors: filteredMotors, relaxed, appliedTipe } = progressiveFilter(motors, { budget, tipe, cc, tinggi });

  if (filteredMotors.length === 0) {
    return {
      results: [],
      weights: { C1: 0.25, C2: 0.25, C3: 0.25, C4: 0.25 },
      relaxed,
      topReasons: [],
      closeRace: false,
      confidence: 0
    };
  }

  // Initialize SAW normalizer
  const normalizer = new SAWNormalizer(filteredMotors, appliedTipe);

  // Calculate weights
  const weights = calculateWeights(answers);

  // Calculate scores
  const results = filteredMotors.map(motor => {
    const normalized = normalizer.normalizeMotor(motor);
    const sawScore = calculateSAWScore(normalized, weights);
    const ergoScore = ergonomicScore(motor, tinggi);

    // Combined score: SAW (80%) + Ergonomic (20%)
    const finalScore = sawScore * 0.80 + ergoScore * 0.20;

    return {
      ...motor,
      sawScore: sawScore,
      ergoScore: ergoScore,
      Vi: round4(finalScore),
      normalized: normalized
    };
  });

  // Sort by final score
  results.sort((a, b) => {
    if (b.Vi !== a.Vi) return b.Vi - a.Vi;
    const pwA = a.power / a.weight;
    const pwB = b.power / b.weight;
    if (pwB !== pwA) return pwB - pwA;
    return b.year - a.year;
  });

  // Assign ranks
  results.forEach((r, i) => { r.rank = i + 1; });

  // Confidence calculation
  let confidence = 0.5;
  let closeRace = false;

  if (results.length >= 2) {
    const topScore = results[0].Vi;
    const secondScore = results[1].Vi;
    const gap = topScore > 0 ? (topScore - secondScore) / topScore : 0;

    closeRace = gap < 0.05;
    confidence = Math.min(1, Math.max(0.3, gap * 10 + 0.4));
  }

  // Build reasons
  const topReasons = results.length > 0
    ? buildReasons(results[0], answers, filteredMotors)
    : [];

  // Output weights
  const outputWeights = {
    C1: weights.harga || 0.25,
    C2: weights.bbm || 0.25,
    C3: weights.power || 0.25,
    C4: weights.nyaman || 0.25
  };

  return {
    results,
    weights: outputWeights,
    relaxed,
    topReasons,
    closeRace,
    confidence: round2(confidence),
    method: 'SAW-v4',
    appliedTipe: appliedTipe
  };
}

// Alias for compatibility
const runMLRecommendation = runSAW;

/* ============================================================
   CRITERIA LABEL
   ============================================================ */
const CRITERIA_LABEL = {
  C1: 'Harga',
  C2: 'Efisiensi BBM',
  C3: 'Performa',
  C4: 'Kenyamanan'
};
