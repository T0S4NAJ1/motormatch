CREATE DATABASE IF NOT EXISTS `motormatch_saw`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `motormatch_saw`;

CREATE TABLE IF NOT EXISTS `motors` (
  `id` INT UNSIGNED PRIMARY KEY,
  `brand` VARCHAR(50) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `year` SMALLINT UNSIGNED NOT NULL,
  `category` ENUM('Matic','Sport','Naked') NOT NULL,
  `cc` SMALLINT UNSIGNED NOT NULL,
  `power` DECIMAL(6,2) NOT NULL,
  `torque` DECIMAL(6,2) NOT NULL,
  `weight` SMALLINT UNSIGNED NOT NULL,
  `seat_h` SMALLINT UNSIGNED NOT NULL,
  `fuel_l` DECIMAL(4,2) NOT NULL,
  `harga` INT UNSIGNED NOT NULL,
  `bbm` DECIMAL(5,2) NOT NULL,
  `nyaman` TINYINT UNSIGNED NOT NULL,
  `bbm_tipe` ENUM('Pertalite','Pertamax','Pertamax Turbo') NOT NULL,
  `tinggi_min` TINYINT UNSIGNED NOT NULL,
  `fuel_level` TINYINT UNSIGNED NOT NULL,
  `img` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_brand` (`brand`),
  INDEX `idx_category` (`category`),
  INDEX `idx_harga` (`harga`),
  INDEX `idx_cc` (`cc`),
  INDEX `idx_bbm_tipe` (`bbm_tipe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(30) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role_id` TINYINT UNSIGNED NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX `idx_users_role` (`role_id`),
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX `idx_sessions_user` (`user_id`),
  INDEX `idx_sessions_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `roles` (`id`, `name`) VALUES
  (2, 'user');
