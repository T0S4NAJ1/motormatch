/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                     SAW NORMALIZER - MOTORMATCH                             ║
 * ║                                                                             ║
 * ║  Modul: Normalisasi Min-Max untuk Simple Additive Weighting (SAW)         ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 1.0.0                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *                                    TEORI
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  NORMALISASI MIN-MAX
 *
 *  Metode normalisasi ini menskalakan nilai ke rentang [0, 1] sehingga:
 *  - Nilai maksimum dalam kriteria → 1
 *  - Nilai minimum dalam kriteria → 0
 *  - Nilai di tengah → proporsional
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │  JENIS KRITERIA                                                        │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │  BENEFIT (semakin besar semakin baik):                                  │
 *  │                                                                         │
 *  │         X_ij - X_j^min                                                 │
 *  │  R_ij = ─────────────────────                                          │
 *  │         X_j^max - X_j^min                                              │
 *  │                                                                         │
 *  │  Contoh: Power tertinggi (217 HP) → 1.0                               │
 *  │          Power terendah (6.57 HP) → 0.0                                │
 *  │                                                                         │
 *  ├─────────────────────────────────────────────────────────────────────────┤
 *  │  COST (semakin kecil semakin baik):                                    │
 *  │                                                                         │
 *  │         X_j^max - X_ij                                                 │
 *  │  R_ij = ─────────────────────                                          │
 *  │         X_j^max - X_j^min                                              │
 *  │                                                                         │
 *  │  Contoh: Harga termurah (Rp 17.5jt) → 1.0                             │
 *  │          Harga termahal (Rp 700jt) → 0.0                               │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * ════════════════════════════════════════════════════════════════════════════════
 *                                 VARIABEL
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  R_ij    = Nilai normalisasi alternatif ke-i, kriteria ke-j
 *  X_ij    = Nilai asli alternatif ke-i, kriteria ke-j
 *  X_j^min = Nilai minimum kriteria ke-j
 *  X_j^max = Nilai maksimum kriteria ke-j
 *
 * ════════════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                           KONSTANTA KRITERIA                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 *  Mendefinisikan jenis kriteria untuk setiap fitur motor.
 *  BENEFIT = semakin besar nilainya, semakin baik
 *  COST    = semakin kecil nilainya, semakin baik
 */
const CRITERIA_TYPES = Object.freeze({
  // ── Kriteria Finansial ────────────────────────────────────────────────────
  harga:   'COST',    // Harga lebih murah = lebih baik

  // ── Kriteria Efisiensi ────────────────────────────────────────────────────
  bbm:     'BENEFIT', // Km/L lebih tinggi = lebih irit
  fuel_l:  'BENEFIT', // Tangki lebih besar = jangkauan lebih jauh

  // ── Kriteria Performa ─────────────────────────────────────────────────────
  power:   'BENEFIT', // Tenaga lebih besar = lebih bertenaga
  torque:  'BENEFIT', // Torsi lebih besar = akselerasi lebih baik
  cc:      'BENEFIT', // CC lebih besar = potensi performa lebih tinggi

  // ── Kriteria Fisik ────────────────────────────────────────────────────────
  weight:  'COST',    // Berat lebih ringan = lebih agile
  seat_h:  'BENEFIT', // Tinggi jok lebih tinggi = ground clearance lebih baik

  // ── Kriteria Subjektif ────────────────────────────────────────────────────
  nyaman:  'BENEFIT', // Skor kenyamanan lebih tinggi = lebih nyaman
});

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         KELAS SAWNormalizer                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 *  Kelas untuk menghitung statistik dan melakukan normalisasi Min-Max
 *  pada sekumpulan data motor.
 */
class SAWNormalizer {
  /**
   * Konstruktor
   *
   * @param {Array} motors - Array of motor objects
   *
   * Contoh motor object:
   * {
   *   id: 1,
   *   model: 'Honda BeAT Street',
   *   harga: 18750000,
   *   bbm: 59.5,
   *   power: 6.57,
   *   ...
   * }
   */
  constructor(motors) {
    if (!motors || motors.length === 0) {
      throw new Error('SAWNormalizer: Data motor tidak boleh kosong');
    }

    /** @type {Array} Motor yang akan diproses */
    this.motors = motors;

    /** @type {Object} Statistik min/max/range untuk setiap kriteria */
    this.stats = this._calculateStats();

    /** @type {Object} Metadata normalisasi untuk dokumentasi */
    this.metadata = this._buildMetadata();
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _calculateStats
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Menghitung nilai min, max, dan range untuk setiap kriteria
   *  berdasarkan data motor yang diberikan.
   *
   *  @returns {Object} Statistik { min: {}, max: {}, range: {} }
   *
   *  Contoh output:
   *  {
   *    min: { harga: 17500000, bbm: 10.0, power: 6.57, ... },
   *    max: { harga: 700000000, bbm: 61.6, power: 217.6, ... },
   *    range: { harga: 682500000, bbm: 51.6, power: 211.03, ... }
   *  }
   */
  _calculateStats() {
    // Fitur-fitur yang akan dihitung statistiknya
    const features = Object.keys(CRITERIA_TYPES);

    const stats = {
      min: {},
      max: {},
      range: {}
    };

    features.forEach(feature => {
      // Ambil semua nilai, handle NaN dengan fallback 0
      const values = this.motors.map(m => Number(m[feature]) || 0);

      stats.min[feature] = Math.min(...values);
      stats.max[feature] = Math.max(...values);
      stats.range[feature] = stats.max[feature] - stats.min[feature];
    });

    return stats;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: _buildMetadata
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Membangun metadata untuk dokumentasi/normalisasi
   *
   *  @returns {Object} Metadata kriteria
   */
  _buildMetadata() {
    const features = Object.keys(CRITERIA_TYPES);

    return features.reduce((meta, feature) => {
      meta[feature] = {
        type: CRITERIA_TYPES[feature],
        min: this.stats.min[feature],
        max: this.stats.max[feature],
        range: this.stats.range[feature]
      };
      return meta;
    }, {});
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: normalizeBenefit
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Normalisasi kriteria BENEFIT (semakin besar semakin baik)
   *
   *  Formula:
   *         X_ij - X_j^min
   *  R_ij = ─────────────────────
   *         X_j^max - X_j^min
   *
   *  @param {number} value - Nilai yang akan dinormalisasi
   *  @param {string} feature - Nama fitur/kriteria
   *
   *  @returns {number} Nilai normalisasi [0, 1]
   *
   *  Contoh:
   *  - Motor dengan power 110 HP (di tengah-tengah range)
   *  - Jika min=6.57, max=217.6
   *  - R = (110 - 6.57) / (217.6 - 6.57) = 0.489
   */
  normalizeBenefit(value, feature) {
    const s = this.stats;

    // Handle kasus range = 0 (semua nilai sama)
    if (s.range[feature] === 0) {
      return 1; // Jika tidak ada variasi, anggap nilai tipikal
    }

    return (value - s.min[feature]) / s.range[feature];
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: normalizeCost
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Normalisasi kriteria COST (semakin kecil semakin baik)
   *
   *  Formula:
   *         X_j^max - X_ij
   *  R_ij = ─────────────────────
   *         X_j^max - X_j^min
   *
   *  @param {number} value - Nilai yang akan dinormalisasi
   *  @param {string} feature - Nama fitur/kriteria
   *
   *  @returns {number} Nilai normalisasi [0, 1]
   *
   *  Contoh:
   *  - Motor dengan harga Rp 50jt
   *  - Jika min=17.5jt, max=700jt
   *  - R = (700jt - 50jt) / (700jt - 17.5jt) = 0.953
   *    (Harga murah → nilai tinggi, mendekati 1)
   */
  normalizeCost(value, feature) {
    const s = this.stats;

    // Handle kasus range = 0 (semua nilai sama)
    if (s.range[feature] === 0) {
      return 1; // Jika tidak ada variasi, anggap nilai tipikal
    }

    return (s.max[feature] - value) / s.range[feature];
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: normalizeMotor
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Normalisasi semua kriteria untuk satu motor
   *
   *  @param {Object} motor - Object motor
   *
   *  @returns {Object} Nilai normalisasi semua kriteria
   *
   *  Contoh output:
   *  {
   *    harga:   0.953,   // Cost: harga murah
   *    bbm:     0.520,   // Benefit: efisiensi sedang
   *    power:   0.489,   // Benefit: tenaga sedang
   *    torque:  0.451,   // Benefit: torsi sedang
   *    weight:  0.895,   // Cost: ringan
   *    cc:      0.149,   // Benefit: CC kecil
   *    seat_h:  0.643,   // Benefit: tinggi jok sedang
   *    fuel_l:  0.156,   // Benefit: tangki kecil
   *    nyaman:  0.778,   // Benefit: cukup nyaman
   *  }
   */
  normalizeMotor(motor) {
    const normalized = {};

    // Proses setiap kriteria
    Object.keys(CRITERIA_TYPES).forEach(feature => {
      const value = Number(motor[feature]) || 0;
      const type = CRITERIA_TYPES[feature];

      if (type === 'BENEFIT') {
        normalized[feature] = this.normalizeBenefit(value, feature);
      } else {
        normalized[feature] = this.normalizeCost(value, feature);
      }
    });

    return normalized;
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: normalizeAllMotors
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Normalisasi semua motor
   *
   *  @param {Array} motors - Array motor (opsional, default: semua motor)
   *
   *  @returns {Array} Array motor dengan nilai normalisasi
   */
  normalizeAllMotors(motors = this.motors) {
    return motors.map(motor => ({
      ...motor,
      _normalized: this.normalizeMotor(motor)
    }));
  }

  /**
   * ══════════════════════════════════════════════════════════════════════════════
   *                         METHOD: getMatrixForDisplay
   * ══════════════════════════════════════════════════════════════════════════════
   *
   *  Mendapatkan matriks keputusan untuk keperluan dokumentasi/display
   *
   *  @returns {Object} Matriks keputusan
   */
  getMatrixForDisplay() {
    const features = Object.keys(CRITERIA_TYPES);

    // Matriks keputusan (X)
    const decisionMatrix = this.motors.map(m => {
      const row = { id: m.id, model: m.model };
      features.forEach(f => {
        row[f] = Number(m[f]) || 0;
      });
      return row;
    });

    // Matriks normalisasi (R)
    const normalizedMatrix = this.motors.map(m => {
      const norm = this.normalizeMotor(m);
      const row = { id: m.id, model: m.model };
      features.forEach(f => {
        row[f] = Math.round(norm[f] * 10000) / 10000; // 4 desimal
      });
      return row;
    });

    return {
      criteria: features,
      criteriaTypes: CRITERIA_TYPES,
      stats: this.stats,
      decisionMatrix,
      normalizedMatrix,
      motorCount: this.motors.length
    };
  }
}

// Export untuk module system
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SAWNormalizer, CRITERIA_TYPES };
}

// Export untuk browser global
if (typeof window !== 'undefined') {
  window.SAWNormalizer = SAWNormalizer;
  window.CRITERIA_TYPES = CRITERIA_TYPES;
}
