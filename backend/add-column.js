const mysql = require('mysql2/promise');
async function fix() {
  try {
    console.log('Connecting to db...');
    const conn = await mysql.createConnection({host:'localhost', user:'root', password:'123456789', database:'lumina_lms'});
    console.log('Adding column issn...');
    await conn.query('ALTER TABLE books ADD COLUMN issn VARCHAR(20) DEFAULT NULL;');
    console.log('Success!');
    await conn.end();
  } catch(e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists!');
    } else {
      console.error(e);
    }
  }
}
fix();
