const db = require('./backend/database/database-service.js');

const motors = [
  // Honda Matic - dari dataset
  { id:1,  brand:'Honda',  model:'BeAT Street',   year:2022, category:'Matic', cc:108,
    power:8.3, torque:8.3, weight:90, seat_h:747, fuel_l:3.8, harga:18750000, bbm:59.5, nyaman:7, img:'assets/images/honda_beat_street.jpg' },
  { id:2,  brand:'Honda',  model:'Genio',          year:2022, category:'Matic', cc:110,
    power:9.0, torque:9.3, weight:94, seat_h:740, fuel_l:4.0, harga:19000000, bbm:57.0, nyaman:8, img:'assets/images/honda_genio.jpg' },
  { id:3,  brand:'Honda',  model:'Scoopy',         year:2022, category:'Matic', cc:110,
    power:9.0, torque:9.3, weight:95, seat_h:745, fuel_l:4.2, harga:21000000, bbm:55.0, nyaman:8, img:'assets/images/2021_Honda_Scoopy_Prestige_110_(20220216).jpg' },
  { id:4,  brand:'Honda',  model:'PCX 125',        year:2021, category:'Matic', cc:125,
    power:12.3, torque:11.8, weight:127, seat_h:764, fuel_l:8.1, harga:27000000, bbm:50.0, nyaman:8, img:'assets/images/honda_pcx_125.jpg' },
  { id:5,  brand:'Honda',  model:'Vario 160',     year:2022, category:'Matic', cc:157,
    power:15.8, torque:14.7, weight:133, seat_h:775, fuel_l:5.5, harga:27000000, bbm:46.8, nyaman:9, img:'assets/images/honda_vario_160.jpg' },
  { id:6,  brand:'Honda',  model:'PCX 160',        year:2022, category:'Matic', cc:157,
    power:15.8, torque:14.7, weight:131, seat_h:764, fuel_l:8.1, harga:32000000, bbm:46.8, nyaman:9, img:'assets/images/honda_pcx_160.jpg' },
  { id:7,  brand:'Honda',  model:'ADV 150',        year:2021, category:'Matic', cc:149,
    power:12.3, torque:13.8, weight:133, seat_h:795, fuel_l:8.0, harga:36200000, bbm:44.0, nyaman:8, img:'assets/images/honda_adv_150.jpg' },
  { id:8,  brand:'Honda',  model:'Forza 350',      year:2022, category:'Matic', cc:330,
    power:28.8, torque:31.9, weight:186, seat_h:780, fuel_l:11.7, harga:95000000, bbm:28.0, nyaman:9, img:'assets/images/honda_forza_350.jpg' },

  // Honda Sport - dari dataset
  { id:9,  brand:'Honda',  model:'CBR 150R',      year:2022, category:'Sport', cc:149,
    power:16.7, torque:14.4, weight:141, seat_h:788, fuel_l:12.3, harga:30500000, bbm:40.0, nyaman:6, img:'assets/images/CBR150R_Repsol_Edition.jfif' },
  { id:10, brand:'Honda',  model:'CBR 300R',      year:2019, category:'Sport', cc:286,
    power:22.4, torque:27.3, weight:172, seat_h:785, fuel_l:13.1, harga:65000000, bbm:30.0, nyaman:7, img:'assets/images/honda_cbr_300r.jpg' },
  { id:11, brand:'Honda',  model:'CBR 500R',      year:2019, category:'Sport', cc:471,
    power:35.0, torque:43.0, weight:189, seat_h:785, fuel_l:17.7, harga:125000000, bbm:20.0, nyaman:7, img:'assets/images/honda_cbr_500r.jpg' },
  { id:12, brand:'Honda',  model:'CBR 650R',      year:2022, category:'Sport', cc:649,
    power:87.0, torque:63.0, weight:206, seat_h:810, fuel_l:15.4, harga:280000000, bbm:16.0, nyaman:7, img:'assets/images/honda_cbr_650r.jpg' },
  { id:13, brand:'Honda',  model:'CBR 600RR',     year:2020, category:'Sport', cc:599,
    power:118.0, torque:63.0, weight:194, seat_h:820, fuel_l:18.0, harga:350000000, bbm:14.0, nyaman:6, img:'assets/images/honda_cbr_600rr.jpg' },
  { id:14, brand:'Honda',  model:'CBR 1000RR-R',  year:2020, category:'Sport', cc:999,
    power:217.6, torque:113.0, weight:201, seat_h:830, fuel_l:16.1, harga:700000000, bbm:10.0, nyaman:5, img:'assets/images/honda_cbr_1000rr_r.jpg' },

  // Honda Naked - dari dataset
  { id:15, brand:'Honda',  model:'CB150R',         year:2022, category:'Naked', cc:149,
    power:15.6, torque:13.8, weight:126, seat_h:795, fuel_l:8.0, harga:35000000, bbm:42.0, nyaman:8, img:'assets/images/honda_cb150r.jpg' },
  { id:16, brand:'Honda',  model:'CB 200X',        year:2022, category:'Naked', cc:184,
    power:12.4, torque:16.1, weight:155, seat_h:810, fuel_l:12.0, harga:45000000, bbm:38.0, nyaman:8, img:'assets/images/Honda_CB200X_4.jpg' },
  { id:17, brand:'Honda',  model:'CB 300R',         year:2019, category:'Naked', cc:286,
    power:22.4, torque:27.3, weight:143, seat_h:800, fuel_l:10.0, harga:68000000, bbm:28.0, nyaman:7, img:'assets/images/honda_cb_300r.jpg' },
  { id:18, brand:'Honda',  model:'CB 500F',        year:2019, category:'Naked', cc:471,
    power:35.0, torque:43.0, weight:192, seat_h:785, fuel_l:17.7, harga:118000000, bbm:20.0, nyaman:8, img:'assets/images/honda_cb_500f.jpg' },
  { id:19, brand:'Honda',  model:'CB 650R',        year:2022, category:'Naked', cc:649,
    power:87.0, torque:63.0, weight:206, seat_h:810, fuel_l:15.4, harga:250000000, bbm:15.0, nyaman:8, img:'assets/images/honda_cb_650r.jpg' },
  { id:20, brand:'Honda',  model:'CB 1000R',       year:2021, category:'Naked', cc:998,
    power:107.0, torque:104.0, weight:213, seat_h:830, fuel_l:16.2, harga:450000000, bbm:12.0, nyaman:7, img:'assets/images/honda_cb_1000r.jpg' },

  // Honda Cruiser
  { id:42, brand:'Honda',  model:'NSR 125',      year:2003, category:'Sport', cc:125,
    power:15.0, torque:12.0, weight:118, seat_h:785, fuel_l:12.0, harga:35000000, bbm:38.0, nyaman:6, img:'assets/images/honda_nsr_125.jpg' },

  // Yamaha Matic - dari dataset
  { id:21, brand:'Yamaha', model:'Mio i125',       year:2022, category:'Matic', cc:125,
    power:9.4, torque:9.6, weight:94, seat_h:750, fuel_l:4.2, harga:17500000, bbm:61.6, nyaman:7, img:'assets/images/yamaha_mio_i125.jpg' },
  { id:22, brand:'Yamaha', model:'Fazzio',         year:2022, category:'Matic', cc:125,
    power:9.4, torque:9.6, weight:99, seat_h:750, fuel_l:4.2, harga:21000000, bbm:59.0, nyaman:8, img:'assets/images/yamaha_fazzio.jpg' },
  { id:23, brand:'Yamaha', model:'Grand Filano',    year:2022, category:'Matic', cc:125,
    power:9.0, torque:9.6, weight:97, seat_h:750, fuel_l:4.3, harga:22000000, bbm:58.0, nyaman:8, img:'assets/images/yamaha_grand_filano.jpg' },
  { id:24, brand:'Yamaha', model:'Aerox 155',      year:2022, category:'Matic', cc:155,
    power:14.8, torque:13.9, weight:116, seat_h:790, fuel_l:5.5, harga:27500000, bbm:43.2, nyaman:8, img:'assets/images/yamaha_aerox_155.jpg' },
  { id:25, brand:'Yamaha', model:'NMax 155',       year:2022, category:'Matic', cc:155,
    power:12.1, torque:14.0, weight:127, seat_h:765, fuel_l:7.1, harga:32500000, bbm:44.8, nyaman:9, img:'assets/images/yamaha_nmax_155.jpg' },
  { id:26, brand:'Yamaha', model:'NMax 160',       year:2022, category:'Matic', cc:155,
    power:15.4, torque:14.0, weight:127, seat_h:765, fuel_l:7.1, harga:34500000, bbm:44.0, nyaman:9, img:'assets/images/yamaha_nmax_160.jpg' },
  { id:27, brand:'Yamaha', model:'XMAX 300',       year:2022, category:'Matic', cc:292,
    power:20.6, torque:29.0, weight:183, seat_h:795, fuel_l:13.2, harga:90000000, bbm:28.0, nyaman:9, img:'assets/images/yamaha_xmax_300.jpg' },
  { id:28, brand:'Yamaha', model:'XMAX 400',       year:2021, category:'Matic', cc:395,
    power:24.5, torque:36.0, weight:206, seat_h:800, fuel_l:13.0, harga:120000000, bbm:22.0, nyaman:9, img:'assets/images/yamaha_xmax_400.jpg' },

  // Yamaha Naked - dari dataset
  { id:29, brand:'Yamaha', model:'MT-125',         year:2022, category:'Naked', cc:125,
    power:14.8, torque:11.5, weight:142, seat_h:810, fuel_l:11.0, harga:52000000, bbm:42.0, nyaman:7, img:'assets/images/yamaha_mt_125.jpg' },
  { id:30, brand:'Yamaha', model:'Vixion',         year:2020, category:'Naked', cc:149,
    power:16.4, torque:14.5, weight:134, seat_h:795, fuel_l:12.0, harga:25000000, bbm:42.0, nyaman:7, img:'assets/images/yamaha_vixion.jpg' },
  { id:31, brand:'Yamaha', model:'MT-15',          year:2022, category:'Naked', cc:155,
    power:18.2, torque:14.7, weight:138, seat_h:810, fuel_l:10.0, harga:36000000, bbm:40.0, nyaman:7, img:'assets/images/yamaha_mt_15.jpg' },
  { id:32, brand:'Yamaha', model:'YS250 Fazer',    year:2018, category:'Naked', cc:249,
    power:15.4, torque:21.0, weight:147, seat_h:795, fuel_l:14.5, harga:42000000, bbm:33.0, nyaman:8, img:'assets/images/YAMAHA_YS250_Fazer_Yamaha_Communication_Plaza.jpg' },
  { id:33, brand:'Yamaha', model:'MT-03',          year:2022, category:'Naked', cc:321,
    power:42.0, torque:29.6, weight:168, seat_h:780, fuel_l:14.0, harga:85000000, bbm:25.0, nyaman:8, img:'assets/images/yamaha_mt_03.jpg' },
  { id:34, brand:'Yamaha', model:'MT-07',          year:2022, category:'Naked', cc:689,
    power:74.0, torque:68.0, weight:188, seat_h:805, fuel_l:14.0, harga:220000000, bbm:18.0, nyaman:8, img:'assets/images/yamaha_mt_07.jpg' },
  { id:35, brand:'Yamaha', model:'MT-09',          year:2022, category:'Naked', cc:889,
    power:119.0, torque:93.0, weight:193, seat_h:825, fuel_l:14.0, harga:310000000, bbm:14.0, nyaman:8, img:'assets/images/yamaha_mt_09.jpg' },

  // Yamaha Sport - dari dataset
  { id:37, brand:'Yamaha', model:'R15 V2',         year:2014, category:'Sport', cc:149,
    power:12.6, torque:14.7, weight:136, seat_h:815, fuel_l:12.0, harga:30000000, bbm:40.0, nyaman:6, img:'assets/images/yamaha_r15_v4.jpg' },
  { id:38, brand:'Yamaha', model:'YZF-R25',        year:2022, category:'Sport', cc:250,
    power:35.0, torque:22.6, weight:166, seat_h:780, fuel_l:14.0, harga:72000000, bbm:32.0, nyaman:7, img:'assets/images/yamaha_yzf_r25.jpg' },
  { id:39, brand:'Yamaha', model:'YZF-R3',         year:2022, category:'Sport', cc:321,
    power:42.0, torque:29.6, weight:169, seat_h:780, fuel_l:14.0, harga:95000000, bbm:24.0, nyaman:7, img:'assets/images/yamaha_yzf_r3.jpg' },
  { id:40, brand:'Yamaha', model:'YZF-R7',         year:2022, category:'Sport', cc:689,
    power:73.0, torque:67.0, weight:188, seat_h:835, fuel_l:13.2, harga:230000000, bbm:17.0, nyaman:7, img:'assets/images/yamaha_yzf_r7.jpg' },
  { id:41, brand:'Yamaha', model:'YZF-R1',        year:2020, category:'Sport', cc:998,
    power:200.0, torque:112.4, weight:206, seat_h:855, fuel_l:17.0, harga:450000000, bbm:12.0, nyaman:6, img:'assets/images/yamaha_yzf_r1.jpg' },
];

(async () => {
  const conn = await db.pool.getConnection();

  // Delete all existing motors
  await conn.query('DELETE FROM motors');
  console.log('Cleared all motors');

  // Insert new valid data
  for (const m of motors) {
    await conn.query(
      'INSERT INTO motors (id, brand, model, year, category, cc, power, torque, weight, seat_h, fuel_l, harga, bbm, nyaman, img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [m.id, m.brand, m.model, m.year, m.category, m.cc, m.power, m.torque, m.weight, m.seat_h, m.fuel_l, m.harga, m.bbm, m.nyaman, m.img]
    );
  }

  console.log('Inserted', motors.length, 'motors');

  // Verify
  const [rows] = await conn.query('SELECT COUNT(*) as total FROM motors');
  console.log('Total in DB:', rows[0].total);

  conn.release();
  await db.close();
  console.log('Done!');
})();
