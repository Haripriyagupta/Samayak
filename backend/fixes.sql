-- ═══════════════════════════════════════════════════════════════
-- Samayak — Bug Fix SQL (Compatible with all MySQL versions)
-- Usage (Windows): cmd /c "mysql -u root -p samayak_db < fixes.sql"
-- ═══════════════════════════════════════════════════════════════

USE samayak_db;

-- ─────────────────────────────────────────────
-- FIX 1: Add real CSIT subjects for Semesters 4–8
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Database Management Systems',        'DBMS',   'CSIT', 4, 4),
  ('Analysis & Design of Algorithms',    'ADA',    'CSIT', 4, 4),
  ('Analog & Digital Communication',     'ADC',    'CSIT', 4, 3),
  ('Data Communication Systems',         'DCS',    'CSIT', 4, 3),
  ('Mathematics III',                    'M3',     'CSIT', 4, 4),
  ('.NET Technologies',                  'DOTNET', 'CSIT', 4, 4),
  ('Software Engineering',               'SE',     'CSIT', 4, 3),
  ('Theory of Computation',              'TOC',    'CSIT', 5, 4),
  ('Computer Graphics',                  'CG',     'CSIT', 5, 3),
  ('Microprocessor & Interfacing',       'MPI',    'CSIT', 5, 3),
  ('Web Technologies',                   'WT',     'CSIT', 5, 4),
  ('Python Programming',                 'PYTHON', 'CSIT', 5, 3),
  ('Compiler Design',                    'CD',     'CSIT', 5, 4),
  ('Machine Learning',                   'ML',     'CSIT', 6, 4),
  ('Mobile Application Development',     'MAD',    'CSIT', 6, 4),
  ('Cloud Computing',                    'CC',     'CSIT', 6, 3),
  ('Information Security',               'IS',     'CSIT', 6, 3),
  ('Big Data Analytics',                 'BDA',    'CSIT', 6, 4),
  ('Distributed Systems',                'DS',     'CSIT', 6, 3),
  ('Artificial Intelligence',            'AI',     'CSIT', 7, 4),
  ('Internet of Things',                 'IOT',    'CSIT', 7, 3),
  ('Deep Learning',                      'DL',     'CSIT', 7, 4),
  ('Project Phase I',                    'PROJ1',  'CSIT', 7, 4),
  ('Blockchain Technology',              'BT',     'CSIT', 7, 3),
  ('Project Phase II',                   'PROJ2',  'CSIT', 8, 6),
  ('Seminar',                            'SEM',    'CSIT', 8, 2),
  ('Entrepreneurship Development',       'ED',     'CSIT', 8, 3);

-- ─────────────────────────────────────────────
-- FIX 2: Add columns to timetable (safe for all MySQL versions)
-- ─────────────────────────────────────────────

SET @col1 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='samayak_db' AND TABLE_NAME='timetable' AND COLUMN_NAME='image_path');
SET @sql1 = IF(@col1=0,
  'ALTER TABLE timetable ADD COLUMN image_path VARCHAR(500) DEFAULT NULL',
  'SELECT 1');
PREPARE s1 FROM @sql1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @col2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='samayak_db' AND TABLE_NAME='timetable' AND COLUMN_NAME='image_name');
SET @sql2 = IF(@col2=0,
  'ALTER TABLE timetable ADD COLUMN image_name VARCHAR(255) DEFAULT NULL',
  'SELECT 1');
PREPARE s2 FROM @sql2; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @col3 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='samayak_db' AND TABLE_NAME='timetable' AND COLUMN_NAME='upload_mode');
SET @sql3 = IF(@col3=0,
  "ALTER TABLE timetable ADD COLUMN upload_mode ENUM('grid','image') NOT NULL DEFAULT 'grid'",
  'SELECT 1');
PREPARE s3 FROM @sql3; EXECUTE s3; DEALLOCATE PREPARE s3;

-- ─────────────────────────────────────────────
-- FIX 3: Correction requests table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS correction_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT          NOT NULL,
  type            ENUM('attendance','marks','timetable','other') NOT NULL,
  subject_id      INT          DEFAULT NULL,
  exam_type       VARCHAR(30)  DEFAULT NULL,
  description     TEXT         NOT NULL,
  current_value   VARCHAR(200) DEFAULT NULL,
  requested_value VARCHAR(200) DEFAULT NULL,
  status          ENUM('pending','reviewed','resolved','rejected') NOT NULL DEFAULT 'pending',
  faculty_response TEXT        DEFAULT NULL,
  resolved_by     INT          DEFAULT NULL,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (resolved_by) REFERENCES faculty(id)
);

-- ─────────────────────────────────────────────
-- FIX 4: User settings table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_email          VARCHAR(100) NOT NULL UNIQUE,
  role                ENUM('student','faculty') NOT NULL,
  theme               ENUM('light','dark') NOT NULL DEFAULT 'light',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  language            VARCHAR(10) NOT NULL DEFAULT 'en',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- FIX 5: Class strength view
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW class_strength AS
SELECT
  s.branch,
  s.semester,
  COUNT(*) AS total_registered,
  COUNT(DISTINCT al.user_email) AS ever_logged_in
FROM students s
LEFT JOIN activity_log al
  ON al.user_email = s.college_email
  AND al.role = 'student'
  AND al.action = 'login'
GROUP BY s.branch, s.semester;

-- ─────────────────────────────────────────────
-- Confirmation check
-- ─────────────────────────────────────────────
SELECT CONCAT('Subjects for Sem 4+: ', COUNT(*), ' rows added') AS result
FROM subjects WHERE semester >= 4;

SELECT CONCAT('Total tables: ', COUNT(*)) AS result
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'samayak_db';
