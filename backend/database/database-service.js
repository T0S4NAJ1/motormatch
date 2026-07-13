'use strict';

const mysql = require('mysql2/promise');
const crypto = require('crypto');
try { require('dotenv').config(); } catch (_) {}

const DB_CONFIG = {
  host:               process.env.DB_HOST     || 'localhost',
  port:        Number(process.env.DB_PORT)    || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'motormatch_saw',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
  decimalNumbers:    true,
};

const pool = mysql.createPool(DB_CONFIG);

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`  ✅ MySQL connected → ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    return true;
  } catch (e) {
    console.error(`  ❌ MySQL connection FAILED: ${e.message}`);
    console.error(`     Cek .env atau jalankan: npm run setup`);
    return false;
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS motors (
  id          INT UNSIGNED       PRIMARY KEY,
  brand       VARCHAR(50)        NOT NULL,
  model       VARCHAR(100)       NOT NULL,
  year        SMALLINT UNSIGNED  NOT NULL,
  category    ENUM('Matic','Sport','Naked') NOT NULL,
  cc          SMALLINT UNSIGNED  NOT NULL,
  power       DECIMAL(6,2)       NOT NULL,
  torque      DECIMAL(6,2)       NOT NULL,
  weight      SMALLINT UNSIGNED  NOT NULL,
  seat_h      SMALLINT UNSIGNED  NOT NULL,
  fuel_l      DECIMAL(4,2)       NOT NULL,
  harga       INT UNSIGNED       NOT NULL,
  bbm         DECIMAL(5,2)       NOT NULL,
  nyaman      TINYINT UNSIGNED   NOT NULL,
  bbm_tipe    ENUM('Pertalite','Pertamax','Pertamax Turbo') NOT NULL,
  tinggi_min  TINYINT UNSIGNED   NOT NULL,
  fuel_level  TINYINT UNSIGNED   NOT NULL,
  img         VARCHAR(255)       NOT NULL,
  created_at  TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand    (brand),
  INDEX idx_category (category),
  INDEX idx_harga    (harga),
  INDEX idx_cc       (cc),
  INDEX idx_bbm_tipe (bbm_tipe)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const AUTH_SCHEMA_SQL = [
`CREATE TABLE IF NOT EXISTS roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
`CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id TINYINT UNSIGNED NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_users_role (role_id),
  INDEX idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
`CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

`CREATE TABLE IF NOT EXISTS recommendation_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  top_motor_id INT UNSIGNED,
  top_motor_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_history_user (user_id),
  INDEX idx_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];


const FUEL_TYPES = Object.freeze({
  PERTALITE:      { id:'Pertalite',      ron:90, level:0, label:'Pertalite (RON 90)'      },
  PERTAMAX:       { id:'Pertamax',       ron:92, level:1, label:'Pertamax (RON 92)'       },
  PERTAMAX_TURBO: { id:'Pertamax Turbo', ron:98, level:2, label:'Pertamax Turbo (RON 98)' },
});

const FUEL_LEVEL = { 'Pertalite':0, 'Pertamax':1, 'Pertamax Turbo':2 };

const CC_LABEL = {
  kecil:'≤125cc', sedang:'126–250cc', besar:'251–500cc', super:'>500cc'
};

const WEIGHTS = {
  harga:    { C1: 0.40, C2: 0.25, C3: 0.20, C4: 0.15 },
  bbm:      { C1: 0.25, C2: 0.40, C3: 0.15, C4: 0.20 },
  performa: { C1: 0.15, C2: 0.15, C3: 0.50, C4: 0.20 },
  nyaman:   { C1: 0.20, C2: 0.20, C3: 0.20, C4: 0.40 },
  seimbang: { C1: 0.25, C2: 0.25, C3: 0.25, C4: 0.25 },
};

const USAGE_PROFILES = {
  harian:   { C1: 0.35, C2: 0.35, C3: 0.15, C4: 0.15 },
  touring:  { C1: 0.20, C2: 0.30, C3: 0.25, C4: 0.25 },
  sport:    { C1: 0.10, C2: 0.15, C3: 0.50, C4: 0.25 },
  keluarga: { C1: 0.25, C2: 0.25, C3: 0.15, C4: 0.35 },
};

function calcTinggiMin(seat_h) {
  return Math.round((seat_h - 600) * 0.22 + 120);
}

const QUESTIONS = [
  {
    id:'budget', stepLabel:'Step 01 — Anggaran', pct:14,
    sub:'Pertanyaan 1 dari 7',
    q:'Berapa anggaran Anda untuk membeli sepeda motor?',
    hint:'Tentukan rentang harga agar sistem dapat menyesuaikan rekomendasi motor yang paling presisi untuk Anda.',
    choices:[
      { icon:'🐷', title:'< 20 juta',     sub:'Entry level & Harian',     value:'20000000' },
      { icon:'💰', title:'20 – 50 juta',  sub:'Middle range & Sporty',    value:'50000000' },
      { icon:'🏦', title:'50 – 150 juta', sub:'Premium & Performance',    value:'150000000' },
      { icon:'♾️', title:'No Limit',       sub:'Big bike & Superbike',     value:'null' },
    ]
  },
  {
    id:'usage', stepLabel:'Step 02 — Penggunaan', pct:28,
    sub:'Pertanyaan 2 dari 7',
    q:'Apa tujuan utama Anda menggunakan sepeda motor?',
    hint:'Jawaban ini membantu sistem memilih motor yang paling sesuai dengan gaya hidup Anda sehari-hari.',
    choices:[
      { icon:'🏙️', title:'Harian / Commuting',    sub:'Kerja, kuliah, dalam kota',  value:'harian' },
      { icon:'🗺️', title:'Touring Jarak Jauh',    sub:'Perjalanan antar kota',      value:'touring' },
      { icon:'🏁', title:'Gaya Hidup & Performa', sub:'Sport, komunitas motor',     value:'sport' },
      { icon:'👨‍👩‍👧', title:'Serbaguna / Keluarga',sub:'Keperluan beragam',          value:'keluarga' },
    ]
  },
  {
    id:'tipe', stepLabel:'Step 03 — Tipe Motor', pct:42,
    sub:'Pertanyaan 3 dari 7',
    q:'Tipe motor apa yang Anda inginkan?',
    hint:'Matic = otomatis & praktis · Sport = aerodinamis & kencang · Naked = tegak & agresif.',
    choices:[
      { icon:'🛵', title:'Matic',               sub:'Otomatis, praktis untuk kota & touring',  value:'Matic' },
      { icon:'🏍️', title:'Sport / Full Fairing', sub:'Aerodinamis, performa tinggi',           value:'Sport' },
      { icon:'⚡', title:'Naked / Streetfighter',sub:'Posisi tegak, handling lincah',          value:'Naked' },
      { icon:'🌐', title:'Semua Tipe',           sub:'Tidak ada preferensi khusus',            value:'null' },
    ]
  },
  {
    id:'prioritas', stepLabel:'Step 04 — Prioritas', pct:56,
    sub:'Pertanyaan 4 dari 7',
    q:'Faktor apa yang PALING penting bagi Anda?',
    hint:'Pilihan ini menentukan bobot SAW — kriteria yang Anda pilih akan mendapat bobot lebih tinggi.',
    choices:[
      { icon:'💸', title:'Harga Semurah Mungkin', sub:'Efisiensi biaya adalah prioritas',  value:'harga' },
      { icon:'⛽', title:'Irit Bahan Bakar',       sub:'Hemat di perjalanan panjang',       value:'bbm' },
      { icon:'🚀', title:'Performa Mesin Kuat',   sub:'Tenaga dan akselerasi tinggi',      value:'performa' },
      { icon:'💺', title:'Kenyamanan Berkendara', sub:'Posisi ergonomis, minim getaran',   value:'nyaman' },
    ]
  },
  {
    id:'cc', stepLabel:'Step 05 — Kapasitas CC', pct:70,
    sub:'Pertanyaan 5 dari 7',
    q:'Kapasitas mesin yang Anda inginkan?',
    hint:'Mesin kecil lebih irit BBM · Menengah serba bisa · Besar untuk touring & performa · 250cc+ untuk kelas premium.',
    choices:[
      { icon:'🌱', title:'Kecil (≤125cc)',        sub:'Sangat irit BBM, ideal dalam kota',     value:'kecil' },
      { icon:'⚖️', title:'Menengah (126–250cc)',  sub:'Balance power & efisiensi, serbaguna',  value:'sedang' },
      { icon:'🔥', title:'Besar (251–500cc)',     sub:'Performa tinggi, touring nyaman',        value:'besar' },
      { icon:'💥', title:'Super (>500cc)',        sub:'Big bike & superbike kelas dunia',       value:'super' },
    ]
  },
  {
    id:'tinggi', stepLabel:'Step 06 — Tinggi Badan', pct:100,
    sub:'Pertanyaan 6 dari 6',
    q:'Berapa tinggi badan Anda?',
    hint:'Tinggi badan menentukan ergonomi motor — motor dengan jok terlalu tinggi membuat kaki sulit menapak tanah.',
    choices:[
      { icon:'🧒', title:'< 155 cm',     sub:'Postur mungil — perlu motor jok pendek',    value:'150' },
      { icon:'🧑', title:'155 – 165 cm', sub:'Postur rata-rata Asia',                     value:'160' },
      { icon:'🧔', title:'165 – 175 cm', sub:'Postur tinggi sedang',                      value:'170' },
      { icon:'🧗', title:'> 175 cm',     sub:'Postur jangkung — bebas pilih',             value:'180' },
    ]
  },
];
const MOTORS_RAW = [
  // Honda Matic
  { id:1,  brand:'Honda',  model:'BeAT Street',   year:2022, category:'Matic', cc:108,
    power:6.57, torque:9.36, weight:90,  seat_h:747, fuel_l:3.8, harga:18750000, bbm:59.5, nyaman:7, bbm_tipe:'Pertalite',     img:'assets/images/honda_beat_street.jpg' },
  { id:2,  brand:'Honda',  model:'Genio',          year:2022, category:'Matic', cc:110,
    power:9.0,  torque:9.3,  weight:94,  seat_h:740, fuel_l:4.0, harga:19000000, bbm:57.0, nyaman:8, bbm_tipe:'Pertalite',     img:'assets/images/honda_genio.jpg' },
  { id:3,  brand:'Honda',  model:'Scoopy',         year:2022, category:'Matic', cc:110,
    power:9.0,  torque:9.3,  weight:95,  seat_h:745, fuel_l:4.2, harga:21000000, bbm:55.0, nyaman:8, bbm_tipe:'Pertalite',     img:'assets/images/2021_Honda_Scoopy_Prestige_110_(20220216).jpg' },
  { id:4,  brand:'Honda',  model:'PCX 125',        year:2021, category:'Matic', cc:125,
    power:12.3, torque:11.8, weight:127, seat_h:764, fuel_l:8.1, harga:27000000, bbm:50.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/honda_pcx_125.jpg' },
  { id:5,  brand:'Honda',  model:'Vario 160',     year:2022, category:'Matic', cc:157,
    power:15.8, torque:14.7, weight:133, seat_h:775, fuel_l:5.5, harga:27000000, bbm:46.8, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/honda_vario_160.jpg' },
  { id:6,  brand:'Honda',  model:'PCX 160',        year:2022, category:'Matic', cc:157,
    power:15.8, torque:14.7, weight:131, seat_h:764, fuel_l:8.1, harga:32000000, bbm:46.8, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/honda_pcx_160.jpg' },
  { id:7,  brand:'Honda',  model:'ADV 150',        year:2021, category:'Matic', cc:149,
    power:12.3, torque:13.8, weight:133, seat_h:795, fuel_l:8.0, harga:36200000, bbm:44.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/honda_adv_150.jpg' },
  { id:8,  brand:'Honda',  model:'Forza 350',      year:2022, category:'Matic', cc:330,
    power:28.8, torque:31.9, weight:186, seat_h:780, fuel_l:11.7, harga:95000000, bbm:28.0, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/honda_forza_350.jpg' },
  { id:42, brand:'Honda', model:'Stylo 160',      year:2024, category:'Matic', cc:157,
    power:15.8, torque:14.7, weight:115, seat_h:770, fuel_l:5.5, harga:28000000, bbm:48.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/honda_stylo_160.jpg' },

  // Honda Sport
  { id:9,  brand:'Honda',  model:'CBR 150R',      year:2022, category:'Sport', cc:149,
    power:16.7, torque:14.4, weight:141, seat_h:788, fuel_l:12.3, harga:30500000, bbm:40.0, nyaman:6, bbm_tipe:'Pertamax',      img:'assets/images/CBR150R_Repsol_Edition.jfif' },
  { id:10, brand:'Honda',  model:'CBR 300R',      year:2019, category:'Sport', cc:286,
    power:22.4, torque:27.3, weight:172, seat_h:785, fuel_l:13.1, harga:65000000, bbm:30.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/honda_cbr_300r.jpg' },
  { id:11, brand:'Honda',  model:'CBR 500R',      year:2019, category:'Sport', cc:471,
    power:35.0, torque:43.0, weight:189, seat_h:785, fuel_l:17.7, harga:125000000, bbm:20.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/honda_cbr_500r.jpg' },
  { id:12, brand:'Honda',  model:'CBR 650R',      year:2022, category:'Sport', cc:649,
    power:87.0, torque:63.0, weight:206, seat_h:810, fuel_l:15.4, harga:280000000, bbm:16.0, nyaman:7, bbm_tipe:'Pertamax Turbo', img:'assets/images/honda_cbr_650r.jpg' },
  { id:13, brand:'Honda',  model:'CBR 600RR',     year:2020, category:'Sport', cc:599,
    power:118.0, torque:63.0, weight:194, seat_h:820, fuel_l:18.0, harga:350000000, bbm:14.0, nyaman:6, bbm_tipe:'Pertamax Turbo', img:'assets/images/honda_cbr_600rr.jpg' },
  { id:14, brand:'Honda',  model:'CBR 1000RR-R',  year:2020, category:'Sport', cc:999,
    power:217.6, torque:113.0, weight:201, seat_h:830, fuel_l:16.1, harga:700000000, bbm:10.0, nyaman:5, bbm_tipe:'Pertamax Turbo', img:'assets/images/honda_cbr_1000rr_r.jpg' },

  // Honda Naked
  { id:15, brand:'Honda',  model:'CB125R',         year:2021, category:'Naked', cc:125,
    power:11.0, torque:11.6, weight:129, seat_h:816, fuel_l:10.1, harga:41000000, bbm:45.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/honda_cb125r.jpg' },
  { id:16, brand:'Honda',  model:'CB 200X',        year:2022, category:'Naked', cc:184,
    power:12.4, torque:16.1, weight:155, seat_h:810, fuel_l:12.0, harga:45000000, bbm:38.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/Honda_CB200X_4.jpg' },
  { id:17, brand:'Honda',  model:'CB 300R',         year:2019, category:'Naked', cc:286,
    power:22.4, torque:27.3, weight:143, seat_h:800, fuel_l:10.0, harga:68000000, bbm:28.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/honda_cb_300r.jpg' },
  { id:18, brand:'Honda',  model:'CB 500F',        year:2019, category:'Naked', cc:471,
    power:35.0, torque:43.0, weight:192, seat_h:785, fuel_l:17.7, harga:118000000, bbm:20.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/honda_cb_500f.jpg' },
  { id:19, brand:'Honda',  model:'CB 650R',        year:2022, category:'Naked', cc:649,
    power:87.0, torque:63.0, weight:206, seat_h:810, fuel_l:15.4, harga:250000000, bbm:15.0, nyaman:8, bbm_tipe:'Pertamax Turbo', img:'assets/images/honda_cb_650r.jpg' },
  { id:20, brand:'Honda',  model:'CB 1000R',       year:2021, category:'Naked', cc:998,
    power:107.0, torque:104.0, weight:213, seat_h:830, fuel_l:16.2, harga:450000000, bbm:12.0, nyaman:7, bbm_tipe:'Pertamax Turbo', img:'assets/images/honda_cb_1000r.jpg' },

  // Yamaha Matic
  { id:21, brand:'Yamaha', model:'Mio i125',       year:2022, category:'Matic', cc:125,
    power:9.4,  torque:9.6,  weight:94,  seat_h:750, fuel_l:4.2, harga:17500000, bbm:61.6, nyaman:7, bbm_tipe:'Pertalite',     img:'assets/images/yamaha_mio_i125.jpg' },
  { id:22, brand:'Yamaha', model:'Fazzio',         year:2022, category:'Matic', cc:125,
    power:9.4,  torque:9.6,  weight:99,  seat_h:750, fuel_l:4.2, harga:21000000, bbm:59.0, nyaman:8, bbm_tipe:'Pertalite',     img:'assets/images/yamaha_fazzio.jpg' },
  { id:23, brand:'Yamaha', model:'Grand Filano',    year:2022, category:'Matic', cc:125,
    power:9.0,  torque:9.6,  weight:97,  seat_h:750, fuel_l:4.3, harga:22000000, bbm:58.0, nyaman:8, bbm_tipe:'Pertalite',     img:'assets/images/yamaha_grand_filano.jpg' },
  { id:24, brand:'Yamaha', model:'Aerox 155',      year:2022, category:'Matic', cc:155,
    power:14.8, torque:13.9, weight:116, seat_h:790, fuel_l:5.5, harga:27500000, bbm:43.2, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_aerox_155.jpg' },
  { id:25, brand:'Yamaha', model:'NMax 155',       year:2022, category:'Matic', cc:155,
    power:12.1, torque:14.0, weight:127, seat_h:765, fuel_l:7.1, harga:32500000, bbm:44.8, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_nmax_155.jpg' },
  { id:26, brand:'Yamaha', model:'NMax 160',       year:2022, category:'Matic', cc:155,
    power:15.4, torque:14.0, weight:127, seat_h:765, fuel_l:7.1, harga:34500000, bbm:44.0, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_nmax_160.jpg' },
  { id:27, brand:'Yamaha', model:'XMAX 300',       year:2022, category:'Matic', cc:292,
    power:20.6, torque:29.0, weight:183, seat_h:795, fuel_l:13.2, harga:90000000, bbm:28.0, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_xmax_300.jpg' },
  { id:28, brand:'Yamaha', model:'XMAX 400',       year:2021, category:'Matic', cc:395,
    power:24.5, torque:36.0, weight:206, seat_h:800, fuel_l:13.0, harga:120000000, bbm:22.0, nyaman:9, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_xmax_400.jpg' },

  // Yamaha Naked
  { id:29, brand:'Yamaha', model:'MT-125',         year:2022, category:'Naked', cc:125,
    power:14.8, torque:11.5, weight:142, seat_h:810, fuel_l:11.0, harga:52000000, bbm:42.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_mt_125.jpg' },
  { id:30, brand:'Yamaha', model:'Vixion',         year:2020, category:'Naked', cc:149,
    power:16.4, torque:14.5, weight:134, seat_h:795, fuel_l:12.0, harga:25000000, bbm:42.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_vixion.jpg' },
  { id:31, brand:'Yamaha', model:'MT-15',          year:2022, category:'Naked', cc:155,
    power:18.2, torque:14.7, weight:138, seat_h:810, fuel_l:10.0, harga:36000000, bbm:40.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_mt_15.jpg' },
  { id:32, brand:'Yamaha', model:'YS250 Fazer',    year:2018, category:'Naked', cc:249,
    power:15.4, torque:21.0, weight:147, seat_h:795, fuel_l:14.5, harga:42000000, bbm:33.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/YAMAHA_YS250_Fazer_Yamaha_Communication_Plaza.jpg' },
  { id:33, brand:'Yamaha', model:'MT-03',          year:2022, category:'Naked', cc:321,
    power:42.0, torque:29.6, weight:168, seat_h:780, fuel_l:14.0, harga:85000000, bbm:25.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_mt_03.jpg' },
  { id:34, brand:'Yamaha', model:'MT-07',          year:2022, category:'Naked', cc:689,
    power:74.0, torque:68.0, weight:188, seat_h:805, fuel_l:14.0, harga:220000000, bbm:18.0, nyaman:8, bbm_tipe:'Pertamax Turbo', img:'assets/images/yamaha_mt_07.jpg' },
  { id:35, brand:'Yamaha', model:'MT-09',          year:2022, category:'Naked', cc:889,
    power:119.0, torque:93.0, weight:193, seat_h:825, fuel_l:14.0, harga:310000000, bbm:14.0, nyaman:8, bbm_tipe:'Pertamax Turbo', img:'assets/images/yamaha_mt_09.jpg' },
  { id:36, brand:'Yamaha', model:'XSR 155',        year:2022, category:'Naked', cc:155,
    power:12.2, torque:14.7, weight:134, seat_h:790, fuel_l:10.5, harga:34500000, bbm:45.0, nyaman:8, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_xsr_155.jpg' },

  // Yamaha Sport
  { id:37, brand:'Yamaha', model:'R15 V2',         year:2014, category:'Sport', cc:149,
    power:12.6, torque:14.7, weight:136, seat_h:815, fuel_l:12.0, harga:30000000, bbm:40.0, nyaman:6, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_r15_v4.jpg' },
  { id:38, brand:'Yamaha', model:'YZF-R25',        year:2022, category:'Sport', cc:250,
    power:35.0, torque:22.6, weight:166, seat_h:780, fuel_l:14.0, harga:72000000, bbm:32.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_yzf_r25.jpg' },
  { id:39, brand:'Yamaha', model:'YZF-R3',         year:2022, category:'Sport', cc:321,
    power:42.0, torque:29.6, weight:169, seat_h:780, fuel_l:14.0, harga:95000000, bbm:24.0, nyaman:7, bbm_tipe:'Pertamax',      img:'assets/images/yamaha_yzf_r3.jpg' },
  { id:40, brand:'Yamaha', model:'YZF-R7',         year:2022, category:'Sport', cc:689,
    power:73.0, torque:67.0, weight:188, seat_h:835, fuel_l:13.2, harga:230000000, bbm:17.0, nyaman:7, bbm_tipe:'Pertamax Turbo', img:'assets/images/yamaha_yzf_r7.jpg' },
  { id:41, brand:'Yamaha', model:'YZF-R1',        year:2020, category:'Sport', cc:998,
    power:200.0, torque:112.4, weight:206, seat_h:855, fuel_l:17.0, harga:450000000, bbm:12.0, nyaman:6, bbm_tipe:'Pertamax Turbo', img:'assets/images/yamaha_yzf_r1.jpg' },
];

function normalizeImagePath(img) {
  const value = String(img ?? '').trim();
  if (!value) return 'assets/images/placeholder.svg';
  return value.startsWith('images/') ? `assets/${value}` : value;
}

function normalizeRow(row) {
  if (!row) return null;
  return {
    id:         Number(row.id),
    brand:      row.brand,
    model:      row.model,
    year:       Number(row.year),
    category:   row.category,
    cc:         Number(row.cc),
    power:      Number(row.power),
    torque:     Number(row.torque),
    weight:     Number(row.weight),
    seat_h:     Number(row.seat_h),
    fuel_l:     Number(row.fuel_l),
    harga:      Number(row.harga),
    bbm:        Number(row.bbm),
    nyaman:     Number(row.nyaman),
    bbm_tipe:   row.bbm_tipe,
    tinggi_min: Number(row.tinggi_min),
    fuel_level: Number(row.fuel_level),
    img:        normalizeImagePath(row.img),
  };
}

function text(value, fieldName, maxLength = 100) {
  const val = String(value ?? '').trim();
  if (!val) throw new Error(`${fieldName} wajib diisi`);
  if (val.length > maxLength) throw new Error(`${fieldName} maksimal ${maxLength} karakter`);
  return val;
}

function numberValue(value, fieldName, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error(`${fieldName} harus berupa angka`);
  if (num < min || num > max) throw new Error(`${fieldName} harus di antara ${min} dan ${max}`);
  return num;
}

function enumValue(value, fieldName, allowed) {
  const val = text(value, fieldName, 50);
  if (!allowed.includes(val)) throw new Error(`${fieldName} harus salah satu dari: ${allowed.join(', ')}`);
  return val;
}

function sanitizeMotorPayload(payload = {}) {
  const category = enumValue(payload.category, 'Kategori', ['Matic', 'Sport', 'Naked']);
  const bbm_tipe = enumValue(payload.bbm_tipe, 'Tipe BBM', ['Pertalite', 'Pertamax', 'Pertamax Turbo']);
  const seat_h = Math.round(numberValue(payload.seat_h, 'Tinggi jok', { min: 600, max: 950 }));
  const img = normalizeImagePath(payload.img);

  return {
    brand: text(payload.brand, 'Brand', 50),
    model: text(payload.model, 'Model', 100),
    year: Math.round(numberValue(payload.year, 'Tahun', { min: 1990, max: 2100 })),
    category,
    cc: Math.round(numberValue(payload.cc, 'CC', { min: 50, max: 2000 })),
    power: numberValue(payload.power, 'Power', { min: 1, max: 400 }),
    torque: numberValue(payload.torque, 'Torque', { min: 1, max: 400 }),
    weight: Math.round(numberValue(payload.weight, 'Berat', { min: 50, max: 500 })),
    seat_h,
    fuel_l: numberValue(payload.fuel_l, 'Kapasitas tangki', { min: 1, max: 50 }),
    harga: Math.round(numberValue(payload.harga, 'Harga', { min: 1, max: 2000000000 })),
    bbm: numberValue(payload.bbm, 'Efisiensi BBM', { min: 1, max: 100 }),
    nyaman: Math.round(numberValue(payload.nyaman, 'Skor kenyamanan', { min: 1, max: 10 })),
    bbm_tipe,
    tinggi_min: calcTinggiMin(seat_h),
    fuel_level: FUEL_LEVEL[bbm_tipe] ?? 0,
    img,
  };
}

async function createMotor(payload = {}) {
  const data = sanitizeMotorPayload(payload);
  const [[{ nextId }]] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM motors');

  const sql = `
    INSERT INTO motors
      (id, brand, model, year, category, cc, power, torque, weight,
       seat_h, fuel_l, harga, bbm, nyaman, bbm_tipe, tinggi_min, fuel_level, img)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.query(sql, [
    nextId, data.brand, data.model, data.year, data.category, data.cc,
    data.power, data.torque, data.weight, data.seat_h, data.fuel_l,
    data.harga, data.bbm, data.nyaman, data.bbm_tipe,
    data.tinggi_min, data.fuel_level, data.img,
  ]);

  return getMotorById(nextId);
}

async function getAllMotors() {
  const [rows] = await pool.query('SELECT * FROM motors ORDER BY id ASC');
  return rows.map(normalizeRow);
}

async function getMotorById(id) {
  const [rows] = await pool.query('SELECT * FROM motors WHERE id = ? LIMIT 1', [Number(id)]);
  return rows.length ? normalizeRow(rows[0]) : null;
}

async function getMotorsByBrand(brand) {
  const [rows] = await pool.query(
    'SELECT * FROM motors WHERE LOWER(brand) = LOWER(?) ORDER BY id',
    [String(brand)]
  );
  return rows.map(normalizeRow);
}

async function filterMotors(opts = {}) {
  const { budget, tipe, ccSegment, tinggi, bbm_tipe } = opts;
  const where  = [];
  const params = [];

  if (budget) {
    where.push('harga <= ?');
    params.push(Number(budget));
  }
  if (tipe) {
    where.push('category = ?');
    params.push(tipe);
  }
  if (ccSegment) {
    const ccClause = {
      kecil:  'cc <= 125',
      sedang: 'cc > 125 AND cc <= 250',
      besar:  'cc > 250 AND cc <= 500',
      super:  'cc > 500',
    }[ccSegment];
    if (ccClause) where.push(`(${ccClause})`);
  }
  if (tinggi) {
    where.push('tinggi_min <= ?');
    params.push(Number(tinggi) + 3);
  }
  if (bbm_tipe) {
    where.push('fuel_level <= ?');
    params.push(FUEL_LEVEL[bbm_tipe] ?? 2);
  }

  const sql =
    'SELECT * FROM motors' +
    (where.length ? ' WHERE ' + where.join(' AND ') : '') +
    ' ORDER BY id ASC';

  const [rows] = await pool.query(sql, params);
  return rows.map(normalizeRow);
}


async function updateMotor(id, payload = {}) {
  const current = await getMotorById(id);
  if (!current) return null;

  const data = sanitizeMotorPayload({ ...current, ...payload });
  const sql = `
    UPDATE motors SET
      brand = ?, model = ?, year = ?, category = ?, cc = ?, power = ?, torque = ?,
      weight = ?, seat_h = ?, fuel_l = ?, harga = ?, bbm = ?, nyaman = ?,
      bbm_tipe = ?, tinggi_min = ?, fuel_level = ?, img = ?
    WHERE id = ?
  `;

  await pool.query(sql, [
    data.brand, data.model, data.year, data.category, data.cc, data.power,
    data.torque, data.weight, data.seat_h, data.fuel_l, data.harga, data.bbm,
    data.nyaman, data.bbm_tipe, data.tinggi_min, data.fuel_level, data.img,
    Number(id),
  ]);

  return getMotorById(id);
}

async function deleteMotor(id) {
  const [result] = await pool.query('DELETE FROM motors WHERE id = ?', [Number(id)]);
  return result.affectedRows > 0;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 120000;
  const hash = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = Buffer.from(parts[3], 'hex');
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256');
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function cleanFullName(value) {
  const fullName = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!fullName) throw new Error('Nama lengkap wajib diisi');
  if (fullName.length > 100) throw new Error('Nama lengkap maksimal 100 karakter');
  return fullName;
}

function cleanUsername(value) {
  const username = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error('Username 3-30 karakter, gunakan huruf, angka, titik, underscore, atau strip');
  }
  return username;
}

function cleanPassword(value) {
  const password = String(value ?? '');
  if (password.length < 8) throw new Error('Password minimal 8 karakter');
  if (password.length > 72) throw new Error('Password maksimal 72 karakter');
  // Minimal huruf besar, huruf kecil, dan angka
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new Error('Password harus mengandung huruf besar, huruf kecil, dan angka');
  }
  return password;
}

function cleanRole(value) {
  const role = String(value ?? 'user').trim().toLowerCase();
  if (!['admin', 'user'].includes(role)) throw new Error('Role tidak valid');
  return role;
}

function publicUser(row) {
  return {
    id: Number(row.id),
    full_name: row.full_name,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
  };
}

async function getRoleId(roleName) {
  const [rows] = await pool.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [roleName]);
  if (!rows.length) throw new Error('Role belum tersedia di database');
  return Number(rows[0].id);
}

async function seedAuthDefaults() {
  // Hanya insert role user
  await pool.query(`INSERT IGNORE INTO roles (id, name) VALUES (2, 'user')`);

  const [[{ totalUser }]] = await pool.query(`
    SELECT COUNT(*) AS totalUser
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'user'
  `);

  if (Number(totalUser) === 0) {
    await pool.query(
      'INSERT INTO users (role_id, full_name, username, password_hash) VALUES (?, ?, ?, ?)',
      [2, 'User Demo', 'user', hashPassword('user123')]
    );
  }
}

async function registerUser(payload = {}) {
  // Registrasi publik SELALU membuat akun user.
  // Role 'admin' tidak boleh dibuat lewat registrasi, bahkan jika payload mengirim role lain.
  // Akun admin hanya dibuat di dalam program (lihat seedAuthDefaults).
  const role = 'user';
  const fullName = cleanFullName(payload.full_name);
  const username = cleanUsername(payload.username);
  const password = cleanPassword(payload.password);
  const roleId = await getRoleId(role);

  try {
    const [result] = await pool.query(
      'INSERT INTO users (role_id, full_name, username, password_hash) VALUES (?, ?, ?, ?)',
      [roleId, fullName, username, hashPassword(password)]
    );
    return getUserById(result.insertId);
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') throw new Error('Username sudah digunakan');
    throw error;
  }
}

async function getUserById(id) {
  const [rows] = await pool.query(`
    SELECT u.id, u.full_name, u.username, u.created_at, r.name AS role
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? LIMIT 1
  `, [Number(id)]);
  return rows.length ? publicUser(rows[0]) : null;
}

async function createUserSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 12);
  await pool.query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [Number(userId), hashToken(token), expires]
  );
  return token;
}

async function loginUser(payload = {}) {
  const username = cleanUsername(payload.username);
  const password = String(payload.password ?? '');
  const [rows] = await pool.query(`
    SELECT u.id, u.full_name, u.username, u.password_hash, u.created_at, r.name AS role
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.username = ? LIMIT 1
  `, [username]);

  if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
    throw new Error('Username atau password salah');
  }

  await pool.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  const token = await createUserSession(rows[0].id);
  return { token, user: publicUser(rows[0]) };
}

async function getUserByToken(token) {
  if (!token) return null;
  const [rows] = await pool.query(`
    SELECT u.id, u.full_name, u.username, u.created_at, r.name AS role
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE s.token_hash = ? AND s.expires_at > NOW()
    LIMIT 1
  `, [hashToken(token)]);
  return rows.length ? publicUser(rows[0]) : null;
}

async function logoutUser(token) {
  if (!token) return false;
  const [result] = await pool.query('DELETE FROM user_sessions WHERE token_hash = ?', [hashToken(token)]);
  return result.affectedRows > 0;
}

async function listUsers() {
  const [rows] = await pool.query(`
    SELECT u.id, u.full_name, u.username, u.created_at, r.name AS role
    FROM users u JOIN roles r ON r.id = u.role_id
    ORDER BY u.id ASC
  `);
  return rows.map(publicUser);
}

async function saveRecommendationHistory(userId, answers, result, topMotor) {
  const [insertResult] = await pool.query(
    `INSERT INTO recommendation_history (user_id, answers_json, result_json, top_motor_id, top_motor_name) VALUES (?, ?, ?, ?, ?)`,
    [Number(userId), JSON.stringify(answers), JSON.stringify(result), topMotor?.id || null, topMotor ? `${topMotor.brand} ${topMotor.model}` : 'Unknown']
  );
  return insertResult.insertId;
}

async function getRecommendationHistory(userId) {
  const [rows] = await pool.query(
    `SELECT * FROM recommendation_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [Number(userId)]
  );
  return rows.map(row => ({
    id: Number(row.id),
    answers: JSON.parse(row.answers_json),
    result: JSON.parse(row.result_json),
    topMotor: row.top_motor_id ? { id: Number(row.top_motor_id), name: row.top_motor_name } : null,
    createdAt: row.created_at
  }));
}

async function deleteHistory(historyId, userId) {
  const [result] = await pool.query(
    'DELETE FROM recommendation_history WHERE id = ? AND user_id = ?',
    [Number(historyId), Number(userId)]
  );
  return result.affectedRows > 0;
}

async function deleteAllHistory(userId) {
  const [result] = await pool.query(
    'DELETE FROM recommendation_history WHERE user_id = ?',
    [Number(userId)]
  );
  return result.affectedRows;
}

function inCCSegment(m, seg) {
  switch (seg) {
    case 'kecil':  return m.cc <= 125;
    case 'sedang': return m.cc > 125 && m.cc <= 250;
    case 'besar':  return m.cc > 250 && m.cc <= 500;
    case 'super':  return m.cc > 500;
    default:       return true;
  }
}

function ergonomicFit(motor, tinggi_user) {
  if (!tinggi_user) return 1;
  const delta = tinggi_user - motor.tinggi_min;
  if (delta >= 0 && delta <= 20) return 1.0;
  if (delta < 0)                 return Math.max(0,   1 + delta / 8);
  return                                Math.max(0.6, 1 - (delta - 20) / 40);
}

async function ensureDatabase() {
  const bootstrap = await mysql.createConnection({
    host: DB_CONFIG.host, port: DB_CONFIG.port,
    user: DB_CONFIG.user, password: DB_CONFIG.password,
    charset: 'utf8mb4',
  });
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` ` +
    `CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();
}

async function createSchema() {
  await pool.query(SCHEMA_SQL);
  for (const sql of AUTH_SCHEMA_SQL) await pool.query(sql);
}

async function seed() {
  const values = MOTORS_RAW.map(m => [
    m.id, m.brand, m.model, m.year, m.category, m.cc,
    m.power, m.torque, m.weight, m.seat_h, m.fuel_l,
    m.harga, m.bbm, m.nyaman, m.bbm_tipe,
    calcTinggiMin(m.seat_h),
    FUEL_LEVEL[m.bbm_tipe] ?? 0,
    m.img,
  ]);

  const sql = `
    INSERT IGNORE INTO motors
      (id, brand, model, year, category, cc, power, torque, weight,
       seat_h, fuel_l, harga, bbm, nyaman, bbm_tipe, tinggi_min, fuel_level, img)
    VALUES ?
  `;
  const [result] = await pool.query(sql, [values]);
  return result.affectedRows;
}

async function init() {
  await ensureDatabase();
  await createSchema();
  await seedAuthDefaults();

  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM motors');
  if (count === 0) {
    const inserted = await seed();
    console.log(`  ✅ Seeded ${inserted} motor`);
  } else {
    console.log(`  ℹ️  Skip seed — table sudah berisi ${count} motor`);
  }
}

async function close() {
  await pool.end();
}

module.exports = {

  DB_CONFIG, pool, testConnection, init, seed, close, ensureDatabase, createSchema,

  QUESTIONS, WEIGHTS, USAGE_PROFILES, FUEL_TYPES, FUEL_LEVEL, CC_LABEL,

  calcTinggiMin, inCCSegment, ergonomicFit,

  getAllMotors, getMotorById, getMotorsByBrand, filterMotors, createMotor, updateMotor, deleteMotor,

  SCHEMA_SQL, AUTH_SCHEMA_SQL,

  MOTORS_RAW, registerUser, loginUser, getUserByToken, logoutUser, seedAuthDefaults,
  saveRecommendationHistory, getRecommendationHistory, deleteHistory, deleteAllHistory,
};
