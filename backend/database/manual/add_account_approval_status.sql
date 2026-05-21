-- Run once against your Lumina MySQL database (synchronize is off).
ALTER TABLE `users`
  ADD COLUMN `account_approval_status` ENUM('pending', 'approved', 'rejected')
    NOT NULL DEFAULT 'approved'
    AFTER `is_active`;
