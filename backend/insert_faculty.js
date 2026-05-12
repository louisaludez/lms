const mysql = require('mysql2/promise');

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'lumina_lms'
    });
    
    const [rows] = await connection.execute('SELECT * FROM users WHERE role = ?', ['faculty']);
    console.log('Faculty users:', rows);
    
    if (rows.length === 0) {
        await connection.execute(
            'INSERT INTO users (id, institutional_id, barcode, email, password_hash, first_name, last_name, role, department_id, eligibility_status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [4, 'FAC-0001', 'USR-FAC-0001', 'faculty@lumina.edu.ph', '$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa', 'Jane', 'Smith', 'faculty', 1, 'eligible', 1]
        );
        console.log('Inserted faculty user');
    }
    
    await connection.end();
  } catch (e) {
    console.error(e);
  }
}
run();
