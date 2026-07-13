# MotorMatch SAW System - Design Specification

**Tanggal:** 2026-07-12
**Status:** Approved
**Versi:** 1.0

---

## 1. Overview

Proyek ini adalah implementasi metode **Simple Additive Weighting (SAW)** untuk sistem rekomendasi motor di MotorMatch (TOSAN). Sistem ini membantu pengguna memilih motor yang sesuai berdasarkan preferensi mereka melalui wizard 6 langkah.

---

## 2. Komponen & Deliverables

### A. Refactor SAW Frontend
- **File:** `public/assets/scripts/saw/`
- Bersihkan kode dengan comments akademis
- Naming yang jelas (sesuai notasi matematis)
- Dokumentasi inline untuk setiap langkah SAW

### B. Backend API SAW
- **File:** `backend/services/saw-service.js`
- **Endpoint:** `POST /api/recommend`
- Clean separation - semua logika SAW di backend

### C. Dokumentasi Akademik
- **File:** `docs/saw/`
- Flowchart sistem (Mermaid format)
- Perhitungan manual dengan contoh

---

## 3. Arsitektur Sistem

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  Backend API │────▶│  SAW Calculator │
│  (Wizard)   │     │  /api/recommend    │  (Node.js)       │
└─────────────┘     └──────────────┘     └─────────────────┘
```

---

## 4. Kriteria SAW

| Kode | Kriteria | Tipe | Deskripsi |
|------|----------|------|-----------|
| C1 | harga | Cost | Harga motor (semakin murah semakin baik) |
| C2 | bbm | Benefit | Efisiensi bahan bakar km/L |
| C3 | power | Benefit | Tenaga mesin (HP) |
| C4 | torque | Benefit | Torsi mesin (Nm) |
| C5 | weight | Cost | Berat motor (semakin ringan semakin baik) |
| C6 | cc | Benefit | Kapasitas mesin |
| C7 | seat_h | Benefit | Tinggi jok |
| C8 | nyaman | Benefit | Skor kenyamanan (1-10) |

---

## 5. Bobot Dinamis

Bobot dihitung berdasarkan 6 jawaban user:

### 5.1 Prioritas User
| Prioritas | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 |
|------------|----|----|----|----|----|----|----|----|
| harga | 0.45 | 0.25 | 0.05 | - | - | - | - | 0.15 |
| bbm | 0.25 | 0.45 | 0.05 | - | - | - | - | 0.15 |
| performa | 0.05 | 0.05 | 0.45 | 0.20 | - | 0.10 | - | 0.05 |
| nyaman | 0.05 | 0.05 | 0.05 | - | - | - | 0.20 | 0.45 |

### 5.2 Usage Adjustment
| Usage | Penyesuaian |
|-------|-------------|
| harian | bbm +0.10, weight +0.10 |
| touring | fuel_l +0.20, nyaman +0.20 |
| sport | power +0.20, cc +0.15 |
| keluarga | nyaman +0.20, seat_h +0.15 |

### 5.3 Budget Adjustment
| Budget | harga | bbm | power | nyaman |
|--------|-------|-----|-------|--------|
| < 20jt | 0.30 | 0.25 | 0.10 | 0.15 |
| 20-50jt | 0.15 | 0.15 | 0.30 | 0.15 |
| 50-150jt | 0.05 | 0.10 | 0.40 | 0.20 |
| > 150jt | 0.02 | 0.05 | 0.50 | 0.20 |

### 5.4 Tipe Motor Adjustment
| Tipe | Prioritas |
|------|-----------|
| Matic | bbm +0.20, weight +0.15 |
| Sport | power +0.30, cc +0.15 |
| Naked | power +0.15, nyaman +0.15 |

---

## 6. Formula SAW

### 6.1 Normalisasi Min-Max

**Benefit Criteria (semakin besar semakin baik):**
```
R_ij = (X_ij - X_j^min) / (X_j^max - X_j^min)
```

**Cost Criteria (semakin kecil semakin baik):**
```
R_ij = (X_j^max - X_ij) / (X_j^max - X_j^min)
```

### 6.2 Perhitungan Skor

```
V_i = Σ (W_j × R_ij)
```

Dimana:
- V_i = Skor total alternatif ke-i
- W_j = Bobot kriteria ke-j
- R_ij = Nilai normalisasi kriteria ke-j untuk alternatif ke-i

### 6.3 Combined Score

```
Final_Score = SAW_Score × 0.80 + Ergonomic_Score × 0.20
```

Ergonomic score berdasarkan tinggi badan user vs tinggi jok motor.

---

## 7. API Specification

### POST /api/recommend

**Request:**
```json
{
  "budget": "50000000",
  "usage": "harian",
  "tipe": "Matic",
  "prioritas": "bbm",
  "cc": "sedang",
  "tinggi": "165"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "rank": 1,
      "id": 5,
      "brand": "Honda",
      "model": "Vario 160",
      "category": "Matic",
      "cc": 157,
      "harga": 27000000,
      "Vi": 0.8923,
      "sawScore": 0.85,
      "ergoScore": 0.9,
      "reasons": ["Paling irit", "Harga kompetitif"]
    }
  ],
  "weights": {
    "harga": 0.15,
    "bbm": 0.45,
    "power": 0.10,
    "torque": 0.05,
    "weight": 0.10,
    "cc": 0.05,
    "seat_h": 0.05,
    "nyaman": 0.05
  },
  "calculation": {
    "candidatesCount": 8,
    "filterApplied": {
      "tipe": "Matic",
      "budget": "50000000 (strict)",
      "cc": "sedang"
    },
    "appliedRelaxation": []
  },
  "meta": {
    "method": "SAW",
    "confidence": 0.78,
    "closeRace": false
  }
}
```

---

## 8. Progressive Filtering

Jika hasil < 1, lakukan pelonggaran secara bertahap:

1. Budget +25%
2. Budget +50%
3. Budget +100%
4. Hapus filter CC
5. Toleransi tinggi +15cm
6. Hapus filter budget
7. Tampilkan semua tipe yang dipilih
8. Fallback: tampilkan apapun

**Catatan:** Filter `tipe` (Matic/Sport/Naked) SELALU strict, tidak pernah dilonggarkan.

---

## 9. Error Handling

| HTTP Code | Scenario | Response |
|-----------|----------|----------|
| 200 | Success | Results array |
| 400 | Missing required field | `{ error: "Missing required field: budget" }` |
| 500 | Server error | `{ error: "Internal server error" }` |

---

## 10. Testing Checklist

- [ ] API returns correct results for sample inputs
- [ ] Weights calculation matches manual calculation
- [ ] Progressive filtering works correctly
- [ ] Error handling returns appropriate codes
- [ ] Frontend successfully connects to API

---

## 11. Dependencies

- Node.js (Express.js backend)
- MySQL (data motor)
- Frontend vanilla JS (existing)

---

## 12. Files to Create/Modify

### Backend (New)
- `backend/routes/recommendation.js`
- `backend/services/saw-service.js`
- `backend/services/motor-service.js`
- `backend/utils/saw-normalizer.js`
- `backend/utils/saw-weights.js`

### Frontend (Modified)
- `public/assets/scripts/saw/saw-core.js` (new)
- `public/assets/scripts/saw/saw-normalizer.js` (new)
- `public/assets/scripts/saw/saw-weights.js` (new)
- `public/assets/scripts/saw-calculator.js` (modified)
- `public/assets/scripts/recommendation-wizard.js` (modified)

### Documentation (New)
- `docs/saw/01-alur-sistem.md`
- `docs/saw/02-perhitungan-manual.md`
- `docs/api/recommendation-api.md`
