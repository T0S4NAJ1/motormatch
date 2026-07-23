'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');
const db = require('./database-service.js');

async function main() {
  console.log('');
  console.log('  ╔════════════════════════════════════════════╗');
  console.log('  ║   MotorMatch — Database Doctor             ║');  
  console.log('  ╚════════════════════════════════════════════╝');
  console.log('');

  const cfg = db.DB_CONFIG;
  console.log('  Config terbaca:');
  console.log(`    DB_HOST = ${cfg.host}`);
  console.log(`    DB_PORT = ${cfg.port}`);
  console.log(`    DB_USER = ${cfg.user}`);
  console.log(`    DB_NAME = ${cfg.database}`);
  console.log(`    DB_PASSWORD = ${cfg.password ? '(terisi)' : '(kosong)'}`);
  console.log('');

  let bootstrap;
  try {
    bootstrap = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      charset: 'utf8mb4',
    });

    console.log('  [1/5] Koneksi MySQL tanpa database... ✅');

    const [dbRows] = await bootstrap.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [cfg.database]
    );
    console.log(`  [2/5] Database \`${cfg.database}\`... ${dbRows.length ? '✅ ada' : '❌ belum ada'}`);

    if (!dbRows.length) {
      console.log('        Solusi: jalankan npm run setup');
      return;
    }

    const [tableRows] = await bootstrap.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [cfg.database, 'motors']
    );
    console.log(`  [3/4] Table \`${cfg.database}.motors\`... ${tableRows.length ? '✅ ada' : '❌ belum ada'}`);

    if (!tableRows.length) {
      console.log('        Solusi: jalankan npm run setup');
      return;
    }

    const [countRows] = await bootstrap.query(`SELECT COUNT(*) AS total FROM \`${cfg.database}\`.\`motors\``);
    const total = Number(countRows[0].total || 0);
    console.log(`  [4/5] Jumlah data motor... ✅ ${total} data`);


    const [authRows] = await bootstrap.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?)',
      [cfg.database, 'roles', 'users', 'user_sessions']
    );
    const authCount = authRows.length;
    const [userRows] = await bootstrap.query(`SELECT COUNT(*) AS total FROM \`${cfg.database}\`.\`users\``).catch(() => [[{ total: 0 }]]);
    console.log(`  [5/5] Table auth... ${authCount === 3 ? '✅ lengkap' : '❌ belum lengkap'} · ${Number(userRows[0].total || 0)} user`);

    if (total === 0) {
      console.log('        Table ada, tetapi kosong. Solusi: jalankan npm run setup');
    } else {
      const [sample] = await bootstrap.query(`SELECT id, brand, model, harga FROM \`${cfg.database}\`.\`motors\` ORDER BY id LIMIT 3`);
      console.log('');
      console.log('  Sample data:');
      for (const m of sample) {
        console.log(`    - ${m.id}. ${m.brand} ${m.model} — Rp ${Number(m.harga).toLocaleString('id-ID')}`);
      }
      console.log('');
      console.log('  ✅ Database sudah siap dipakai backend.');
      console.log('  Buka: http://localhost:3000/api/health');
    }
  } catch (err) {
    console.error('');
    console.error('  ❌ Doctor gagal:', err.message);
    console.error('');
    console.error('  Cek:');
    console.error('    • MySQL/XAMPP/Laragon sudah aktif');
    console.error('    • .env berada di root project, satu folder dengan package.json');
    console.error('    • DB_USER dan DB_PASSWORD benar');
  } finally {
    if (bootstrap) await bootstrap.end();
    await db.close().catch(() => {});
  }
}

main();
