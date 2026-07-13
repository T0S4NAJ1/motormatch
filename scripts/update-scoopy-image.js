'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateScoopyImage() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'motormatch_saw',
  });

  const newImage = 'assets/images/2021_Honda_Scoopy_Prestige_110_(20220216).jpg';

  const [result] = await connection.execute(
    'UPDATE motors SET img = ? WHERE model = ?',
    [newImage, 'Scoopy']
  );

  console.log(`Updated ${result.affectedRows} row(s)`);

  const [rows] = await connection.execute(
    'SELECT id, model, img FROM motors WHERE model = ?',
    ['Scoopy']
  );

  console.log('Current data:');
  console.log(rows);

  await connection.end();
}

updateScoopyImage().catch(console.error);