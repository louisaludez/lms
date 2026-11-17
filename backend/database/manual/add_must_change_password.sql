-- Run once against your Lumina MySQL database (synchronize is off).
ALTER TABLE `users`
  ADD COLUMN `must_change_password` TINYINT(1)
    NOT NULL DEFAULT 0
    AFTER `account_approval_status`;

