const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'lumina_lms'
  });

  const depts = [
    { name: 'TVL', code: 'TVL' },
    { name: 'GAS', code: 'GAS' },
    { name: 'HUMSS', code: 'HUMSS' },
    { name: 'STEM', code: 'STEM' },
    { name: 'AB English', code: 'AB-ENG' },
    { name: 'BS Midwifery', code: 'BS-MID' },
    { name: 'BEEd', code: 'BEED' },
    { name: 'BSED major in English', code: 'BSED-ENG' },
    { name: 'BSED major in Mathematics', code: 'BSED-MATH' }
  ];

  console.log('Synchronizing 9 departments in MySQL database...');

  try {
    for (const dept of depts) {
      await connection.execute(`
        INSERT INTO departments (name, code, created_at) 
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code);
      `, [dept.name, dept.code]);
      console.log(`Synced department: ${dept.name} (${dept.code})`);
    }

    const targetNames = depts.map(d => d.name);
    const [oldDepts] = await connection.query(`
      SELECT id, name FROM departments WHERE name NOT IN (?)
    `, [targetNames]);

    if (oldDepts.length > 0) {
      const oldIds = oldDepts.map(d => d.id);
      await connection.query(`
        UPDATE users SET department_id = NULL WHERE department_id IN (?)
      `, [oldIds]);
      console.log('Unlinked users from old obsolete departments.');

      await connection.query(`
        DELETE FROM departments WHERE id IN (?)
      `, [oldIds]);
      console.log('Removed obsolete department records.');
    }

    console.log('Successfully updated departments table!');
  } catch (e) {
    console.error('Error updating departments:', e.message);
  } finally {
    await connection.end();
  }
}

run();
