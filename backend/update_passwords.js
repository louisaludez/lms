const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'lumina_lms'
  });

  const hash = await bcrypt.hash('admin123', 10);

  // Update all users' passwords
  await connection.execute('UPDATE users SET password_hash = ?', [hash]);
  
  console.log('Successfully reset all users passwords to: admin123');
  await connection.end();
}
run().catch(console.error);
