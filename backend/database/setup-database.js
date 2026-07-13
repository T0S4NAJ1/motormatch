'use strict';

const db = require('./database-service.js');

function printError(err) {
  console.error('');
  console.error('  ❌ Setup GAGAL');
  console.error('');
  console.error(`  Pesan : ${err && err.message ? err.message : '-'}`);
  console.error(`  Code  : ${err && err.code ? err.code : '-'}`);
  console.error(`  Errno : ${err && err.errno ? err.errno : '-'}`);
  if (err && err.sqlMessage) console.error(`  SQL   : ${err.sqlMessage}`);
  console.error('');
  console.error('  Cek lagi:');
  console.error('    • MySQL/MariaDB sudah Start di XAMPP/Laragon');
  console.error('    • File .env berada satu folder dengan package.json');
  console.error('    • DB_HOST gunakan 127.0.0.1');
  console.error('    • DB_USER dan DB_PASSWORD sesuai dengan phpMyAdmin/MySQL');
  console.error('    • User MySQL punya akses CREATE DATABASE dan CREATE TABLE');
  console.error('');
}

(async () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════════╗');
  console.log('  ║   MotorMatch — Database Setup              ║');
  console.log('  ╚════════════════════════════════════════════╝');
  console.log('');

  try {
    console.log('  [1/4] Cek koneksi MySQL...');
    await db.ensureDatabase();
    console.log(`        ✅ Database \`${db.DB_CONFIG.database}\` siap`);

    console.log('  [2/4] Bikin table, index, dan role...');
    await db.createSchema();
    console.log('        ✅ Table `motors`, `roles`, `users`, dan `user_sessions` siap');

    console.log('  [3/4] Seed data motor...');
    const ok = await db.testConnection();
    if (!ok) throw new Error('Koneksi pool gagal setelah schema dibuat');
    await db.init();

    console.log('  [4/4] Verifikasi...');
    const motors = await db.getAllMotors();
    console.log(`        ✅ Total motor di DB: ${motors.length}`);
    if (motors.length > 0) {
      console.log(`        ✅ Sample: ${motors[0].brand} ${motors[0].model} (Rp ${motors[0].harga.toLocaleString('id-ID')})`);
    }

    console.log('');
    console.log('  Setup selesai. Jalankan: npm run dev');
    console.log('');

    await db.close();
    process.exit(0);
  } catch (err) {
    printError(err);
    try { await db.close(); } catch (_) {}
    process.exit(1);
  }
})();
