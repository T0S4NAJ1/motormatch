# Perhitungan Manual SAW - MotorMatch

**Versi:** 1.0.0
**Author:** MotorMatch TOSAN
**Tanggal:** 2026-07-12

---

## Daftar Isi
1. [Teori Dasar SAW](#1-teori-dasar-saw)
2. [Contoh Perhitungan Lengkap](#2-contoh-perhitungan-lengkap)
3. [Matriks Keputusan](#3-matriks-keputusan)
4. [Normalisasi Min-Max](#4-normalisasi-min-max)
5. [Perhitungan Bobot](#5-perhitungan-bobot)
6. [Perhitungan Skor](#6-perhitungan-skor)
7. [Perangkingan](#7-perangkingan)

---

## 1. Teori Dasar SAW

### 1.1 Apa itu SAW?

**Simple Additive Weighting (SAW)** adalah metode Sistem Pendukung Keputusan (SPK) yang menghitung bobot untuk setiap kriteria dan menjumlahkan nilai normalisasi berbobot untuk mendapatkan skor total setiap alternatif.

### 1.2 Formula

#### Normalisasi Min-Max

**Kriteria BENEFIT** (semakin besar semakin baik):
```
R_ij = (X_ij - X_j^min) / (X_j^max - X_j^min)
```

**Kriteria COST** (semakin kecil semakin baik):
```
R_ij = (X_j^max - X_ij) / (X_j^max - X_j^min)
```

#### Perhitungan Skor
```
V_i = Σ (W_j × R_ij)
```

**Dimana:**
- `R_ij` = Nilai normalisasi alternatif ke-i, kriteria ke-j
- `X_ij` = Nilai asli alternatif ke-i, kriteria ke-j
- `X_j^min` = Nilai minimum kriteria ke-j
- `X_j^max` = Nilai maksimum kriteria ke-j
- `W_j` = Bobot kriteria ke-j
- `V_i` = Skor total alternatif ke-i

### 1.3 Kriteria yang Digunakan

| Kode | Kriteria | Tipe | Deskripsi |
|------|----------|------|-----------|
| C1 | harga | COST | Harga motor (semakin murah semakin baik) |
| C2 | bbm | BENEFIT | Efisiensi bahan bakar km/L |
| C3 | power | BENEFIT | Tenaga mesin (HP) |
| C4 | torque | BENEFIT | Torsi mesin (Nm) |
| C5 | weight | COST | Berat motor (semakin ringan semakin baik) |
| C6 | cc | BENEFIT | Kapasitas mesin |
| C7 | seat_h | BENEFIT | Tinggi jok |
| C8 | fuel_l | BENEFIT | Kapasitas tangki BBM |
| C9 | nyaman | BENEFIT | Skor kenyamanan |

---

## 2. Contoh Perhitungan Lengkap

### 2.1 Studi Kasus

User dengan kriteria:
- **Budget:** Rp 50.000.000
- **Usage:** Harian
- **Tipe:** Matic
- **Prioritas:** BBM
- **CC:** Sedang (126-250cc)
- **Tinggi Badan:** 165 cm

### 2.2 Motor Kandidat

Setelah difilter, terdapat 3 motor yang memenuhi kriteria:

| ID | Brand | Model | Harga (Rp) | BBM (km/L) | Power (HP) | Torque (Nm) | Weight (kg) | CC | Seat H (mm) | Fuel L (L) | Nyaman |
|----|-------|-------|------------|------------|------------|-------------|------------|-----|-------------|-------------|--------|
| A | Yamaha | Mio i125 | 17.500.000 | 61,6 | 9,4 | 9,6 | 94 | 125 | 750 | 4,2 | 7 |
| B | Yamaha | NMax 155 | 32.500.000 | 44,8 | 12,1 | 14,0 | 127 | 155 | 765 | 7,1 | 9 |
| C | Honda | Vario 160 | 27.000.000 | 46,8 | 15,8 | 14,7 | 133 | 157 | 775 | 5,5 | 9 |

---

## 3. Matriks Keputusan

### 3.1 Matriks Keputusan (X)

```
┌───┬─────────────┬───────┬────────┬────────┬────────┬───────┬────────┬────────┬────────┐
│   │   Kriteria  │  C1   │   C2   │   C3   │   C4   │   C5   │  C6   │   C7   │   C8   │  C9   │
│   │   (Tipe)    │(COST) │(BENF) │(BENF) │(BENF) │ (COST) │(BENF) │(BENF) │(BENF) │(BENF) │
├───┼─────────────┼───────┼────────┼────────┼────────┼───────┼────────┼────────┼────────┤
│ A │ Yamaha Mio  │17.500K│  61,6  │   9,4  │   9,6  │   94   │  125  │  750   │   4,2  │   7   │
│ B │ Yamaha NMax │32.500K│  44,8  │  12,1  │  14,0  │  127   │  155  │  765   │   7,1  │   9   │
│ C │ Honda Vario │27.000K│  46,8  │  15,8  │  14,7  │  133   │  157  │  775   │   5,5  │   9   │
└───┴─────────────┴───────┴────────┴────────┴────────┴───────┴────────┴────────┴────────┴────────┘
```

### 3.2 Nilai Min-Max per Kriteria

| Kriteria | Min | Max | Range |
|----------|-----|-----|-------|
| C1 (harga) | 17.500.000 | 32.500.000 | 15.000.000 |
| C2 (bbm) | 44,8 | 61,6 | 16,8 |
| C3 (power) | 9,4 | 15,8 | 6,4 |
| C4 (torque) | 9,6 | 14,7 | 5,1 |
| C5 (weight) | 94 | 133 | 39 |
| C6 (cc) | 125 | 157 | 32 |
| C7 (seat_h) | 750 | 775 | 25 |
| C8 (fuel_l) | 4,2 | 7,1 | 2,9 |
| C9 (nyaman) | 7 | 9 | 2 |

---

## 4. Normalisasi Min-Max

### 4.1 Rumus Normalisasi

**Benefit (semakin besar semakin baik):**
```
R_ij = (X_ij - X_j^min) / (X_j^max - X_j^min)
```

**Cost (semakin kecil semakin baik):**
```
R_ij = (X_j^max - X_ij) / (X_j^max - X_j^min)
```

### 4.2 Perhitungan Normalisasi

#### Motor A (Yamaha Mio i125)

```
C1 (harga - COST):  R = (32.500.000 - 17.500.000) / 15.000.000 = 1,0000
C2 (bbm - BENEFIT):  R = (61,6 - 44,8) / 16,8 = 1,0000
C3 (power - BENEFIT):R = (9,4 - 9,4) / 6,4 = 0,0000
C4 (torque - BENEFIT):R = (9,6 - 9,6) / 5,1 = 0,0000
C5 (weight - COST):  R = (133 - 94) / 39 = 1,0000
C6 (cc - BENEFIT):    R = (125 - 125) / 32 = 0,0000
C7 (seat_h - BENEFIT):R = (750 - 750) / 25 = 0,0000
C8 (fuel_l - BENEFIT):R = (4,2 - 4,2) / 2,9 = 0,0000
C9 (nyaman - BENEFIT):R = (7 - 7) / 2 = 0,0000
```

#### Motor B (Yamaha NMax 155)

```
C1 (harga - COST):  R = (32.500.000 - 32.500.000) / 15.000.000 = 0,0000
C2 (bbm - BENEFIT):  R = (44,8 - 44,8) / 16,8 = 0,0000
C3 (power - BENEFIT): R = (12,1 - 9,4) / 6,4 = 0,4219
C4 (torque - BENEFIT):R = (14,0 - 9,6) / 5,1 = 0,8627
C5 (weight - COST):  R = (133 - 127) / 39 = 0,1538
C6 (cc - BENEFIT):    R = (155 - 125) / 32 = 0,9375
C7 (seat_h - BENEFIT):R = (765 - 750) / 25 = 0,6000
C8 (fuel_l - BENEFIT):R = (7,1 - 4,2) / 2,9 = 1,0000
C9 (nyaman - BENEFIT):R = (9 - 7) / 2 = 1,0000
```

#### Motor C (Honda Vario 160)

```
C1 (harga - COST):  R = (32.500.000 - 27.000.000) / 15.000.000 = 0,3667
C2 (bbm - BENEFIT):  R = (46,8 - 44,8) / 16,8 = 0,1190
C3 (power - BENEFIT): R = (15,8 - 9,4) / 6,4 = 1,0000
C4 (torque - BENEFIT):R = (14,7 - 9,6) / 5,1 = 1,0000
C5 (weight - COST):  R = (133 - 133) / 39 = 0,0000
C6 (cc - BENEFIT):    R = (157 - 125) / 32 = 1,0000
C7 (seat_h - BENEFIT):R = (775 - 750) / 25 = 1,0000
C8 (fuel_l - BENEFIT):R = (5,5 - 4,2) / 2,9 = 0,4483
C9 (nyaman - BENEFIT):R = (9 - 7) / 2 = 1,0000
```

### 4.3 Matriks Normalisasi (R)

```
┌───┬─────────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│   │   Kriteria  │  C1   │   C2   │   C3   │   C4   │   C5   │   C6   │   C7   │   C8   │   C9   │
├───┼─────────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ A │ Yamaha Mio  │1,0000 │1,0000  │0,0000  │0,0000  │1,0000  │0,0000  │0,0000  │0,0000  │0,0000  │
│ B │ Yamaha NMax │0,0000 │0,0000  │0,4219  │0,8627  │0,1538  │0,9375  │0,6000  │1,0000  │1,0000  │
│ C │ Honda Vario │0,3667 │0,1190  │1,0000  │1,0000  │0,0000  │1,0000  │1,0000  │0,4483  │1,0000  │
└───┴─────────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

---

## 5. Perhitungan Bobot

### 5.1 Bobot Default (Seimbang)

| Kriteria | Bobot Default |
|----------|--------------|
| C1 (harga) | 0,20 |
| C2 (bbm) | 0,20 |
| C3 (power) | 0,20 |
| C4 (torque) | 0,10 |
| C5 (weight) | 0,05 |
| C6 (cc) | 0,05 |
| C7 (seat_h) | 0,05 |
| C8 (fuel_l) | 0,05 |
| C9 (nyaman) | 0,10 |

### 5.2 Penyesuaian Berdasarkan Prioritas (BBM)

Karena prioritas = **BBM**, maka:

| Kriteria | Penyesuaian | Bobot Baru |
|----------|-------------|------------|
| C1 (harga) | - | 0,25 |
| **C2 (bbm)** | **+0,25** | **0,45** |
| C3 (power) | - | 0,05 |
| C4 (torque) | - | 0,05 |
| C5 (weight) | - | 0,05 |
| C6 (cc) | - | 0,00 |
| C7 (seat_h) | - | 0,00 |
| C8 (fuel_l) | +0,10 | 0,15 |
| C9 (nyaman) | - | 0,15 |

### 5.3 Penyesuaian Berdasarkan Budget (Mid: 20-50jt)

| Kriteria | Penyesuaian | Bobot |
|----------|-------------|-------|
| C3 (power) | +0,10 | 0,15 |
| C4 (torque) | +0,05 | 0,10 |

### 5.4 Penyesuaian Berdasarkan Usage (Harian)

| Kriteria | Penyesuaian | Bobot |
|----------|-------------|-------|
| C2 (bbm) | +0,10 | 0,55 |
| C5 (weight) | +0,10 | 0,15 |
| C3 (power) | -0,05 | 0,10 |
| C4 (torque) | -0,05 | 0,05 |

### 5.5 Penyesuaian Berdasarkan Tipe (Matic)

| Kriteria | Penyesuaian | Bobot |
|----------|-------------|-------|
| C2 (bbm) | +0,15 | 0,70 |
| C5 (weight) | +0,15 | 0,30 |
| C3 (power) | -0,15 | 0,00 |

### 5.6 Bobot Final (Setelah Normalisasi)

| Kriteria | Bobot Final | % |
|----------|-------------|---|
| C2 (bbm) | 0,70 | 70% |
| C5 (weight) | 0,30 | 30% |
| C1 (harga) | 0,00 | 0% |
| C3 (power) | 0,00 | 0% |
| C4 (torque) | 0,00 | 0% |
| C6 (cc) | 0,00 | 0% |
| C7 (seat_h) | 0,00 | 0% |
| C8 (fuel_l) | 0,00 | 0% |
| C9 (nyaman) | 0,00 | 0% |
| **Total** | **1,00** | **100%** |

---

## 6. Perhitungan Skor

### 6.1 Rumus

```
V_i = Σ (W_j × R_ij)
```

### 6.2 Perhitungan Skor SAW

#### Motor A (Yamaha Mio i125)
```
V_A = (W1 × R_A1) + (W2 × R_A2) + ... + (W9 × R_A9)
V_A = (0,00 × 1,0000) + (0,70 × 1,0000) + (0,00 × 0,0000) + (0,00 × 0,0000)
    + (0,30 × 1,0000) + (0,00 × 0,0000) + (0,00 × 0,0000) + (0,00 × 0,0000)
    + (0,00 × 0,0000)
V_A = 0,00 + 0,70 + 0,00 + 0,00 + 0,30 + 0,00 + 0,00 + 0,00 + 0,00
V_A = 1,0000
```

#### Motor B (Yamaha NMax 155)
```
V_B = (W1 × R_B1) + (W2 × R_B2) + ... + (W9 × R_B9)
V_B = (0,00 × 0,0000) + (0,70 × 0,0000) + (0,00 × 0,4219) + (0,00 × 0,8627)
    + (0,30 × 0,1538) + (0,00 × 0,9375) + (0,00 × 0,6000) + (0,00 × 1,0000)
    + (0,00 × 1,0000)
V_B = 0,00 + 0,00 + 0,00 + 0,00 + 0,0461 + 0,00 + 0,00 + 0,00 + 0,00
V_B = 0,0461
```

#### Motor C (Honda Vario 160)
```
V_C = (W1 × R_C1) + (W2 × R_C2) + ... + (W9 × R_C9)
V_C = (0,00 × 0,3667) + (0,70 × 0,1190) + (0,00 × 1,0000) + (0,00 × 1,0000)
    + (0,30 × 0,0000) + (0,00 × 1,0000) + (0,00 × 1,0000) + (0,00 × 0,4483)
    + (0,00 × 1,0000)
V_C = 0,00 + 0,0833 + 0,00 + 0,00 + 0,00 + 0,00 + 0,00 + 0,00 + 0,00
V_C = 0,0833
```

### 6.3 Perhitungan Skor Ergonomis

User tinggi = 165 cm

#### Motor A (Yamaha Mio - Seat H: 750mm)
```
minTinggi = (750 - 600) × 0,22 + 120 = 153 cm
diff = 165 - 153 = 12 cm
ergoScore = 0,9 (diff 5-15 cm)
```

#### Motor B (Yamaha NMax - Seat H: 765mm)
```
minTinggi = (765 - 600) × 0,22 + 120 = 156,3 cm ≈ 156 cm
diff = 165 - 156 = 9 cm
ergoScore = 0,9 (diff 5-15 cm)
```

#### Motor C (Honda Vario - Seat H: 775mm)
```
minTinggi = (775 - 600) × 0,22 + 120 = 158,5 cm ≈ 159 cm
diff = 165 - 159 = 6 cm
ergoScore = 0,9 (diff 5-15 cm)
```

### 6.4 Skor Gabungan

```
Final_Score = SAW_Score × 0,80 + Ergo_Score × 0,20
```

| Motor | SAW Score | Ergo Score | Final Score |
|-------|-----------|-------------|-------------|
| A (Yamaha Mio) | 1,0000 | 0,9 | **0,9800** |
| B (Yamaha NMax) | 0,0461 | 0,9 | 0,2269 |
| C (Honda Vario) | 0,0833 | 0,9 | 0,2467 |

---

## 7. Perangkingan

### 7.1 Hasil Akhir

| Rank | Motor | SAW Score | Ergo Score | Final Score |
|------|-------|-----------|-------------|--------------|
| 🥇 **1** | **Yamaha Mio i125** | 1,0000 | 0,9 | **0,9800** |
| 🥈 2 | Honda Vario 160 | 0,0833 | 0,9 | 0,2467 |
| 🥉 3 | Yamaha NMax 155 | 0,0461 | 0,9 | 0,2269 |

### 7.2 Kesimpulan

Untuk user dengan prioritas **irit BBM** dan penggunaan **harian**, **Yamaha Mio i125** adalah rekomendasi terbaik karena:

1. **Efisiensi BBM tertinggi** (61,6 km/L) - sesuai prioritas
2. **Harga termurah** (Rp 17.500.000)
3. **Berat paling ringan** (94 kg) - cocok untuk harian
4. **Ergonomis sesuai** tinggi badan user (165 cm)

Motor ini sangat ideal untuk penggunaan sehari-hari dengan budget terbatas dan menginginkan motor yang irit.

---

## 8. Ringkasan Formula

### Normalisasi Min-Max

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BENEFIT:  R_ij = (X_ij - X_j^min) / (X_j^max - X_j^min)               │
│                                                                             │
│  COST:     R_ij = (X_j^max - X_ij) / (X_j^max - X_j^min)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Perhitungan Skor SAW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  V_i = Σ (W_j × R_ij)                                                      │
│                                                                             │
│  V_i = Skor total alternatif ke-i                                          │
│  W_j = Bobot kriteria ke-j                                                  │
│  R_ij = Nilai normalisasi kriteria ke-j untuk alternatif ke-i              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Skor Gabungan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Final = SAW × 0,80 + Ergo × 0,20                                          │
│                                                                             │
│  SAW = Skor dari perhitungan normalisasi berbobot                          │
│  Ergo = Skor berdasarkan kesesuaian tinggi badan                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Pseudocode

```python
# SAW Algorithm Pseudocode

function SAW(motors, answers, weights):
    # 1. Filter motors based on criteria
    filtered = filterMotors(motors, answers)

    # 2. Calculate min/max for normalization
    stats = calculateStats(filtered)

    # 3. Normalize each motor
    for motor in filtered:
        for criterion in criteria:
            if criterion.type == BENEFIT:
                motor.normalized[criterion] = (motor[criterion] - stats.min[criterion]) / stats.range[criterion]
            else:  # COST
                motor.normalized[criterion] = (stats.max[criterion] - motor[criterion]) / stats.range[criterion]

    # 4. Calculate SAW score
    for motor in filtered:
        score = 0
        for criterion in criteria:
            score += weights[criterion] * motor.normalized[criterion]
        motor.sawScore = score

    # 5. Calculate ergonomic score
    for motor in filtered:
        minHeight = calculateMinHeight(motor.seat_h)
        diff = answers.height - minHeight
        motor.ergoScore = calculateErgoScore(diff)

    # 6. Combine scores
    for motor in filtered:
        motor.finalScore = motor.sawScore * 0.80 + motor.ergoScore * 0.20

    # 7. Sort and rank
    sortMotors(filtered, by='finalScore', descending=True)
    assignRanks(filtered)

    return filtered
```
