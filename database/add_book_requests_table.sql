-- Run this in MySQL Workbench or your MySQL client against lumina_lms
USE lumina_lms;

CREATE TABLE IF NOT EXISTS book_requests (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  book_id         INT UNSIGNED NULL COMMENT 'For borrow requests — existing book',
  title           VARCHAR(512) NULL COMMENT 'For acquisition requests — new book title',
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
) ENGINE=InnoDB;

CREATE INDEX idx_br_user   ON book_requests(user_id);
CREATE INDEX idx_br_book   ON book_requests(book_id);
CREATE INDEX idx_br_status ON book_requests(status);
