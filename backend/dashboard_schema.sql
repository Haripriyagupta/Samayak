-- ═══════════════════════════════════════════════════════════════
-- Samayak — Student Dashboard Module: Additional Tables
-- Run this AFTER the original database.sql
-- Usage: mysql -u root -p samayak_db < dashboard_schema.sql
-- ═══════════════════════════════════════════════════════════════

USE samayak_db;

-- ─────────────────────────────────────────────
-- SUBJECTS  (master list per branch+semester)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(20)  NOT NULL,
  branch      VARCHAR(50)  NOT NULL DEFAULT 'CSIT',
  semester    TINYINT      NOT NULL,
  credits     TINYINT      NOT NULL DEFAULT 4,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_code_branch_sem (code, branch, semester)
);

-- Seed subjects for CSIT Semester 1 & 2
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Mathematics I',              'MA101', 'CSIT', 1, 4),
  ('Physics',                    'PH101', 'CSIT', 1, 3),
  ('Programming in C',           'CS101', 'CSIT', 1, 4),
  ('Engineering Drawing',        'ME101', 'CSIT', 1, 2),
  ('Communication Skills',       'HU101', 'CSIT', 1, 2),
  ('Mathematics II',             'MA201', 'CSIT', 2, 4),
  ('Data Structures',            'CS201', 'CSIT', 2, 4),
  ('Digital Electronics',        'CS202', 'CSIT', 2, 3),
  ('Object Oriented Programming','CS203', 'CSIT', 2, 4),
  ('Environmental Science',      'HU201', 'CSIT', 2, 2),
  ('Mathematics III',            'MA301', 'CSIT', 3, 4),
  ('Operating Systems',          'CS301', 'CSIT', 3, 4),
  ('Database Management Systems','CS302', 'CSIT', 3, 4),
  ('Computer Networks',          'CS303', 'CSIT', 3, 4),
  ('Discrete Mathematics',       'CS304', 'CSIT', 3, 3);

-- ─────────────────────────────────────────────
-- ATTENDANCE  (one row per student per subject)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT         NOT NULL,
  subject_id      INT         NOT NULL,
  total_classes   INT         NOT NULL DEFAULT 0,
  attended        INT         NOT NULL DEFAULT 0,
  percentage      DECIMAL(5,2) GENERATED ALWAYS AS
                    (IF(total_classes = 0, 0, (attended / total_classes) * 100)) STORED,
  uploaded_by     INT         NOT NULL COMMENT 'faculty.id',
  last_updated    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_student_subject (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ─────────────────────────────────────────────
-- MARKS  (MST + Internal per student per subject)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT         NOT NULL,
  subject_id      INT         NOT NULL,
  exam_type       ENUM('MST1','MST2','Internal','Practical','Assignment') NOT NULL,
  marks_obtained  DECIMAL(5,2) NOT NULL,
  max_marks       DECIMAL(5,2) NOT NULL,
  uploaded_by     INT         NOT NULL COMMENT 'faculty.id',
  last_updated    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_student_subject_exam (student_id, subject_id, exam_type),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ─────────────────────────────────────────────
-- TIMETABLE  (class schedule entries)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  branch      VARCHAR(50)  NOT NULL DEFAULT 'CSIT',
  semester    TINYINT      NOT NULL,
  section     VARCHAR(10)  NOT NULL DEFAULT 'CSIT-1',
  type        ENUM('Regular','MST','Practical','Special') NOT NULL DEFAULT 'Regular',
  day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  period_no   TINYINT      NOT NULL COMMENT '1-8',
  start_time  TIME         NOT NULL,
  end_time    TIME         NOT NULL,
  subject_id  INT,
  room        VARCHAR(30),
  uploaded_by INT          NOT NULL COMMENT 'faculty.id',
  effective_from DATE      NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ─────────────────────────────────────────────
-- NOTICES  (announcements from faculty)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  category    ENUM('General','Exam','Assignment','Holiday','Event','Urgent') NOT NULL DEFAULT 'General',
  branch      VARCHAR(50)  NOT NULL DEFAULT 'CSIT',
  semester    TINYINT      DEFAULT NULL COMMENT 'NULL = all semesters',
  posted_by   INT          NOT NULL COMMENT 'faculty.id',
  is_pinned   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES faculty(id)
);

-- ─────────────────────────────────────────────
-- SYLLABUS  (uploaded documents per subject)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syllabus (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  subject_id    INT          NOT NULL,
  title         VARCHAR(200) NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  file_size_kb  INT,
  uploaded_by   INT          NOT NULL COMMENT 'faculty.id',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (uploaded_by) REFERENCES faculty(id)
);

-- ─────────────────────────────────────────────
-- EXCEL UPLOAD LOG  (audit trail for every upload)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id    INT          NOT NULL,
  upload_type   ENUM('attendance','marks','timetable') NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  rows_processed INT         NOT NULL DEFAULT 0,
  rows_failed   INT         NOT NULL DEFAULT 0,
  status        ENUM('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
  error_log     TEXT,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id)
);
