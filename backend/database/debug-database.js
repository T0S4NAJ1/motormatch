'use strict';

const mysql = require('mysql2/promise');
try { require('dotenv').config(); } catch (_) {}

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'motormatch_saw',
};

(async () => {
  console.log('');
  console.log('MotorMatch — Database Debug');
  console.log('');
  console.log(`Host     : ${config.host}`);
  console.log(`Port     : ${config.port}`);
  console.log(`User     : ${config.user}`);
  console.log(`Database : ${config.database}`);
  console.log(`Password : ${config.password ? 'terisi' : 'kosong'}`);
  console.log('');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      charset: 'utf8mb4',
    });

    const [version] = await conn.query('SELECT VERSION() AS version');
    console.log(`✅ Koneksi MySQL berhasil: ${version[0].version}`);

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database \`${config.database}\` bisa dibuat/diakses`);

    await conn.changeUser({ database: config.database });
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`✅ Jumlah table saat ini: ${tables.length}`);
    tables.forEach((row) => console.log(`   - ${Object.values(row)[0]}`));
    console.log('');
  } catch (err) {
    console.log('❌ Koneksi gagal');
    console.log(`Pesan : ${err && err.message ? err.message : '-'}`);
    console.log(`Code  : ${err && err.code ? err.code : '-'}`);
    console.log(`Errno : ${err && err.errno ? err.errno : '-'}`);
    if (err && err.sqlMessage) console.log(`SQL   : ${err.sqlMessage}`);
    console.log('');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
