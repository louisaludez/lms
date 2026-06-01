const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456789',
    database: process.env.DB_NAME || 'lumina_lms'
  });

  const depts = [
    { name: 'Bachelor of Arts (AB): English Language', code: 'AB-EL' },
    { name: 'Bachelor of Elementary Education (BEEd): Generalist', code: 'BEEd' },
    { name: 'Bachelor of Secondary Education (BSEd): Majors in English and Mathematics', code: 'BSEd' },
    { name: 'Bachelor of Science (BS): Midwifery', code: 'BS-Midwifery' },
    { name: 'Elementary', code: 'ELEM' },
    { name: 'Highschool', code: 'JHS' },
    { name: 'Senior High School', code: 'SHS' }
  ];

  for (const dept of depts) {
    try {
      // Upsert logic for safety
      await connection.execute(`
        INSERT INTO departments (name, code, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE name = VALUES(name);
      `, [dept.name, dept.code]);
      console.log('Inserted/Updated: ' + dept.name);
    } catch(e) {
      console.log('Error inserting ' + dept.name + ': ' + e.message);
    }
  }
  
  await connection.end();
}

run();
