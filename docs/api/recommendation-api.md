# Dokumentasi API - MotorMatch SAW

**Versi:** 1.0.0
**Author:** MotorMatch TOSAN
**Tanggal:** 2026-07-12

---

## Endpoint: `/api/recommend`

### Deskripsi
Endpoint utama untuk mendapatkan rekomendasi motor menggunakan metode SAW (Simple Additive Weighting).

### Metode
```
POST /api/recommend
```

### Headers
```
Content-Type: application/json
```

### Request Body

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

#### Parameter Request

| Parameter | Tipe | Wajib | Deskripsi | Nilai |
|-----------|------|-------|-----------|-------|
| `budget` | string | Ya | Budget maksimal (Rupiah) | `"20000000"`, `"50000000"`, `"150000000"`, `"null"` |
| `usage` | string | Ya | Penggunaan motor | `"harian"`, `"touring"`, `"sport"`, `"keluarga"` |
| `tipe` | string | Ya | Tipe motor | `"Matic"`, `"Sport"`, `"Naked"`, `"null"` |
| `prioritas` | string | Ya | Prioritas utama | `"harga"`, `"bbm"`, `"performa"`, `"nyaman"` |
| `cc` | string | Ya | Kapasitas mesin | `"kecil"`, `"sedang"`, `"besar"`, `"super"` |
| `tinggi` | string | Ya | Tinggi badan user (cm) | `"150"`, `"160"`, `"170"`, `"180"` |

### Response Success (200 OK)

```json
{
  "success": true,
  "results": [
    {
      "rank": 1,
      "id": 25,
      "brand": "Yamaha",
      "model": "NMax 155",
      "year": 2022,
      "category": "Matic",
      "cc": 155,
      "harga": 32500000,
      "hargaFormatted": "Rp 32.500.000",
      "bbm": 44.8,
      "power": 12.1,
      "torque": 14.0,
      "nyaman": 9,
      "img": "assets/images/yamaha_nmax_155.jpg",
      "Vi": 0.8234,
      "sawScore": 0.7891,
      "ergoScore": 0.9,
      "reasons": [
        "Paling irit 44.8 km/L",
        "Kenyamanan tinggi",
        "Ideal untuk penggunaan harian"
      ]
    }
  ],
  "weights": {
    "harga": 0.18,
    "bbm": 0.35,
    "power": 0.12,
    "torque": 0.08,
    "weight": 0.08,
    "cc": 0.05,
    "seat_h": 0.04,
    "fuel_l": 0.05,
    "nyaman": 0.05
  },
  "calculation": {
    "candidatesCount": 8,
    "filterApplied": {
      "tipe": "Matic",
      "budget": "Rp 50.000.000 (strict)",
      "cc": "sedang"
    },
    "appliedRelaxation": []
  },
  "meta": {
    "method": "SAW",
    "confidence": 0.78,
    "closeRace": false,
    "timestamp": "2026-07-12T10:30:00.000Z"
  }
}
```

#### Struktur Response

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `success` | boolean | Status request |
| `results` | array | Array motor yang direkomendasikan, diurutkan berdasarkan skor |
| `results[].rank` | number | Peringkat motor |
| `results[].Vi` | number | Skor akhir SAW + Ergonomis |
| `results[].sawScore` | number | Skor SAW saja |
| `results[].ergoScore` | number | Skor ergonomis saja |
| `results[].reasons` | array | Alasan motor direkomendasikan |
| `weights` | object | Bobot kriteria yang digunakan |
| `calculation` | object | Detail perhitungan |
| `calculation.candidatesCount` | number | Jumlah motor yang menjadi kandidat |
| `calculation.filterApplied` | object | Filter yang diterapkan |
| `calculation.appliedRelaxation` | array | Filter yang dilonggarkan |
| `meta` | object | Metadata tambahan |
| `meta.confidence` | number | Tingkat kepercayaan (0-1) |
| `meta.closeRace` | boolean | Apakah ada pesaing yang dekat |

### Response Error

#### 400 Bad Request
```json
{
  "error": true,
  "message": "Missing required field(s): budget, usage"
}
```

#### 405 Method Not Allowed
```json
{
  "error": true,
  "message": "Method tidak diizinkan"
}
```

#### 500 Internal Server Error
```json
{
  "error": true,
  "message": "Gagal menghitung rekomendasi"
}
```

---

## Endpoint: `/api/recommend/debug`

### Deskripsi
Endpoint untuk development/debugging. Sama dengan `/api/recommend` tetapi dengan tambahan informasi debug.

### Metode
```
POST /api/recommend/debug
```

### Response
```json
{
  "success": true,
  "results": [...],
  "weights": {...},
  "calculation": {
    "candidatesCount": 8,
    "matrix": {
      "criteria": ["harga", "bbm", "power", ...],
      "criteriaTypes": {...},
      "stats": {
        "min": {...},
        "max": {...},
        "range": {...}
      },
      "decisionMatrix": [...],
      "normalizedMatrix": [...]
    },
    "filterApplied": {...},
    "appliedRelaxation": []
  },
  "meta": {...},
  "_debug": {
    "motorCount": 42,
    "serverTime": "2026-07-12T10:30:00.000Z"
  }
}
```

---

## Contoh Penggunaan

### JavaScript (Frontend)

```javascript
// Contoh penggunaan dengan fetch
async function getRecommendation(answers) {
  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answers)
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const result = await response.json();
    console.log('Top recommendation:', result.results[0]);
    return result;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Contoh jawaban
const answers = {
  budget: "50000000",
  usage: "harian",
  tipe: "Matic",
  prioritas: "bbm",
  cc: "sedang",
  tinggi: "165"
};

getRecommendation(answers);
```

### cURL

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "budget": "50000000",
    "usage": "harian",
    "tipe": "Matic",
    "prioritas": "bbm",
    "cc": "sedang",
    "tinggi": "165"
  }'
```

### Postman

1. Buat request baru dengan method `POST`
2. URL: `http://localhost:3000/api/recommend`
3. Tab Body → raw → JSON
4. Masukkan payload sesuai format

---

## Endpoint Lainnya

### `/api/questions`
Mendapatkan daftar pertanyaan wizard.

### `/api/motors`
Mendapatkan semua data motor.

### `/api/filter`
Menyaring motor berdasarkan kriteria.

### `/api/history`
Riwayat rekomendasi (requires auth).

### `/api/history/save`
Menyimpan hasil rekomendasi (requires auth).
