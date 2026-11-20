const mysql = require('mysql2/promise');
require('dotenv').config();

async function normalizeItemType() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lumina_lms',
  });

  try {
    for (const table of ['books', 'book_requests']) {
      const [columns] = await connection.execute(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, 'item_type'],
      );
      if (columns.length === 0) {
        throw new Error(`The ${table}.item_type column does not exist`);
      }
    }

    const [booksResult] = await connection.execute(
      "UPDATE `books` SET `item_type` = 'Books' WHERE BINARY `item_type` = BINARY 'BOOKS'",
    );
    const [requestsResult] = await connection.execute(
      "UPDATE `book_requests` SET `item_type` = 'Books' WHERE BINARY `item_type` = BINARY 'BOOKS'",
    );

    await connection.execute(
      "ALTER TABLE `books` MODIFY COLUMN `item_type` VARCHAR(50) NOT NULL DEFAULT 'Books'",
    );
    await connection.execute(
      "ALTER TABLE `book_requests` MODIFY COLUMN `item_type` VARCHAR(100) NOT NULL DEFAULT 'Books'",
    );

    console.log(`Updated ${booksResult.affectedRows} book rows and ${requestsResult.affectedRows} request rows.`);
    console.log('Updated both item_type column defaults to Books.');
  } finally {
    await connection.end();
  }
}

normalizeItemType().catch(error => {
  console.error('Item type normalization failed:', error.message);
  process.exitCode = 1;
});
