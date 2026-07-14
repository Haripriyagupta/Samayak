-- ═══════════════════════════════════════════════════════════════
-- Samayak — Complete RGPV Subject List
-- Replaces all existing subjects with real RGPV codes
-- Usage (Windows): cmd /c "mysql -u root -p samayak_db < rgpv_subjects.sql"
-- ═══════════════════════════════════════════════════════════════

USE samayak_db;

-- Clear old placeholder subjects (keeps any faculty-added ones)
DELETE FROM subjects WHERE code IN (
  'MA101','PH101','CS101','ME101','HU101',
  'MA201','CS201','CS202','CS203','HU201',
  'MA301','CS301','CS302','CS303','CS304',
  'DBMS','ADA','ADC','DCS','M3','DOTNET','SE',
  'TOC','CG','MPI','WT','PYTHON','CD',
  'ML','MAD','CC','IS','BDA','DS',
  'AI','IOT','DL','PROJ1','BT',
  'PROJ2','SEM','ED'
);

-- ─────────────────────────────────────────────
-- SEMESTER 1 — First Year (All Branches)
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Engineering Chemistry',                    'BT101', 'CSIT', 1, 4),
  ('Mathematics I',                            'BT102', 'CSIT', 1, 4),
  ('English for Communication',                'BT103', 'CSIT', 1, 2),
  ('Basic Electrical & Electronics Engg',      'BT104', 'CSIT', 1, 4),
  ('Engineering Graphics',                     'BT105', 'CSIT', 1, 2);

-- ─────────────────────────────────────────────
-- SEMESTER 2 — First Year (All Branches)
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Engineering Physics',                      'BT201', 'CSIT', 2, 4),
  ('Mathematics II',                           'BT202', 'CSIT', 2, 4),
  ('Basic Computer Engineering',               'BT203', 'CSIT', 2, 3),
  ('Basic Mechanical Engineering',             'BT204', 'CSIT', 2, 3),
  ('Engineering Workshop',                     'BT205', 'CSIT', 2, 2);

-- ─────────────────────────────────────────────
-- SEMESTER 3 — CSIT Core
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Discrete Structures',                      'CS301', 'CSIT', 3, 4),
  ('Object Oriented Programming',              'CS302', 'CSIT', 3, 4),
  ('Data Structures',                          'CS303', 'CSIT', 3, 4),
  ('Digital Systems',                          'CS304', 'CSIT', 3, 3),
  ('Linux & Shell Programming',                'CS305', 'CSIT', 3, 2);

-- ─────────────────────────────────────────────
-- SEMESTER 4 — CSIT Core
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Computer Organization & Architecture',     'CS401', 'CSIT', 4, 4),
  ('Analysis & Design of Algorithms',          'CS402', 'CSIT', 4, 4),
  ('Software Engineering & Project Mgmt',      'CS403', 'CSIT', 4, 3),
  ('Database Management Systems',              'CS404', 'CSIT', 4, 4),
  ('Operating Systems',                        'CS405', 'CSIT', 4, 4);

-- Also add CSIT402 alias for compatibility with uploaded Excel files
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Analysis & Design of Algorithms (CSIT)',   'CSIT402', 'CSIT', 4, 4);

-- ─────────────────────────────────────────────
-- SEMESTER 5 — CSIT Core
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Theory of Computation',                    'CS501', 'CSIT', 5, 4),
  ('Relational Database Management Systems',   'CS502', 'CSIT', 5, 4),
  ('Computer Networks',                        'CS503', 'CSIT', 5, 4),
  ('Microprocessor & Interfacing',             'CS504', 'CSIT', 5, 3),
  ('Web Technologies',                         'CS505', 'CSIT', 5, 3);

-- ─────────────────────────────────────────────
-- SEMESTER 6 — CSIT Core + Electives
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Machine Learning',                         'CS601', 'CSIT', 6, 4),
  ('Computer Networks (Advanced)',             'CS602', 'CSIT', 6, 4),
  ('Compiler Design',                          'CS603', 'CSIT', 6, 4),
  ('Open Elective',                            'CSIT604','CSIT', 6, 3),
  ('Cryptography & Network Security',          'CS605', 'CSIT', 6, 3);

-- ─────────────────────────────────────────────
-- SEMESTER 7 — Final Year
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Artificial Intelligence',                  'CS701', 'CSIT', 7, 4),
  ('Mobile Application Development',           'CS702', 'CSIT', 7, 4),
  ('Cloud Computing',                          'CS703', 'CSIT', 7, 3),
  ('Project Phase I',                          'CS704', 'CSIT', 7, 4),
  ('Seminar',                                  'CS705', 'CSIT', 7, 2);

-- ─────────────────────────────────────────────
-- SEMESTER 8 — Final Year
-- ─────────────────────────────────────────────
INSERT IGNORE INTO subjects (name, code, branch, semester, credits) VALUES
  ('Data Science',                             'CSIT801','CSIT', 8, 4),
  ('Departmental Elective',                    'CS802', 'CSIT', 8, 4),
  ('Project Phase II',                         'CS803', 'CSIT', 8, 6),
  ('Blockchain Technology',                    'CS804', 'CSIT', 8, 3),
  ('Web & Information Retrieval',              'CS805', 'CSIT', 8, 3);

-- ─────────────────────────────────────────────
-- Verify — show all subjects grouped by semester
-- ─────────────────────────────────────────────
SELECT semester, code, name
FROM subjects
WHERE branch = 'CSIT'
ORDER BY semester, code;
