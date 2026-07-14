-- ═══════════════════════════════════════════════════════
-- Samayak: Your CampusMitra — Database Schema
-- ═══════════════════════════════════════════════════════
-- Run this file in MySQL to set up the database from scratch.
-- Usage: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS samayak_db;
USE samayak_db;

-- ─────────────────────────────────────────────
-- STUDENTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(100)  NOT NULL,
  enrollment_no   VARCHAR(30)   NOT NULL UNIQUE,
  branch          VARCHAR(50)   NOT NULL DEFAULT 'CSIT',
  semester        TINYINT       NOT NULL,
  college_email   VARCHAR(100)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- FACULTY TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculty (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(100)  NOT NULL,
  department      VARCHAR(50)   NOT NULL DEFAULT 'CSIT',
  designation     VARCHAR(50)   NOT NULL,
  college_email   VARCHAR(100)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL,
  is_verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- OTP VERIFICATION TABLE
-- Used for both signup email verification & password reset
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(100)  NOT NULL,
  otp_code        VARCHAR(6)    NOT NULL,
  purpose         ENUM('signup', 'password_reset') NOT NULL,
  role            ENUM('student', 'faculty') NOT NULL,
  expires_at      TIMESTAMP     NOT NULL,
  is_used         BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
);

-- ─────────────────────────────────────────────
-- LOGIN ACTIVITY LOG (for accountability, mentioned in design)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_email      VARCHAR(100)  NOT NULL,
  role            ENUM('student', 'faculty') NOT NULL,
  action          ENUM('signup', 'login', 'login_failed', 'password_reset') NOT NULL,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- FACULTY VERIFICATION CODES
-- Pre-seeded codes the department distributes manually.
-- Demo code included below — change/add more as needed.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculty_verification_codes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30)   NOT NULL UNIQUE,
  is_used         BOOLEAN       NOT NULL DEFAULT FALSE,
  used_by_email   VARCHAR(100)  DEFAULT NULL,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Seed a demo faculty verification code for testing.
-- ⚠️ Change this / add real codes before real-world use.
INSERT INTO faculty_verification_codes (code) VALUES
  ('CSIT-FAC-2026'),
  ('CSIT-FAC-7741'),
  ('CSIT-FAC-9203');
