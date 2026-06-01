const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME || 'lumina_lms'
  });

  const keepNames = [
    'Bachelor of Arts (AB): English Language',
    'Bachelor of Elementary Education (BEEd): Generalist',
    'Bachelor of Secondary Education (BSEd): Majors in English and Mathematics',
    'Bachelor of Science (BS): Midwifery'
  ];

  try {
    // 1. Get IDs of departments to delete
    const [deptsToDelete] = await connection.query(`
      SELECT id FROM departments WHERE name NOT IN (?, ?, ?, ?)
    `, keepNames);

    if (deptsToDelete.length > 0) {
      const ids = deptsToDelete.map(d => d.id);
      
      // 2. Set users department_id to NULL for these departments
      await connection.query(`
        UPDATE users SET department_id = NULL WHERE department_id IN (?)
      `, [ids]);
      console.log('Set old user departments to NULL');

      // 3. Delete the departments
      await connection.query(`
        DELETE FROM departments WHERE id IN (?)
      `, [ids]);
      console.log('Deleted old departments completely. Only keeping the 4 requested.');
    } else {
      console.log('No old departments found to delete.');
    }

  } catch(e) {
    console.log('Error: ' + e.message);
  }
  
  await connection.end();
}

run();
