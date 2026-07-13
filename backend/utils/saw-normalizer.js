/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║              SAW NORMALIZER - BACKEND (Node.js)                        ║
 * ║                                                                             ║
 * ║  Modul: Normalisasi Min-Max untuk Simple Additive Weighting (SAW)       ║
 * ║  Author: MotorMatch TOSAN                                                  ║
 * ║  Version: 1.0.0                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
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
  harga:   'COST',    // Harga lebih murah = lebih baik
  bbm:     'BENEFIT', // Km/L lebih tinggi = lebih irit
  fuel_l:  'BENEFIT', // Tangki lebih besar = jangkauan lebih jauh
  power:   'BENEFIT', // Tenaga lebih besar = lebih bertenaga
  torque:  'BENEFIT', // Torsi lebih besar = akselerasi lebih baik
  cc:      'BENEFIT', // CC lebih besar = potensi performa lebih tinggi
  weight:  'COST',    // Berat lebih ringan = lebih agile
  seat_h:  'BENEFIT', // Tinggi jok lebih tinggi = ground clearance lebih baik
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
   */
  constructor(motors) {
    if (!motors || motors.length === 0) {
      throw new Error('SAWNormalizer: Data motor tidak boleh kosong');
    }

    this.motors = motors;
    this.stats = this._calculateStats();
    this.metadata = this._buildMetadata();
  }

  /**
   * Menghitung nilai min, max, dan range untuk setiap kriteria
   *
   * @returns {Object} Statistik { min: {}, max: {}, range: {} }
   */
  _calculateStats() {
    const features = Object.keys(CRITERIA_TYPES);

    const stats = {
      min: {},
      max: {},
      range: {}
    };

    features.forEach(feature => {
      const values = this.motors.map(m => Number(m[feature]) || 0);

      stats.min[feature] = Math.min(...values);
      stats.max[feature] = Math.max(...values);
      stats.range[feature] = stats.max[feature] - stats.min[feature];
    });

    return stats;
  }

  /**
   * Membangun metadata untuk dokumentasi/normalisasi
   *
   * @returns {Object} Metadata kriteria
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
   * Normalisasi kriteria BENEFIT (semakin besar semakin baik)
   *
   * Formula:
   *         X_ij - X_j^min
   *  R_ij = ─────────────────────
   *         X_j^max - X_j^min
   *
   * @param {number} value - Nilai yang akan dinormalisasi
   * @param {string} feature - Nama fitur/kriteria
   * @returns {number} Nilai normalisasi [0, 1]
   */
  normalizeBenefit(value, feature) {
    const s = this.stats;

    if (s.range[feature] === 0) {
      return 1;
    }

    return (value - s.min[feature]) / s.range[feature];
  }

  /**
   * Normalisasi kriteria COST (semakin kecil semakin baik)
   *
   * Formula:
   *         X_j^max - X_ij
   *  R_ij = ─────────────────────
   *         X_j^max - X_j^min
   *
   * @param {number} value - Nilai yang akan dinormalisasi
   * @param {string} feature - Nama fitur/kriteria
   * @returns {number} Nilai normalisasi [0, 1]
   */
  normalizeCost(value, feature) {
    const s = this.stats;

    if (s.range[feature] === 0) {
      return 1;
    }

    return (s.max[feature] - value) / s.range[feature];
  }

  /**
   * Normalisasi semua kriteria untuk satu motor
   *
   * @param {Object} motor - Object motor
   * @returns {Object} Nilai normalisasi semua kriteria
   */
  normalizeMotor(motor) {
    const normalized = {};

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
   * Normalisasi semua motor
   *
   * @param {Array} motors - Array motor (opsional, default: semua motor)
   * @returns {Array} Array motor dengan nilai normalisasi
   */
  normalizeAllMotors(motors = this.motors) {
    return motors.map(motor => ({
      ...motor,
      _normalized: this.normalizeMotor(motor)
    }));
  }

  /**
   * Mendapatkan matriks keputusan untuk keperluan dokumentasi/display
   *
   * @returns {Object} Matriks keputusan
   */
  getMatrixForDisplay() {
    const features = Object.keys(CRITERIA_TYPES);

    // Matriks keputusan (X)
    const decisionMatrix = this.motors.map(m => {
      const row = { id: m.id, model: `${m.brand} ${m.model}` };
      features.forEach(f => {
        row[f] = Number(m[f]) || 0;
      });
      return row;
    });

    // Matriks normalisasi (R)
    const normalizedMatrix = this.motors.map(m => {
      const norm = this.normalizeMotor(m);
      const row = { id: m.id, model: `${m.brand} ${m.model}` };
      features.forEach(f => {
        row[f] = Math.round(norm[f] * 10000) / 10000;
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

module.exports = { SAWNormalizer, CRITERIA_TYPES };
