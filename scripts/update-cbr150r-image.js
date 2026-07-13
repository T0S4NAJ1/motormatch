'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateCBR150RImage() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'motormatch_saw',
  });

  const newImage = 'assets/images/CBR150R_Repsol_Edition.jfif';

  const [result] = await connection.execute(
    'UPDATE motors SET img = ? WHERE model = ?',
    [newImage, 'CBR 150R Repsol Edition']
  );

  console.log(`Updated ${result.affectedRows} row(s)`);

  const [rows] = await connection.execute(
    'SELECT id, model, img FROM motors WHERE model = ?',
    ['CBR 150R Repsol Edition']
  );

  console.log('Current data:');
  console.log(rows);

  await connection.end();
}

updateCBR150RImage().catch(console.error);