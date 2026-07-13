# 🏍️ MotorMatch

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)

> Sistem rekomendasi motor Honda & Yamaha menggunakan metode SAW (Simple Additive Weighting) dengan antarmuka web modern.

## 📋 Deskripsi

MotorMatch adalah aplikasi web yang membantu pengguna menemukan motor yang paling sesuai dengan kebutuhan dan preferensi berkendara mereka. Dengan sistem rekomendasi cerdas berbasis metode SAW, aplikasi ini membandingkan berbagai motor Honda dan Yamaha berdasarkan kriteria seperti harga, efisiensi bahan bakar, performa, dan kenyamanan.

## ✨ Fitur

- 🏠 **Beranda Interaktif** - Galeri motor dengan filter multi-level
- 🔍 **Katalog Motor** - Browsing 40+ motor Honda & Yamaha
- 🧙 **Wizard Rekomendasi** - 6 pertanyaan untuk preferensi pengguna
- 📊 **Analisis SAW** - Perbandingan motor dengan metode Simple Additive Weighting
- 👤 **Dashboard User** - Riwayat rekomendasi personal
- 📜 **Autentikasi** - Sistem login dan registrasi
- 📱 **Responsive Design** - Tampilan optimal di semua perangkat

## 🛠️ Tech Stack

| Kategori | Teknologi |
|----------|----------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL / MariaDB |
| **API** | RESTful API |
| **Styling** | Custom CSS dengan Racing Dark Theme |

## 🚀 Instalasi

### Prerequisites

- Node.js v18.0.0 atau lebih baru
- MySQL / MariaDB (opsional, bisa menggunakan mode lokal)
- npm atau yarn

### Langkah Instalasi

1. **Clone repository**
```bash
git clone https://github.com/username/motormatch.git
cd motormatch
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment**
```bash
# Salin file .env.example ke .env
cp .env.example .env

# Edit .env sesuai konfigurasi MySQL Anda
# Jika tidak ada MySQL, aplikasi tetap bisa berjalan dengan mode data lokal
```

4. **Konfigurasi .env**
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=motormatch_saw
PORT=3000
```

5. **Jalankan server**
```bash
# Development mode
npm run dev

# Atau production mode
npm start
```

6. **Buka di browser**
```
http://localhost:3000
```

## 📖 Dokumentasi

### Akun Default
```
Username: user
Password: user123
```

### Database Setup
```sql
-- Buat database
CREATE DATABASE motormatch_saw;

-- Login sebagai user
USE motormatch_saw;

-- Buat tabel (otomatis saat server pertama jalan)
-- Atau jalankan manual:
npm run fixdb
```

### Struktur Project
```
motormatch/
├── backend/
│   └── database/        # Database service & setup
├── public/
│   ├── assets/
│   │   ├── images/      # Motor images
│   │   ├── scripts/      # JavaScript modules
│   │   └── styles/      # CSS files
│   ├── index.html        # Landing page
│   ├── landing.html      # Full app page
│   ├── login.html        # Login page
│   ├── register.html     # Registration page
│   ├── user-dashboard.html # User dashboard
│   └── history.html      # Recommendation history
├── scripts/              # Utility scripts
├── server.js            # Express server
├── package.json
├── .env.example
└── README.md
```

## 🎯 Metode Rekomendasi

MotorMatch menggunakan metode **SAW (Simple Additive Weighting)** dengan kriteria:

| Kriteria | Bobot Default | Keterangan |
|---------|---------------|------------|
| Harga | 30% | Semakin murah semakin baik |
| Efisiensi BBM | 25% | Km/liter semakin tinggi越好 |
| Performa | 25% | Tenaga & torsi |
| Kenyamanan | 20% | Tinggi jok & fitur |

### Formula SAW
```
Skor Motor = Σ (Bobot_i × Normalisasi_i)
```

## 📸 Screenshots

### Dark Racing Theme
- Navigation bar dengan gradient accent
- Hero section dengan atmospheric background
- Motor cards dengan hover glow effects
- Wizard steps dengan progress indicator

### Katalog Motor
- Filter sidebar dengan multi-level filtering
- Grid responsive dengan motor cards
- Modal detail dengan spesifikasi lengkap

### Sistem Rekomendasi
- 6 langkah wizard pertanyaan
- Progress bar visual
- Hasil rekomendasi dengan ranking
- Tabel perbandingan SAW

## 🤝 Kontribusi

Kontribusi selalu diterima! Ikuti langkah berikut:

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 Lisensi

Project ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 👨‍💻 Author

**MotorMatch Development Team**

## 🙏 Acknowledgments

- Desain inspired by Racing & Automotive aesthetics
- Motor images courtesy of Honda & Yamaha Indonesia
- Built with passion for motorcycle enthusiasts

---

⭐ Jangan lupa untuk memberikan star jika proyek ini berguna!
