-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: lumina_lms
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `author_id` int unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_published` tinyint(1) NOT NULL DEFAULT '0',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_ann_author` (`author_id`),
  CONSTRAINT `fk_ann_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance_logs`
--

DROP TABLE IF EXISTS `attendance_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `entry_type` enum('entry','exit') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'entry',
  `scanned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `purpose` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'e.g., Study, Research, Borrowing',
  `remarks` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_att_user` (`user_id`),
  KEY `idx_att_scanned` (`scanned_at`),
  CONSTRAINT `fk_att_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance_logs`
--

LOCK TABLES `attendance_logs` WRITE;
/*!40000 ALTER TABLE `attendance_logs` DISABLE KEYS */;
INSERT INTO `attendance_logs` VALUES (1,3,'entry','2026-05-05 01:10:36',NULL,NULL),(2,3,'exit','2026-05-05 01:10:50',NULL,NULL),(3,3,'entry','2026-05-05 01:36:33',NULL,NULL),(4,3,'exit','2026-05-05 01:36:56',NULL,NULL);
/*!40000 ALTER TABLE `attendance_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authors`
--

DROP TABLE IF EXISTS `authors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authors` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authors`
--

LOCK TABLES `authors` WRITE;
/*!40000 ALTER TABLE `authors` DISABLE KEYS */;
INSERT INTO `authors` VALUES (1,'Robert C. Martin',NULL,'2026-05-05 00:21:05'),(2,'Martin Fowler',NULL,'2026-05-05 00:21:05'),(3,'Eric Evans',NULL,'2026-05-05 00:21:05'),(4,'Andrew S. Tanenbaum',NULL,'2026-05-05 00:21:05'),(5,'Abraham Silberschatz',NULL,'2026-05-05 00:21:05'),(6,'Thomas H. Cormen',NULL,'2026-05-05 00:21:05'),(7,'José Rizal',NULL,'2026-05-05 00:21:05'),(8,'Nick Joaquin',NULL,'2026-05-05 00:21:05'),(9,'Ambeth R. Ocampo',NULL,'2026-05-05 00:21:05');
/*!40000 ALTER TABLE `authors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `book_authors`
--

DROP TABLE IF EXISTS `book_authors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_authors` (
  `book_id` int unsigned NOT NULL,
  `author_id` int unsigned NOT NULL,
  `role` enum('primary','co-author','editor','illustrator') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'primary',
  PRIMARY KEY (`book_id`,`author_id`),
  KEY `fk_ba_author` (`author_id`),
  CONSTRAINT `fk_ba_author` FOREIGN KEY (`author_id`) REFERENCES `authors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ba_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `book_authors`
--

LOCK TABLES `book_authors` WRITE;
/*!40000 ALTER TABLE `book_authors` DISABLE KEYS */;
INSERT INTO `book_authors` VALUES (1,1,'primary'),(2,2,'primary'),(3,4,'primary'),(7,7,'primary'),(8,7,'primary'),(9,5,'primary'),(10,6,'primary');
/*!40000 ALTER TABLE `book_authors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `book_copies`
--

DROP TABLE IF EXISTS `book_copies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `book_copies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `book_id` int unsigned NOT NULL,
  `barcode` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Barcode sticker on physical book',
  `copy_condition` enum('new','good','fair','poor','damaged','lost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'good',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `barcode` (`barcode`),
  KEY `idx_copies_book` (`book_id`),
  KEY `idx_copies_barcode` (`barcode`),
  CONSTRAINT `fk_copies_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `book_copies`
--

LOCK TABLES `book_copies` WRITE;
/*!40000 ALTER TABLE `book_copies` DISABLE KEYS */;
INSERT INTO `book_copies` VALUES (1,1,'BC-001-A','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(2,1,'BC-001-B','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(3,2,'BC-002-A','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(4,2,'BC-002-B','fair',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(5,7,'BC-007-A','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(6,7,'BC-007-B','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(7,7,'BC-007-C','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(8,9,'BC-009-A','new',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(9,9,'BC-009-B','new',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(10,10,'BC-010-A','good',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(11,10,'BC-010-B','fair',1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(12,11,'BC-0011-A','good',1,'2026-05-05 01:46:53','2026-05-05 01:46:53');
/*!40000 ALTER TABLE `book_copies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `books`
--

DROP TABLE IF EXISTS `books`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `books` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `isbn` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `call_number` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Dewey Decimal or LC call number',
  `title` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `edition` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publisher` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `publish_year` smallint DEFAULT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `language` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'English',
  `description` text COLLATE utf8mb4_unicode_ci,
  `cover_image_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_copies` smallint unsigned NOT NULL DEFAULT '1',
  `available_copies` smallint unsigned NOT NULL DEFAULT '1',
  `location_shelf` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Physical shelf/room location',
  `is_reference_only` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Cannot be borrowed',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `isbn` (`isbn`),
  UNIQUE KEY `call_number` (`call_number`),
  KEY `idx_books_category` (`category_id`),
  KEY `idx_books_available` (`available_copies`),
  KEY `idx_books_isbn` (`isbn`),
  FULLTEXT KEY `ft_books_search` (`title`,`description`),
  CONSTRAINT `fk_books_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `books`
--

LOCK TABLES `books` WRITE;
/*!40000 ALTER TABLE `books` DISABLE KEYS */;
INSERT INTO `books` VALUES (1,'978-0132350884','QA76.73.C15 MAR','Clean Code: A Handbook of Agile Software Craftsmanship','1st','Prentice Hall',2008,4,'English','A guide to writing clean, maintainable code.',NULL,3,3,'Shelf A-1',0,1,'2026-05-05 00:21:05','2026-05-05 01:41:09'),(2,'978-0201633610','QA76.9.O35 GOF','Design Patterns: Elements of Reusable Object-Oriented Software','1st','Addison-Wesley',1994,4,'English','The classic Gang of Four design patterns book.',NULL,2,2,'Shelf A-1',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(3,'978-0131103627','QA76.73.C15 KER','The C Programming Language','2nd','Prentice Hall',1988,4,'English','The definitive reference for the C programming language.',NULL,4,4,'Shelf A-2',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(4,'978-0596009205','QA76.73.J39 FLA','JavaScript: The Definitive Guide','5th','O\'Reilly Media',2006,4,'English','Comprehensive guide to JavaScript programming.',NULL,2,2,'Shelf A-2',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(5,'978-0451524935','PR6068.I3 OR','1984','Centennial','Signet Classics',1949,2,'English','Dystopian novel by George Orwell.',NULL,3,3,'Shelf B-1',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(6,'978-0316769174','PS3558.A824 CAT','The Catcher in the Rye','1st','Little, Brown',1951,2,'English','Coming-of-age novel by J.D. Salinger.',NULL,2,2,'Shelf B-1',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(7,'978-971-10-1367-2','PQ7797.R5 N6','Noli Me Tangere','Centennial','Anvil Publishing',1887,12,'English','Classic Philippine novel by José Rizal.',NULL,5,5,'Filipiniana Shelf',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(8,'978-971-27-1345-6','PQ7797.R5 EL','El Filibusterismo','Centennial','Anvil Publishing',1891,12,'English','Sequel to Noli Me Tangere by José Rizal.',NULL,5,5,'Filipiniana Shelf',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(9,'978-0-07-110559-3','QA76.54 SIL','Operating System Concepts','10th','McGraw Hill',2018,4,'English','Comprehensive OS textbook.',NULL,6,6,'Shelf A-3',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(10,'978-0-07-338483-6','QA164 COR','Introduction to Algorithms','3rd','MIT Press',2009,6,'English','Definitive algorithm textbook by CLRS.',NULL,4,4,'Shelf C-1',0,1,'2026-05-05 00:21:05','2026-05-05 00:21:05'),(11,'test','12312','test','wrwerwe','asdsaf',2026,10,'English','asdasd',NULL,1,0,'23',0,1,'2026-05-05 01:46:53','2026-05-05 01:50:51');
/*!40000 ALTER TABLE `books` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Reference',NULL,'2026-05-05 00:21:05'),(2,'Fiction',NULL,'2026-05-05 00:21:05'),(3,'Non-Fiction',NULL,'2026-05-05 00:21:05'),(4,'Science & Technology',NULL,'2026-05-05 00:21:05'),(5,'History',NULL,'2026-05-05 00:21:05'),(6,'Mathematics',NULL,'2026-05-05 00:21:05'),(7,'Literature',NULL,'2026-05-05 00:21:05'),(8,'Social Sciences',NULL,'2026-05-05 00:21:05'),(9,'Law & Jurisprudence',NULL,'2026-05-05 00:21:05'),(10,'Health & Medicine',NULL,'2026-05-05 00:21:05'),(11,'Thesis / Dissertation',NULL,'2026-05-05 00:21:05'),(12,'Periodicals',NULL,'2026-05-05 00:21:05'),(13,'Filipiniana',NULL,'2026-05-05 00:21:05');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,'College of Computer Studies','CCS','2026-05-05 00:21:05','2026-05-05 00:21:05'),(2,'College of Engineering','COE','2026-05-05 00:21:05','2026-05-05 00:21:05'),(3,'College of Business','COB','2026-05-05 00:21:05','2026-05-05 00:21:05'),(4,'College of Arts and Sciences','CAS','2026-05-05 00:21:05','2026-05-05 00:21:05'),(5,'College of Nursing','CON','2026-05-05 00:21:05','2026-05-05 00:21:05'),(6,'College of Education','CED','2026-05-05 00:21:05','2026-05-05 00:21:05'),(7,'Library Staff','LIB','2026-05-05 00:21:05','2026-05-05 00:21:05');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `overdue_sanction_logs`
--

DROP TABLE IF EXISTS `overdue_sanction_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overdue_sanction_logs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `action_taken` enum('flagged_overdue','suspended','fine_calculated','reminder_sent') COLLATE utf8mb4_unicode_ci NOT NULL,
  `previous_status` enum('eligible','suspended','expelled') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` enum('eligible','suspended','expelled') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fine_amount` decimal(8,2) DEFAULT NULL,
  `processed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_osl_user` (`user_id`),
  KEY `idx_osl_tx` (`transaction_id`),
  CONSTRAINT `fk_osl_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_osl_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overdue_sanction_logs`
--

LOCK TABLES `overdue_sanction_logs` WRITE;
/*!40000 ALTER TABLE `overdue_sanction_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `overdue_sanction_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `book_id` int unsigned NOT NULL,
  `reserved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `status` enum('pending','fulfilled','cancelled','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `idx_res_user` (`user_id`),
  KEY `idx_res_book` (`book_id`),
  KEY `idx_res_status` (`status`),
  CONSTRAINT `fk_res_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `book_copy_id` int unsigned NOT NULL,
  `librarian_id` int unsigned DEFAULT NULL COMMENT 'Staff who processed the transaction',
  `transaction_type` enum('checkout','return','renewal','lost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'checkout',
  `checkout_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` date NOT NULL,
  `return_date` timestamp NULL DEFAULT NULL,
  `renewal_count` tinyint unsigned NOT NULL DEFAULT '0',
  `overdue_days` smallint unsigned NOT NULL DEFAULT '0',
  `fine_amount` decimal(8,2) NOT NULL DEFAULT '0.00' COMMENT 'PHP, ₱5/day default',
  `fine_paid` tinyint(1) NOT NULL DEFAULT '0',
  `fine_paid_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','returned','overdue','lost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tx_librarian` (`librarian_id`),
  KEY `idx_tx_user` (`user_id`),
  KEY `idx_tx_copy` (`book_copy_id`),
  KEY `idx_tx_status` (`status`),
  KEY `idx_tx_due_date` (`due_date`),
  CONSTRAINT `fk_tx_copy` FOREIGN KEY (`book_copy_id`) REFERENCES `book_copies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tx_librarian` FOREIGN KEY (`librarian_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,3,1,2,'return','2026-05-05 01:39:55','2026-06-26','2026-05-05 01:40:23',0,0,0.00,0,NULL,'returned','','2026-05-05 01:39:55','2026-05-05 01:40:22'),(2,3,1,2,'return','2026-05-05 01:40:45','2026-06-26','2026-05-05 01:41:09',0,0,0.00,0,NULL,'returned','','2026-05-05 01:40:45','2026-05-05 01:41:09'),(3,3,12,2,'checkout','2026-05-05 01:50:51','2026-06-26',NULL,0,0,0.00,0,NULL,'active','','2026-05-05 01:50:51','2026-05-05 01:50:51');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `institutional_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Student/Faculty ID or employee number',
  `barcode` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Barcode printed on ID card',
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `middle_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('student','faculty','librarian','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `department_id` int unsigned DEFAULT NULL,
  `year_level` tinyint unsigned DEFAULT NULL COMMENT 'For students only (1-6)',
  `section` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_photo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eligibility_status` enum('eligible','suspended','expelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'eligible',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `institutional_id` (`institutional_id`),
  UNIQUE KEY `barcode` (`barcode`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_dept` (`department_id`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_eligibility` (`eligibility_status`),
  KEY `idx_users_barcode` (`barcode`),
  CONSTRAINT `fk_users_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'ADM-0001','USR-ADM-0001','admin@lumina.edu.ph','$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa','System','Administrator',NULL,'admin',7,NULL,NULL,NULL,'eligible',1,'2026-05-05 00:43:35','2026-05-05 00:21:05','2026-05-05 00:43:35'),(2,'LIB-0001','USR-LIB-0001','librarian@lumina.edu.ph','$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa','Maria','Santos',NULL,'librarian',7,NULL,NULL,NULL,'eligible',1,'2026-05-05 00:54:23','2026-05-05 00:21:05','2026-05-05 00:54:23'),(3,'2024-CCS-001','USR-STU-001','juan.delacruz@student.edu.ph','$2b$10$QKOzNp9HWOmHE4f06E/JluANeS5kxXuy8TrrM.7AIesVjOkaDCwSa','Juan','Dela Cruz',NULL,'student',1,NULL,NULL,NULL,'eligible',1,'2026-05-05 01:05:58','2026-05-05 00:21:05','2026-05-05 01:41:09');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-05  9:51:48
