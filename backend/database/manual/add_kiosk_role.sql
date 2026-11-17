-- Run once against your Lumina MySQL database (synchronize is off).
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('student', 'faculty', 'librarian', 'chief_librarian', 'admin', 'kiosk')
    NOT NULL DEFAULT 'student';

-- Seed default entrance/exit kiosk account if not exists
INSERT IGNORE INTO `users` (
  `institutional_id`, `barcode`, `email`, `password_hash`,
  `first_name`, `last_name`, `role`, `eligibility_status`,
  `account_approval_status`, `is_active`
) VALUES (
  'KSK-0001', 'LUM-KIOSK01', 'kiosk@lumina.edu.ph',
  -- Default password is Kiosk@1234
  '$2b$10$wT8mQyQ8Gz3bVlZ.Fsmr0uYhOq3nS6mU3h1f6186VwYxWz2gW8JCe',
  'Entry/Exit', 'Kiosk', 'kiosk', 'eligible',
  'approved', 1
);

