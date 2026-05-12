const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'lumina_lms',
    multipleStatements: true,
  });

  console.log('Connected to lumina_lms. Running migration...');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS book_requests (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id         INT UNSIGNED NOT NULL,
      book_id         INT UNSIGNED NULL,
      title           VARCHAR(512) NULL,
      author          VARCHAR(200) NULL,
      isbn            VARCHAR(20)  NULL,
      publisher       VARCHAR(200) NULL,
      request_type    ENUM('borrow','acquisition') NOT NULL DEFAULT 'borrow',
      reason          TEXT         NULL,
      status          ENUM('pending','approved','rejected','fulfilled') NOT NULL DEFAULT 'pending',
      librarian_id    INT UNSIGNED NULL,
      librarian_notes TEXT         NULL,
      processed_at    TIMESTAMP    NULL,
      created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_br_user      FOREIGN KEY (user_id)      REFERENCES users(id)  ON DELETE CASCADE,
      CONSTRAINT fk_br_book      FOREIGN KEY (book_id)      REFERENCES books(id)  ON DELETE SET NULL,
      CONSTRAINT fk_br_librarian FOREIGN KEY (librarian_id) REFERENCES users(id)  ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);

  console.log('✅ Table book_requests created (or already exists).');

  // Create indexes (ignore errors if they already exist)
  const indexes = [
    'CREATE INDEX idx_br_user   ON book_requests(user_id)',
    'CREATE INDEX idx_br_book   ON book_requests(book_id)',
    'CREATE INDEX idx_br_status ON book_requests(status)',
  ];

  for (const sql of indexes) {
    try {
      await conn.execute(sql);
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log(`  Index already exists, skipping.`);
      } else {
        throw e;
      }
    }
  }

  console.log('✅ Indexes ready.');
  await conn.end();
  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
