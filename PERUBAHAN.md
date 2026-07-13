# Perubahan MotorMatch

## Struktur sekarang
1. **Beranda (publik)** — `index.html`
   Galeri referensi seluruh motor Honda & Yamaha (dari data yang ada) + filter
   Merk/Jenis + detail spesifikasi (modal). Tujuannya menarik pengguna melihat
   referensi motor lebih dulu.
2. **Login / Daftar (tersambung database)** — `login.html`, `register.html`
   Memakai endpoint `/api/auth/*` dan tabel `users`, `roles`, `user_sessions`
   yang sudah ada (tidak diubah).
3. **Rekomendasi (butuh login)** — `user-dashboard.html`
   Wizard dengan **6 kategori**:
   1. Harga Motor
   2. Tujuan Penggunaan
   3. Tipe Motor
   4. Faktor Prioritas
   5. Kapasitas Mesin (CC)
   6. Tinggi Badan
   Hasil tetap memakai metode SAW (peringkat, skor, tabel & grafik).

## Alur
- Buka `/` → **Beranda** (galeri, publik).
- Klik **Rekomendasi** atau tombol "Mulai Rekomendasi":
  - belum login → diarahkan ke **Login** (setelah login otomatis kembali ke rekomendasi),
  - sudah login → langsung ke wizard rekomendasi.
- Navigasi atas berubah otomatis sesuai status login
  (Login/Daftar ⇄ nama user + Logout).

## Akun bawaan (dibuat otomatis di database)
- Admin : username `admin`  / password `admin123`
- User  : username `user`   / password `user123`
  (atau buat akun baru lewat halaman Daftar)

## Bug Fixes (2024-06-26)

### 1. Fix 6 Pemilihan Rekomendasi
**File:** `saw-calculator.js`

**Masalah:**
- `progressiveFilter()` tidak mem-parse parameter dengan benar
- Filter budget salah menggunakan perbandingan string 'null'
- Edge cases tidak ditangani (min === max)

**Perbaikan:**
- `applyFilters()` - 6 filter: Budget, Tipe, CC, Tinggi
- `progressiveFilter()` - 7 step pelonggaran filter
- `runSAW()` - Parse jawaban aman dengan null checks
- Normalisasi handle edge case min === max

### 2. Fix auth-service.js
**File:** `auth-service.js`

**Masalah:**
- BYPASS_MODE tersisa dari debugging

**Perbaikan:**
- Hapus BYPASS_MODE dan mock response
- Kembali ke implementasi normal

### 3. Fix user-dashboard.js
**File:** `user-dashboard.js`

**Masalah:**
- Error saat element `user-session` atau `db-status` tidak ada

**Perbaikan:**
- Tambahkan null checks sebelum akses DOM

### 4. Fix Ranking Skor
**File:** `recommendation-result.js`

**Masalah:**
- Skor di "Peringkat Selengkapnya" dihitung relatif terhadap #1, bukan absolut
- Yamaha R15 V4 skor 75% tapi tampil 91% (karena 75/82*100)

**Perbaikan:**
- Ubah `renderRankGrid()` untuk menggunakan skor absolut `m.Vi * 100`

### 5. Perubahan Gambar & Redirect
**File:** `server.js`, `motor-data-store.js`, `database-service.js`

**Perubahan:**
- Redirect root `/` ke `login.html` (bukan `index.html`)
- Yamaha R125 menggunakan SVG placeholder copyright-free

## Yang berubah / ditambah
- `public/index.html` — beranda dengan navigasi sadar-login (tanpa form rekomendasi inline)
- `public/assets/scripts/app.js` — galeri + navigasi sesi + routing rekomendasi (login-gated)
- `public/assets/scripts/motor-data-store.js` — daftar pertanyaan jadi **6 kategori** (pertanyaan BBM dihapus)
- `public/assets/scripts/auth-page.js` — login/daftar menghormati `?next=` (kembali ke tujuan semula)
- `public/user-dashboard.html` — ditambah link **Beranda**
- `public/assets/styles/simple-app.css` — style galeri (memakai token desain lama)
- `server.js` — halaman default `/` membuka `index.html`
- `public/assets/scripts/saw-calculator.js` — perbaikan filter dan parsing

## Menjalankan
- Tanpa database (galeri & UI saja): buka `public/index.html` langsung di browser.
- Lengkap dengan login + database:
  1. Nyalakan MySQL/MariaDB (XAMPP/Laragon), sesuaikan `.env`.
  2. `npm install` (jika perlu) lalu `npm run setup` (membuat tabel + data awal).
  3. `npm start` → buka http://localhost:3000

## Catatan
- Beranda sengaja dibuat publik agar pengguna bisa melihat referensi dulu;
  rekomendasi-lah yang membutuhkan login. Bila ingin SELURUH situs di balik login,
  ubah baris di `server.js`: `urlPath === '/' ? '/index.html'` menjadi `'/login.html'`.
- `admin.html`, `landing.html` masih ada (opsional) dan tidak mengganggu alur.
