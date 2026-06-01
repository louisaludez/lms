const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME || 'lumina_lms'
  });

  try {
    await connection.execute(`DELETE FROM departments WHERE name IN ('Elementary', 'Highschool', 'Senior High School');`);
    console.log('Deleted old departments');
  } catch(e) {
    console.log('Error: ' + e.message);
  }
  
  await connection.end();
}

run();
