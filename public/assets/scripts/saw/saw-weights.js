/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                     SAW WEIGHT CALCULATOR - MOTORMATCH                    ║
 * ║                                                                             ║
 * ║  Modul: Perhitungan Bobot Dinamis untuk Simple Additive Weighting (SAW)   ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 1.0.0                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *                                    TEORI
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  BOBOT KRITERIA (W_j)
 *
 *  Bobot menunjukkan tingkat kepentingan relatif setiap kriteria.
 *  Jumlah seluruh bobot = 1.0 (100%)
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │  SUMBER BOBOT                                                            │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │                                                                         │
 *  │  1. PRIORITAS UTAMA (prioritas user)                                    │
 *  │     - User memilih kriteria paling penting                               │
 *  │     - Kriteria tersebut mendapat bobot tertinggi                        │
 *  │                                                                         │
 *  │  2. USAGE/PENGGUNAAN (gaya hidup user)                                 │
 *  │     - Harian → prioritas irit & ringan                                 │
 *  │     - Touring → prioritas fuel capacity & kenyamanan                    │
 *  │     - Sport → prioritas performa & CC                                  │
 *  │     - Keluarga → prioritas kenyamanan & ergonomi                       │
 *  │                                                                         │
 *  │  3. BUDGET                                                              │
 *  │     - Budget rendah → harga sangat penting                             │
 *  │     - Budget tinggi → performa lebih diutamakan                        │
 *  │                                                                         │
 *  │  4. TIPE MOTOR                                                          │
 *  │     - Matic → irit & ringan                                           │
 *  │     - Sport → performa tinggi                                          │
 *  │     - Naked → seimbang performa & gaya                                 │
 *  │                                                                         │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *                                 KONSTANTA BOBOT
 * ════════════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           BOBOT DEFAULT                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 *  Bobot awal jika user tidak memilih prioritas khusus.
 *  Menggunakan pendekatan "seimbang" dengan semua kriteria mendapat
 *  perhatian yang sama.
 */
const DEFAULT_WEIGHTS = Object.freeze({
  harga:   0.20,  // Harga
  bbm:     0.20,  // Efisiensi BBM
  power:   0.20,  // Tenaga mesin
  torque:  0.10,  // Torsi
  weight:  0.05,  // Berat
  cc:      0.05,  // Kapasitas mesin
  seat_h:  0.05,  // Tinggi jok
  fuel_l:  0.05,  // Kapasitas tangki
  nyaman:  0.10,  // Kenyamanan
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    BOBOT BERDASARKAN PRIORITAS UTAMA                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 *  Bobot yang diterapkan ketika user memilih prioritas tertentu.
 *  Kriteria yang dipilih mendapat bobot lebih tinggi.
 */
const PRIORITY_WEIGHTS = Object.freeze({
  /**
   * Prioritas: HARGA (user sangat mempermasalahkan biaya)
   * → Harga sangat penting, performa bukan prioritas
   */
  harga: {
    harga:   0.45,  // Harga = prioritas utama
    bbm:     0.25,  // BBM tetap penting untuk efisiensi biaya
    power:   0.05,  // Performa kurang penting
    torque:  0.05,
    weight:  0.05,
    cc:      0.00,
    seat_h:  0.00,
    fuel_l:  0.00,
    nyaman:  0.15,  // Kenyamanan moderate
  },

  /**
   * Prioritas: BBM (user ingin motor irit)
   * → Efisiensi BBM adalah yang paling penting
   */
  bbm: {
    harga:   0.25,  // Harga tetap diperhitungkan
    bbm:     0.45,  // BBM = prioritas utama
    power:   0.05,  // Performa kurang penting
    torque:  0.05,
    weight:  0.05,
    cc:      0.00,
    seat_h:  0.00,
    fuel_l:  0.10,  // Tangki lebih besar = lebih hemat
    nyaman:  0.15,
  },

  /**
   * Prioritas: PERFORMA (user ingin motor kencang)
   * → Tenaga dan torsi adalah segalanya
   */
  performa: {
    harga:   0.05,
    bbm:     0.05,  // BBM kurang penting
    power:   0.45,  // Power = prioritas utama
    torque:  0.20,  // Torsi juga penting
    weight:  0.05,
    cc:      0.10,  // CC tinggi = potensi performa
    seat_h:  0.00,
    fuel_l:  0.05,
    nyaman:  0.05,
  },

  /**
   * Prioritas: KENYAMANAN (user mengutamakan kenyamanan)
   * → Ergonomi dan riding comfort utama
   */
  nyaman: {
    harga:   0.05,
    bbm:     0.05,
    power:   0.05,
    torque:  0.00,
    weight:  0.05,
    cc:      0.00,
    seat_h:  0.20,  // Tinggi jok sesuai ergonomi
    fuel_l:  0.00,
    nyaman:  0.45,  // Kenyamanan = prioritas utama
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                      BOBOT BERDASARKAN PENGGUNAAN                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 *  Penyesuaian bobot berdasarkan gaya penggunaan motor.
 */
const USAGE_ADJUSTMENTS = Object.freeze({
  /**
   * Penggunaan: HARIAN / COMMUTING
   * → Prioritas: irit, ringan, praktis untuk mobilitas harian
   */
  harian: {
    bbm:     0.10,   // Tambahan bobot BBM
    weight:  0.10,   // Motor ringan lebih mudah dikendarai
    harga:   0.05,   // Harga penting untuk daily use
    nyaman:  0.05,   // Kenyamanan untuk commuting
    power:   -0.05,  // Kurangi importance performa
    torque:  -0.05,
  },

  /**
   * Penggunaan: TOURING / PERJALANAN JARAK JAUH
   * → Prioritas: fuel capacity, kenyamanan, irit untuk jarak jauh
   */
  touring: {
    fuel_l:  0.20,   // Kapasitas tangki besar = jangkauan jauh
    nyaman:  0.20,   // Kenyamanan untuk riding panjang
    bbm:     0.10,   // Tetap irit untuk touring
    weight:  -0.10,  // Berat kurang masalah untuk touring
    power:   -0.10,  // Performa kurang prioritas
    torque:  -0.10,
  },

  /**
   * Penggunaan: SPORT / PERFORMA
   * → Prioritas: tenaga, akselerasi, CC tinggi
   */
  sport: {
    power:   0.20,   // Power adalah segalanya
    cc:      0.15,   // CC tinggi untuk sport
    torque:  0.10,   // Torsi penting untuk akselerasi
    bbm:     -0.15,  // BBM kurang penting untuk sport
    weight:  -0.10,  // Berat kurang masalah
    harga:   -0.10,  // Harga kurang masalah
  },

  /**
   * Penggunaan: KELUARGA
   * → Prioritas: kenyamanan, ergonomi, praktis
   */
  keluarga: {
    nyaman:  0.20,   // Kenyamanan utama
    seat_h:  0.15,   // Ergonomi penting untuk keluarga
    weight:  0.10,   // Tidak terlalu berat
    fuel_l:  0.05,   // Kapasitas tangki moderate
    power:   -0.15,  // Performa kurang prioritas
    torque:  -0.15,  // Torsi kurang prioritas
    cc:      -0.10,
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                       BOBOT BERDASARKAN BUDGET                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 *  Penyesuaian bobot berdasarkan budget user.
 */
const BUDGET_ADJUSTMENTS = Object.freeze({
  /**
   * Budget: < 20 juta (Entry Level)
   * → Harga sangat penting, performa bukan prioritas
   */
  low: {
    harga:   0.10,   // Harga sangat penting
    bbm:     0.05,   // BBM penting untuk daily savings
    power:   -0.05,
    torque:  -0.05,
    cc:      -0.05,
    weight:  0.05,
    nyaman:  0.05,
  },

  /**
   * Budget: 20 - 50 juta (Middle Range)
   * → Balance antara harga dan performa
   */
  mid: {
    harga:   0.00,
    bbm:     0.00,
    power:   0.10,   // Mulai prioritas performa
    torque:  0.05,
    cc:      0.00,
    weight:  -0.05,
    nyaman:  0.00,
  },

  /**
   * Budget: 50 - 150 juta (Premium)
   * → Performa lebih diutamakan
   */
  high: {
    harga:   -0.10,  // Harga kurang masalah
    bbm:     -0.05,
    power:   0.15,   // Performa utama
    torque:  0.10,
    cc:      0.05,
    weight:  -0.05,
    nyaman:  0.05,
  },

  /**
   * Budget: > 150 juta (Superbike/Big Bike)
   * → Performa adalah segalanya
   */
  premium: {
    harga:   -0.15,  // Harga bukan masalah
    bbm:     -0.10,
    power:   0.20,   // Power max
    torque:  0.15,
    cc:      0.10,
    weight:  -0.05,
    nyaman:  0.05,
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                      BOBOT BERDASARKAN TIPE MOTOR                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
const TYPE_ADJUSTMENTS = Object.freeze({
  /**
   * Tipe: MATIC
   * → Prioritas irit, ringan, praktis
   */
  Matic: {
    bbm:     0.15,   // Irit adalah segalanya
    weight:  0.15,   // Ringan untuk manuver kota
    harga:   0.05,
    power:   -0.15,  // Kurangi importance performa
    cc:      -0.05,
    torque:  -0.05,
    nyaman:  0.05,
  },

  /**
   * Tipe: SPORT
   * → Prioritas performa tinggi
   */
  Sport: {
    power:   0.25,   // Power adalah segalanya
    cc:      0.15,   // CC tinggi
    torque:  0.10,
    harga:   -0.10,  // Harga kurang masalah
    bbm:     -0.10,  // BBM kurang penting
    nyaman:  -0.10,  // Kenyamanan kurang untuk sport
  },

  /**
   * Tipe: NAKED
   * → Seimbang antara performa dan gaya
   */
  Naked: {
    power:   0.15,    // Performa tetap penting
    nyaman:  0.15,   // Kenyamanan posisi tegak
    cc:      0.10,
    bbm:     0.05,
    weight:  0.05,
    harga:   -0.05,
    torque:  -0.05,
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           KONSTANTA LAIN                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/** Kategori budget untuk penyesuaian */
const BUDGET_CATEGORIES = {
  /** Budget < 20 juta */
  low:    budget => !budget || budget <= 20000000,

  /** Budget 20 - 50 juta */
  mid:    budget => budget > 20000000 && budget <= 50000000,

  /** Budget 50 - 150 juta */
  high:   budget => budget > 50000000 && budget <= 150000000,

  /** Budget > 150 juta */
  premium: budget => budget > 150000000,
};

/** Penyesuaian minimum agar bobot tidak negatif */
const MIN_WEIGHT = 0.02;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         KELAS SAWWeightCalculator                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
class SAWWeightCalculator {
  /**
   * Konstruktor
   *
   * @param {Object} answers - Jawaban user dari wizard
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
  constructor(answers = {}) {
    /** @type {Object} Jawaban user */
    this.answers = answers;

    /** @type {Array} Log penyesuaian untuk dokumentasi - INISIALISASI SEBELUM _calculateWeights */
    this.adjustmentLog = [];

    /** @type {Object} Bobot hasil perhitungan */
    this.weights = this._calculateWeights();
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _calculateWeights
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Menghitung bobot berdasarkan semua faktor
   *
   *  @returns {Object} Bobot final
   */
  _calculateWeights() {
    // 1. Mulai dengan bobot default
    let weights = { ...DEFAULT_WEIGHTS };

    // 2. Terapkan prioritas user
    weights = this._applyPriority(weights);

    // 3. Terapkan penyesuaian budget
    weights = this._applyBudgetAdjustment(weights);

    // 4. Terapkan penyesuaian usage
    weights = this._applyUsageAdjustment(weights);

    // 5. Terapkan penyesuaian tipe motor
    weights = this._applyTypeAdjustment(weights);

    // 6. Normalisasi bobot (jumlah = 1)
    weights = this._normalizeWeights(weights);

    return weights;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _applyPriority
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Terapkan bobot berdasarkan prioritas utama user
   *
   *  @param {Object} weights - Bobot saat ini
   *  @returns {Object} Bobot setelah penyesuaian
   */
  _applyPriority(weights) {
    const prioritas = this.answers.prioritas;

    if (!prioritas || prioritas === 'seimbang') {
      this.adjustmentLog.push({ source: 'priority', status: 'none', reason: 'Prioritas seimbang' });
      return weights;
    }

    const priorityWeights = PRIORITY_WEIGHTS[prioritas];
    if (!priorityWeights) {
      this.adjustmentLog.push({ source: 'priority', status: 'skipped', reason: `Prioritas "${prioritas}" tidak dikenal` });
      return weights;
    }

    // Terapkan bobot prioritas
    Object.keys(priorityWeights).forEach(criterion => {
      weights[criterion] = priorityWeights[criterion];
    });

    this.adjustmentLog.push({
      source: 'priority',
      status: 'applied',
      reason: `Prioritas: ${prioritas}`,
      values: { ...priorityWeights }
    });

    return weights;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _applyBudgetAdjustment
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Terapkan penyesuaian bobot berdasarkan budget user
   *
   *  @param {Object} weights - Bobot saat ini
   *  @returns {Object} Bobot setelah penyesuaian
   */
  _applyBudgetAdjustment(weights) {
    const budget = this.answers.budget;

    if (!budget || budget === 'null') {
      this.adjustmentLog.push({ source: 'budget', status: 'none', reason: 'Budget tidak terbatas' });
      return weights;
    }

    const budgetNum = Number(budget);

    // Tentukan kategori budget
    let category = null;
    for (const [cat, checkFn] of Object.entries(BUDGET_CATEGORIES)) {
      if (checkFn(budgetNum)) {
        category = cat;
        break;
      }
    }

    if (!category) {
      this.adjustmentLog.push({ source: 'budget', status: 'skipped', reason: 'Budget tidak valid' });
      return weights;
    }

    const adjustment = BUDGET_ADJUSTMENTS[category];

    // Terapkan penyesuaian budget
    Object.keys(adjustment).forEach(criterion => {
      const delta = adjustment[criterion];
      weights[criterion] = Math.max(MIN_WEIGHT, weights[criterion] + delta);
    });

    this.adjustmentLog.push({
      source: 'budget',
      status: 'applied',
      reason: `Budget: ${category} (${this._formatRupiah(budgetNum)})`,
      values: { ...adjustment }
    });

    return weights;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _applyUsageAdjustment
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Terapkan penyesuaian bobot berdasarkan penggunaan motor
   *
   *  @param {Object} weights - Bobot saat ini
   *  @returns {Object} Bobot setelah penyesuaian
   */
  _applyUsageAdjustment(weights) {
    const usage = this.answers.usage;

    if (!usage) {
      this.adjustmentLog.push({ source: 'usage', status: 'none', reason: 'Usage tidak specified' });
      return weights;
    }

    const adjustment = USAGE_ADJUSTMENTS[usage];
    if (!adjustment) {
      this.adjustmentLog.push({ source: 'usage', status: 'skipped', reason: `Usage "${usage}" tidak dikenal` });
      return weights;
    }

    // Terapkan penyesuaian
    Object.keys(adjustment).forEach(criterion => {
      const delta = adjustment[criterion];
      weights[criterion] = Math.max(MIN_WEIGHT, weights[criterion] + delta);
    });

    this.adjustmentLog.push({
      source: 'usage',
      status: 'applied',
      reason: `Usage: ${usage}`,
      values: { ...adjustment }
    });

    return weights;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _applyTypeAdjustment
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Terapkan penyesuaian bobot berdasarkan tipe motor
   *
   *  @param {Object} weights - Bobot saat ini
   *  @returns {Object} Bobot setelah penyesuaian
   */
  _applyTypeAdjustment(weights) {
    const tipe = this.answers.tipe;

    if (!tipe || tipe === 'null') {
      this.adjustmentLog.push({ source: 'type', status: 'none', reason: 'Semua tipe motor' });
      return weights;
    }

    const adjustment = TYPE_ADJUSTMENTS[tipe];
    if (!adjustment) {
      this.adjustmentLog.push({ source: 'type', status: 'skipped', reason: `Tipe "${tipe}" tidak dikenal` });
      return weights;
    }

    // Terapkan penyesuaian tipe
    Object.keys(adjustment).forEach(criterion => {
      const delta = adjustment[criterion];
      weights[criterion] = Math.max(MIN_WEIGHT, weights[criterion] + delta);
    });

    this.adjustmentLog.push({
      source: 'type',
      status: 'applied',
      reason: `Tipe: ${tipe}`,
      values: { ...adjustment }
    });

    return weights;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _normalizeWeights
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Normalisasi bobot agar jumlahnya = 1.0
   *
   *  @param {Object} weights - Bobot sebelum normalisasi
   *  @returns {Object} Bobot setelah dinormalisasi
   */
  _normalizeWeights(weights) {
    // Hitung total
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (total === 0) {
      // Fallback ke bobot default jika total = 0
      return { ...DEFAULT_WEIGHTS };
    }

    // Normalisasi
    const normalized = {};
    Object.keys(weights).forEach(criterion => {
      normalized[criterion] = weights[criterion] / total;
    });

    return normalized;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _formatRupiah
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Format angka menjadi Rupiah
   *
   *  @param {number} amount - Jumlah uang
   *  @returns {string} Format Rupiah
   */
  _formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: getWeights
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Mendapatkan bobot hasil perhitungan
   *
   *  @returns {Object} Bobot
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: getWeightsForDisplay
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Mendapatkan bobot dalam format untuk display
   *
   *  @returns {Object} Bobot dengan label
   */
  getWeightsForDisplay() {
    const weights = this.getWeights();

    return {
      weights,
      adjustmentLog: this.adjustmentLog,
      total: Object.values(weights).reduce((a, b) => a + b, 0),
      criteria: Object.keys(weights).map(key => ({
        code: key,
        weight: weights[key],
        percentage: Math.round(weights[key] * 100),
      })).sort((a, b) => b.weight - a.weight)
    };
  }
}

// Export untuk module system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SAWWeightCalculator,
    DEFAULT_WEIGHTS,
    PRIORITY_WEIGHTS,
    USAGE_ADJUSTMENTS,
    BUDGET_ADJUSTMENTS,
    TYPE_ADJUSTMENTS,
  };
}

// Export untuk browser global
if (typeof window !== 'undefined') {
  window.SAWWeightCalculator = SAWWeightCalculator;
  window.DEFAULT_WEIGHTS = DEFAULT_WEIGHTS;
  window.PRIORITY_WEIGHTS = PRIORITY_WEIGHTS;
  window.USAGE_ADJUSTMENTS = USAGE_ADJUSTMENTS;
  window.BUDGET_ADJUSTMENTS = BUDGET_ADJUSTMENTS;
  window.TYPE_ADJUSTMENTS = TYPE_ADJUSTMENTS;
}
