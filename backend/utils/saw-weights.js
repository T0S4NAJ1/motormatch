/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              SAW WEIGHT CALCULATOR - BACKEND (Node.js)                 ║
 * ║                                                                             ║
 * ║  Modul: Perhitungan Bobot Dinamis untuk Simple Additive Weighting (SAW)   ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 1.0.0                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           BOBOT DEFAULT                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
const DEFAULT_WEIGHTS = Object.freeze({
  harga:   0.20,
  bbm:     0.20,
  power:   0.20,
  torque:  0.10,
  weight:  0.05,
  cc:      0.05,
  seat_h:  0.05,
  fuel_l:  0.05,
  nyaman:  0.10,
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    BOBOT BERDASARKAN PRIORITAS UTAMA                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
const PRIORITY_WEIGHTS = Object.freeze({
  harga: {
    harga:   0.45, bbm: 0.25, power: 0.05, torque: 0.05,
    weight:  0.05, cc: 0.00, seat_h: 0.00, fuel_l: 0.00, nyaman: 0.15,
  },
  bbm: {
    harga:   0.25, bbm: 0.45, power: 0.05, torque: 0.05,
    weight:  0.05, cc: 0.00, seat_h: 0.00, fuel_l: 0.10, nyaman: 0.15,
  },
  performa: {
    harga:   0.05, bbm: 0.05, power: 0.45, torque: 0.20,
    weight:  0.05, cc: 0.10, seat_h: 0.00, fuel_l: 0.05, nyaman: 0.05,
  },
  nyaman: {
    harga:   0.05, bbm: 0.05, power: 0.05, torque: 0.00,
    weight:  0.05, cc: 0.00, seat_h: 0.20, fuel_l: 0.00, nyaman: 0.45,
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                      BOBOT BERDASARKAN PENGGUNAAN                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
const USAGE_ADJUSTMENTS = Object.freeze({
  harian: {
    bbm: 0.10, weight: 0.10, harga: 0.05, nyaman: 0.05,
    power: -0.05, torque: -0.05,
  },
  touring: {
    fuel_l:  0.20, nyaman: 0.20, bbm: 0.10,
    weight: -0.10, power: -0.10, torque: -0.10,
  },
  sport: {
    power: 0.20, cc: 0.15, torque: 0.10,
    bbm: -0.15, weight: -0.10, harga: -0.10,
  },
  keluarga: {
    nyaman:  0.20, seat_h: 0.15, weight: 0.10, fuel_l: 0.05,
    power: -0.15, torque: -0.15, cc: -0.10,
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                       BOBOT BERDASARKAN BUDGET                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
const BUDGET_ADJUSTMENTS = Object.freeze({
  low: {
    harga: 0.10, bbm: 0.05, weight: 0.05, nyaman: 0.05,
    power: -0.05, torque: -0.05, cc: -0.05,
  },
  mid: {
    power: 0.10, torque: 0.05,
    weight: -0.05,
  },
  high: {
    harga: -0.10, bbm: -0.05,
    power: 0.15, torque: 0.10, cc: 0.05, nyaman: 0.05,
    weight: -0.05,
  },
  premium: {
    harga: -0.15, bbm: -0.10,
    power: 0.20, torque: 0.15, cc: 0.10, nyaman: 0.05,
    weight: -0.05,
  },
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                      BOBOT BERDASARKAN TIPE MOTOR                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
const TYPE_ADJUSTMENTS = Object.freeze({
  Matic: {
    bbm: 0.15, weight: 0.15, harga: 0.05, nyaman: 0.05,
    power: -0.15, cc: -0.05, torque: -0.05,
  },
  Sport: {
    power: 0.25, cc: 0.15, torque: 0.10,
    harga: -0.10, bbm: -0.10, nyaman: -0.10,
  },
  Naked: {
    power: 0.15, nyaman: 0.15, cc: 0.10, bbm: 0.05, weight: 0.05,
    harga: -0.05, torque: -0.05,
  },
});

/** Kategori budget */
const BUDGET_CATEGORIES = {
  low:    budget => !budget || budget <= 20000000,
  mid:    budget => budget > 20000000 && budget <= 50000000,
  high:   budget => budget > 50000000 && budget <= 150000000,
  premium: budget => budget > 150000000,
};

/** Penyesuaian minimum */
const MIN_WEIGHT = 0.02;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         KELAS SAWWeightCalculator                          ║
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
    this.answers = answers;
    this.adjustmentLog = [];  // Initialize BEFORE _calculateWeights()
    this.weights = this._calculateWeights();
  }

  /**
   * Menghitung bobot berdasarkan semua faktor
   *
   * @returns {Object} Bobot final
   */
  _calculateWeights() {
    let weights = { ...DEFAULT_WEIGHTS };

    weights = this._applyPriority(weights);
    weights = this._applyBudgetAdjustment(weights);
    weights = this._applyUsageAdjustment(weights);
    weights = this._applyTypeAdjustment(weights);
    weights = this._normalizeWeights(weights);

    return weights;
  }

  /**
   * Terapkan bobot berdasarkan prioritas utama user
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
   * Terapkan penyesuaian bobot berdasarkan budget
   */
  _applyBudgetAdjustment(weights) {
    const budget = this.answers.budget;

    if (!budget || budget === 'null') {
      this.adjustmentLog.push({ source: 'budget', status: 'none', reason: 'Budget tidak terbatas' });
      return weights;
    }

    const budgetNum = Number(budget);

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
   * Terapkan penyesuaian bobot berdasarkan penggunaan
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
   * Terapkan penyesuaian bobot berdasarkan tipe motor
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
   * Normalisasi bobot agar jumlahnya = 1.0
   */
  _normalizeWeights(weights) {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (total === 0) {
      return { ...DEFAULT_WEIGHTS };
    }

    const normalized = {};
    Object.keys(weights).forEach(criterion => {
      normalized[criterion] = weights[criterion] / total;
    });

    return normalized;
  }

  /**
   * Format angka ke Rupiah
   */
  _formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Mendapatkan bobot hasil perhitungan
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * Mendapatkan bobot dalam format untuk display
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

module.exports = {
  SAWWeightCalculator,
  DEFAULT_WEIGHTS,
  PRIORITY_WEIGHTS,
  USAGE_ADJUSTMENTS,
  BUDGET_ADJUSTMENTS,
  TYPE_ADJUSTMENTS,
};
