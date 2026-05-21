const mysql = require('mysql2/promise');

async function fix() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'lumina_lms'
    });
    
    await conn.query(`ALTER TABLE users ADD COLUMN gender ENUM('Male', 'Female', 'Other') NULL;`).catch(e => console.log('gender error:', e.message));
    await conn.query(`ALTER TABLE books ADD COLUMN other_title VARCHAR(512) NULL;`).catch(e => console.log('otherTitle error:', e.message));
    await conn.query(`ALTER TABLE books CHANGE COLUMN title main_title VARCHAR(512) NOT NULL;`).catch(e => console.log('mainTitle error:', e.message));

    
    console.log('Fixed DB successfully');
    process.exit(0);
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
}

fix();
