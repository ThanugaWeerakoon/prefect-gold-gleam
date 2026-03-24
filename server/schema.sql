-- ACPG Prefect System Database Schema
-- MySQL database: acpg

CREATE DATABASE IF NOT EXISTS acpg;
USE acpg;

-- Academic years
CREATE TABLE IF NOT EXISTS academic_years (
  id          INT           PRIMARY KEY AUTO_INCREMENT,
  year        VARCHAR(9)    NOT NULL UNIQUE,
  is_current  BOOLEAN       NOT NULL DEFAULT FALSE
);

-- Batches linked to academic years
CREATE TABLE IF NOT EXISTS batches (
  id          INT           PRIMARY KEY AUTO_INCREMENT,
  name        ENUM('Trainee', 'Assistant', 'Junior') NOT NULL,
  year_id     INT           NOT NULL,
  FOREIGN KEY (year_id) REFERENCES academic_years(id),
  UNIQUE(name, year_id)
);

-- Prefects
CREATE TABLE IF NOT EXISTS prefects (
  id          VARCHAR(36)   PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  prefect_id  VARCHAR(20)   NOT NULL UNIQUE,
  batch_id    INT           NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- Duty records (year-scoped)
CREATE TABLE IF NOT EXISTS duty_records (
  id          VARCHAR(36)   PRIMARY KEY,
  prefect_id  VARCHAR(36)   NOT NULL,
  duty_type   ENUM('Attendance', 'Morning Duty', 'Evening Duty',
                   'Sign Off Session', 'Special Duty', 'Phones Caught') NOT NULL,
  points      INT           NOT NULL,
  date        DATE          NOT NULL,
  year_id     INT           NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prefect_id) REFERENCES prefects(id) ON DELETE CASCADE,
  FOREIGN KEY (year_id) REFERENCES academic_years(id)
);

-- Seed current academic year
INSERT IGNORE INTO academic_years (year, is_current) VALUES ('2025/2026', TRUE);

-- Seed batches for current year
INSERT IGNORE INTO batches (name, year_id) VALUES
  ('Trainee', (SELECT id FROM academic_years WHERE year = '2025/2026')),
  ('Assistant', (SELECT id FROM academic_years WHERE year = '2025/2026')),
  ('Junior', (SELECT id FROM academic_years WHERE year = '2025/2026'));
