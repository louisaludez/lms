-- =============================================================
-- LUMINA Library Management System
-- MySQL Schema - Compatible with MySQL Workbench 8.0+
-- =============================================================

CREATE DATABASE IF NOT EXISTS lumina_lms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lumina_lms;

-- -------------------------------------------------------------
-- 1. DEPARTMENTS
-- -------------------------------------------------------------
CREATE TABLE departments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO departments (name, code) VALUES
  ('College of Computer Studies',  'CCS'),
  ('College of Engineering',        'COE'),
  ('College of Business',           'COB'),
  ('College of Arts and Sciences',  'CAS'),
  ('College of Nursing',            'CON'),
  ('College of Education',          'CED'),
  ('Library Staff',                 'LIB');

-- -------------------------------------------------------------
-- 2. USERS
-- -------------------------------------------------------------
CREATE TABLE users (
  id                 INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  institutional_id   VARCHAR(30)     NOT NULL UNIQUE COMMENT 'Student/Faculty ID or employee number',
  barcode            VARCHAR(60)     NOT NULL UNIQUE COMMENT 'Barcode printed on ID card',
  email              VARCHAR(180)    NOT NULL UNIQUE,
  password_hash      VARCHAR(255)    NOT NULL,
  first_name         VARCHAR(80)     NOT NULL,
  last_name          VARCHAR(80)     NOT NULL,
  middle_name        VARCHAR(80)     NULL,
  role               ENUM('student','faculty','librarian','admin') NOT NULL DEFAULT 'student',
  department_id      INT UNSIGNED    NULL,
  year_level         TINYINT UNSIGNED NULL COMMENT 'For students only (1-6)',
  section            VARCHAR(20)     NULL,
  profile_photo_url  VARCHAR(512)    NULL,
  eligibility_status ENUM('eligible','suspended','expelled') NOT NULL DEFAULT 'eligible',
  is_active          TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at      TIMESTAMP       NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_users_role          ON users(role);
CREATE INDEX idx_users_eligibility   ON users(eligibility_status);
CREATE INDEX idx_users_barcode       ON users(barcode);

-- -------------------------------------------------------------
-- 3. BOOK CATEGORIES / GENRES
-- -------------------------------------------------------------
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO categories (name) VALUES
  ('Reference'),('Fiction'),('Non-Fiction'),('Science & Technology'),
  ('History'),('Mathematics'),('Literature'),('Social Sciences'),
  ('Law & Jurisprudence'),('Health & Medicine'),('Thesis / Dissertation'),
  ('Periodicals'),('Filipiniana');

-- -------------------------------------------------------------
-- 4. AUTHORS
-- -------------------------------------------------------------
CREATE TABLE authors (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(200) NOT NULL,
  bio         TEXT         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 5. BOOKS (Catalogue)
-- -------------------------------------------------------------
CREATE TABLE books (
  id                 INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  isbn               VARCHAR(20)     NOT NULL UNIQUE,
  call_number        VARCHAR(60)     NOT NULL UNIQUE COMMENT 'Dewey Decimal or LC call number',
  title              VARCHAR(512)    NOT NULL,
  edition            VARCHAR(30)     NULL,
  publisher          VARCHAR(200)    NULL,
  publish_year       SMALLINT        NULL,
  category_id        INT UNSIGNED    NULL,
  language           VARCHAR(50)     NOT NULL DEFAULT 'English',
  description        TEXT            NULL,
  cover_image_url    VARCHAR(512)    NULL,
  total_copies       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  available_copies   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  location_shelf     VARCHAR(80)     NULL COMMENT 'Physical shelf/room location',
  is_reference_only  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT 'Cannot be borrowed',
  is_active          TINYINT(1)      NOT NULL DEFAULT 1,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE FULLTEXT INDEX ft_books_search ON books(title, description);
CREATE INDEX idx_books_category   ON books(category_id);
CREATE INDEX idx_books_available  ON books(available_copies);
CREATE INDEX idx_books_isbn       ON books(isbn);

-- -------------------------------------------------------------
-- 6. BOOK_AUTHORS (junction)
-- -------------------------------------------------------------
CREATE TABLE book_authors (
  book_id    INT UNSIGNED NOT NULL,
  author_id  INT UNSIGNED NOT NULL,
  role       ENUM('primary','co-author','editor','illustrator') NOT NULL DEFAULT 'primary',
  PRIMARY KEY (book_id, author_id),
  CONSTRAINT fk_ba_book   FOREIGN KEY (book_id)   REFERENCES books(id)   ON DELETE CASCADE,
  CONSTRAINT fk_ba_author FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 7. BOOK COPIES (individual physical items)
-- -------------------------------------------------------------
CREATE TABLE book_copies (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  book_id     INT UNSIGNED    NOT NULL,
  barcode     VARCHAR(60)     NOT NULL UNIQUE COMMENT 'Barcode sticker on physical book',
  copy_condition   ENUM('new','good','fair','poor','damaged','lost') NOT NULL DEFAULT 'good',
  is_active   TINYINT(1)      NOT NULL DEFAULT 1,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_copies_book    ON book_copies(book_id);
CREATE INDEX idx_copies_barcode ON book_copies(barcode);

-- -------------------------------------------------------------
-- 8. TRANSACTIONS (Borrowing / Returns)
-- -------------------------------------------------------------
CREATE TABLE transactions (
  id                 INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id            INT UNSIGNED    NOT NULL,
  book_copy_id       INT UNSIGNED    NOT NULL,
  librarian_id       INT UNSIGNED    NULL COMMENT 'Staff who processed the transaction',
  transaction_type   ENUM('checkout','return','renewal','lost') NOT NULL DEFAULT 'checkout',
  checkout_date      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date           DATE            NOT NULL,
  return_date        TIMESTAMP       NULL,
  renewal_count      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  overdue_days       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  fine_amount        DECIMAL(8,2)    NOT NULL DEFAULT 0.00 COMMENT 'PHP, ₱5/day default',
  fine_paid          TINYINT(1)      NOT NULL DEFAULT 0,
  fine_paid_at       TIMESTAMP       NULL,
  status             ENUM('active','returned','overdue','lost') NOT NULL DEFAULT 'active',
  notes              TEXT            NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_user       FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE RESTRICT,
  CONSTRAINT fk_tx_copy       FOREIGN KEY (book_copy_id)  REFERENCES book_copies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_tx_librarian  FOREIGN KEY (librarian_id)  REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_tx_user     ON transactions(user_id);
CREATE INDEX idx_tx_copy     ON transactions(book_copy_id);
CREATE INDEX idx_tx_status   ON transactions(status);
CREATE INDEX idx_tx_due_date ON transactions(due_date);

-- -------------------------------------------------------------
-- 9. ATTENDANCE LOGS
-- -------------------------------------------------------------
CREATE TABLE attendance_logs (
  id           INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED    NOT NULL,
  entry_type   ENUM('entry','exit') NOT NULL DEFAULT 'entry',
  scanned_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  purpose      VARCHAR(120)    NULL COMMENT 'e.g., Study, Research, Borrowing',
  remarks      VARCHAR(255)    NULL,
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_att_user      ON attendance_logs(user_id);
CREATE INDEX idx_att_scanned   ON attendance_logs(scanned_at);

-- -------------------------------------------------------------
-- 10. BOOK RESERVATIONS
-- -------------------------------------------------------------
CREATE TABLE reservations (
  id             INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED    NOT NULL,
  book_id        INT UNSIGNED    NOT NULL,
  reserved_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     TIMESTAMP       NOT NULL,
  status         ENUM('pending','fulfilled','cancelled','expired') NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_res_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_res_user   ON reservations(user_id);
CREATE INDEX idx_res_book   ON reservations(book_id);
CREATE INDEX idx_res_status ON reservations(status);

-- -------------------------------------------------------------
-- 11. ANNOUNCEMENTS
-- -------------------------------------------------------------
CREATE TABLE announcements (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id    INT UNSIGNED NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT         NOT NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 0,
  published_at TIMESTAMP    NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ann_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 12. OVERDUE SANCTION LOGS (audit trail for CRON)
-- -------------------------------------------------------------
CREATE TABLE overdue_sanction_logs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id  INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  action_taken    ENUM('flagged_overdue','suspended','fine_calculated','reminder_sent') NOT NULL,
  previous_status ENUM('eligible','suspended','expelled') NULL,
  new_status      ENUM('eligible','suspended','expelled') NULL,
  fine_amount     DECIMAL(8,2) NULL,
  processed_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes           TEXT         NULL,
  CONSTRAINT fk_osl_tx   FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_osl_user FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_osl_user ON overdue_sanction_logs(user_id);
CREATE INDEX idx_osl_tx   ON overdue_sanction_logs(transaction_id);

-- -------------------------------------------------------------
-- 13. BOOK REQUESTS (Faculty only)
-- -------------------------------------------------------------
CREATE TABLE book_requests (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  book_id         INT UNSIGNED NULL COMMENT 'If requesting to borrow existing book',
  title           VARCHAR(512) NULL COMMENT 'For new book acquisition requests',
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
  CONSTRAINT fk_br_librarian FOREIGN KEY (librarian_id)  REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_br_user   ON book_requests(user_id);
CREATE INDEX idx_br_book   ON book_requests(book_id);
CREATE INDEX idx_br_status ON book_requests(status);

-- =============================================================
-- SAMPLE SEED DATA
-- =============================================================

-- Seed Authors
INSERT INTO authors (full_name) VALUES
  ('Robert C. Martin'),
  ('Martin Fowler'),
  ('Eric Evans'),
  ('Andrew S. Tanenbaum'),
  ('Abraham Silberschatz'),
  ('Thomas H. Cormen'),
  ('José Rizal'),
  ('Nick Joaquin'),
  ('Ambeth R. Ocampo');

-- Seed Books
INSERT INTO books (isbn, call_number, title, edition, publisher, publish_year, category_id, description, total_copies, available_copies, location_shelf) VALUES
  ('978-0132350884','QA76.73.C15 MAR','Clean Code: A Handbook of Agile Software Craftsmanship','1st','Prentice Hall',2008,4,'A guide to writing clean, maintainable code.',3,3,'Shelf A-1'),
  ('978-0201633610','QA76.9.O35 GOF','Design Patterns: Elements of Reusable Object-Oriented Software','1st','Addison-Wesley',1994,4,'The classic Gang of Four design patterns book.',2,2,'Shelf A-1'),
  ('978-0131103627','QA76.73.C15 KER','The C Programming Language','2nd','Prentice Hall',1988,4,'The definitive reference for the C programming language.',4,4,'Shelf A-2'),
  ('978-0596009205','QA76.73.J39 FLA','JavaScript: The Definitive Guide','5th','O\'Reilly Media',2006,4,'Comprehensive guide to JavaScript programming.',2,2,'Shelf A-2'),
  ('978-0451524935','PR6068.I3 OR','1984','Centennial','Signet Classics',1949,2,'Dystopian novel by George Orwell.',3,3,'Shelf B-1'),
  ('978-0316769174','PS3558.A824 CAT','The Catcher in the Rye','1st','Little, Brown',1951,2,'Coming-of-age novel by J.D. Salinger.',2,2,'Shelf B-1'),
  ('978-971-10-1367-2','PQ7797.R5 N6','Noli Me Tangere','Centennial','Anvil Publishing',1887,12,'Classic Philippine novel by José Rizal.',5,5,'Filipiniana Shelf'),
  ('978-971-27-1345-6','PQ7797.R5 EL','El Filibusterismo','Centennial','Anvil Publishing',1891,12,'Sequel to Noli Me Tangere by José Rizal.',5,5,'Filipiniana Shelf'),
  ('978-0-07-110559-3','QA76.54 SIL','Operating System Concepts','10th','McGraw Hill',2018,4,'Comprehensive OS textbook.',6,6,'Shelf A-3'),
  ('978-0-07-338483-6','QA164 COR','Introduction to Algorithms','3rd','MIT Press',2009,6,'Definitive algorithm textbook by CLRS.',4,4,'Shelf C-1');

-- Seed book_authors
INSERT INTO book_authors (book_id, author_id, role) VALUES
  (1,1,'primary'),(2,2,'primary'),(9,5,'primary'),(10,6,'primary'),
  (7,7,'primary'),(8,7,'primary'),(3,4,'primary');

-- Seed copies (2 copies per book for demonstration)
INSERT INTO book_copies (book_id, barcode, copy_condition) VALUES
  (1,'BC-001-A','good'),(1,'BC-001-B','good'),
  (2,'BC-002-A','good'),(2,'BC-002-B','fair'),
  (7,'BC-007-A','good'),(7,'BC-007-B','good'),(7,'BC-007-C','good'),
  (9,'BC-009-A','new'),(9,'BC-009-B','new'),
  (10,'BC-010-A','good'),(10,'BC-010-B','fair');

-- Seed admin user (password: Admin@1234 — bcrypt hash placeholder)
INSERT INTO users (institutional_id, barcode, email, password_hash, first_name, last_name, role, department_id, eligibility_status) VALUES
  ('ADM-0001','USR-ADM-0001','admin@lumina.edu.ph','$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa','System','Administrator','admin',7,'eligible'),
  ('LIB-0001','USR-LIB-0001','librarian@lumina.edu.ph','$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa','Maria','Santos','librarian',7,'eligible'),
  ('2024-CCS-001','USR-STU-001','juan.delacruz@student.edu.ph','$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa','Juan','Dela Cruz','student',1,'eligible');
