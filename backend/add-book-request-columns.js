const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lumina_lms',
    });

    console.log('Connected to MySQL database...');

    const columns = [
      "ALTER TABLE `book_requests` ADD COLUMN `item_type` VARCHAR(100) NOT NULL DEFAULT 'BOOKS'",
      "ALTER TABLE `book_requests` ADD COLUMN `other_title` VARCHAR(512) NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `issn` VARCHAR(50) NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `call_number` VARCHAR(100) NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `edition` VARCHAR(100) NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `publish_year` INT NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `category_id` INT UNSIGNED NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `language` VARCHAR(50) NULL DEFAULT 'English'",
      "ALTER TABLE `book_requests` ADD COLUMN `description` TEXT NULL",
      "ALTER TABLE `book_requests` ADD COLUMN `location_shelf` VARCHAR(100) NULL",
    ];

    for (const sql of columns) {
      try {
        await conn.query(sql);
        console.log('Executed:', sql);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists:', err.sqlMessage);
        } else {
          console.error('Error executing query:', err.message);
        }
      }
    }

    try {
      await conn.query("ALTER TABLE `book_requests` ADD CONSTRAINT `FK_book_requests_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL");
      console.log('Added foreign key FK_book_requests_category');
    } catch (err) {
      console.log('FK note:', err.message);
    }

    console.log('Migration finished successfully!');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
