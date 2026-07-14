// controllers/facultyController.js
// All faculty-facing endpoints: upload Excel, post notices,
// manage timetable, upload syllabus, view activity.

const pool   = require('../config/db');
const xlsx   = require('xlsx');
const path   = require('path');
const fs     = require('fs');

// ─────────────────────────────────────────
// Helper: get faculty row from JWT
// ─────────────────────────────────────────
async function getFaculty(email) {
  const [rows] = await pool.query(
    'SELECT * FROM faculty WHERE college_email = ?', [email]
  );
  return rows[0] || null;
}

// ─────────────────────────────────────────
// Helper: map enrollment_no → student id
// ─────────────────────────────────────────
async function getStudentIdByEnrollment(enrollmentNo) {
  const [rows] = await pool.query(
    'SELECT id FROM students WHERE enrollment_no = ?', [enrollmentNo]
  );
  return rows[0] ? rows[0].id : null;
}

// ─────────────────────────────────────────
// Helper: get subject id by code
// ─────────────────────────────────────────
async function getSubjectId(code, semester) {
  const [rows] = await pool.query(
    'SELECT id FROM subjects WHERE code = ? AND semester = ?', [code, semester]
  );
  return rows[0] ? rows[0].id : null;
}

// ═══════════════════════════════════════════
// GET /api/faculty/profile
// ═══════════════════════════════════════════
exports.getProfile = async (req, res) => {
  try {
    const faculty = await getFaculty(req.user.email);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });
    const { password_hash, ...safe } = faculty;

    // Stats
    const [[attStats]]  = await pool.query('SELECT COUNT(*) AS total FROM upload_log WHERE faculty_id = ? AND upload_type = "attendance"', [faculty.id]);
    const [[noticeStats]] = await pool.query('SELECT COUNT(*) AS total FROM notices WHERE posted_by = ?', [faculty.id]);
    const [[markStats]] = await pool.query('SELECT COUNT(*) AS total FROM upload_log WHERE faculty_id = ? AND upload_type = "marks"', [faculty.id]);

    res.json({
      success: true,
      data: {
        profile: safe,
        stats: {
          attendance_uploads: attStats.total,
          marks_uploads: markStats.total,
          notices_posted: noticeStats.total
        }
      }
    });
  } catch (err) {
    console.error('faculty getProfile:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/upload/attendance
// Accepts: multipart Excel file
// Returns: preview rows (not saved yet)
// ═══════════════════════════════════════════
exports.previewAttendance = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const workbook  = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows      = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Excel file is empty.' });
    }

    // Validate required columns
    const required = ['Enrollment No', 'Subject Code', 'Total Classes', 'Attended'];
    const headers  = Object.keys(rows[0]);
    const missing  = required.filter(r => !headers.includes(r));
    if (missing.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Missing columns: ${missing.join(', ')}. Required: ${required.join(', ')}`
      });
    }

    // Preview: resolve enrollment → name, flag unknowns
    const preview = [];
    for (const row of rows.slice(0, 50)) { // max 50 preview rows
      const enrollmentNo = String(row['Enrollment No']).trim();
      const [students]   = await pool.query(
        'SELECT id, full_name FROM students WHERE enrollment_no = ?', [enrollmentNo]
      );
      preview.push({
        enrollment_no:  enrollmentNo,
        student_name:   students[0]?.full_name || '⚠ Not Found',
        found:          !!students[0],
        subject_code:   String(row['Subject Code']).trim(),
        total_classes:  Number(row['Total Classes']),
        attended:       Number(row['Attended']),
        percentage:     row['Total Classes'] > 0
                          ? ((row['Attended'] / row['Total Classes']) * 100).toFixed(1)
                          : 0
      });
    }

    // Store file path in session-like global for confirm step
    global.pendingUploads = global.pendingUploads || {};
    const uploadKey = `att_${req.user.email}_${Date.now()}`;
    global.pendingUploads[uploadKey] = {
      filePath:   req.file.path,
      type:       'attendance',
      totalRows:  rows.length,
      facultyEmail: req.user.email
    };

    res.json({
      success: true,
      message: `Preview ready. ${rows.length} rows found.`,
      uploadKey,
      preview,
      totalRows: rows.length
    });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    console.error('previewAttendance:', err);
    res.status(500).json({ success: false, message: 'Failed to parse Excel file.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/upload/attendance/confirm
// Saves the previewed data to database
// ═══════════════════════════════════════════
exports.confirmAttendance = async (req, res) => {
  const { uploadKey, semester } = req.body;
  try {
    const pending = (global.pendingUploads || {})[uploadKey];
    if (!pending) return res.status(400).json({ success: false, message: 'Upload session expired. Please re-upload.' });

    const faculty   = await getFaculty(req.user.email);
    const workbook  = xlsx.readFile(pending.filePath);
    const rows      = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let processed = 0, failed = 0;
    const errors  = [];

    for (const row of rows) {
      try {
        const enrollmentNo = String(row['Enrollment No']).trim();
        const subjectCode  = String(row['Subject Code']).trim();
        const totalClasses = Number(row['Total Classes']);
        const attended     = Number(row['Attended']);

        const studentId = await getStudentIdByEnrollment(enrollmentNo);
        if (!studentId) { failed++; errors.push(`${enrollmentNo}: student not found`); continue; }

        const subjectId = await getSubjectId(subjectCode, semester);
        if (!subjectId) { failed++; errors.push(`${subjectCode}: subject not found for sem ${semester}`); continue; }

        // UPSERT — insert or update if already exists
        await pool.query(
          `INSERT INTO attendance (student_id, subject_id, total_classes, attended, uploaded_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             total_classes = VALUES(total_classes),
             attended = VALUES(attended),
             uploaded_by = VALUES(uploaded_by)`,
          [studentId, subjectId, totalClasses, attended, faculty.id]
        );
        processed++;
      } catch (rowErr) {
        failed++;
        errors.push(`Row error: ${rowErr.message}`);
      }
    }

    // Log the upload
    await pool.query(
      `INSERT INTO upload_log (faculty_id, upload_type, file_name, rows_processed, rows_failed, status, error_log)
       VALUES (?, 'attendance', ?, ?, ?, 'confirmed', ?)`,
      [faculty.id, path.basename(pending.filePath), processed, failed, errors.slice(0,20).join('\n')]
    );

    // Cleanup
    fs.unlinkSync(pending.filePath);
    delete global.pendingUploads[uploadKey];

    res.json({
      success: true,
      message: `Done! ${processed} records saved, ${failed} skipped.`,
      processed, failed, errors: errors.slice(0, 10)
    });
  } catch (err) {
    console.error('confirmAttendance:', err);
    res.status(500).json({ success: false, message: 'Failed to save attendance data.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/upload/marks
// Preview marks Excel
// ═══════════════════════════════════════════
exports.previewMarks = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const workbook = xlsx.readFile(req.file.path);
    const rows     = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Excel file is empty.' });
    }

    const required = ['Enrollment No', 'Subject Code', 'Exam Type', 'Marks Obtained', 'Max Marks'];
    const headers  = Object.keys(rows[0]);
    const missing  = required.filter(r => !headers.includes(r));
    if (missing.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: `Missing columns: ${missing.join(', ')}` });
    }

    const validExamTypes = ['MST1','MST2','Internal','Practical','Assignment'];
    const preview = [];

    for (const row of rows.slice(0, 50)) {
      const enrollmentNo = String(row['Enrollment No']).trim();
      const examType     = String(row['Exam Type']).trim();
      const [students]   = await pool.query('SELECT id, full_name FROM students WHERE enrollment_no = ?', [enrollmentNo]);

      preview.push({
        enrollment_no:   enrollmentNo,
        student_name:    students[0]?.full_name || '⚠ Not Found',
        found:           !!students[0],
        subject_code:    String(row['Subject Code']).trim(),
        exam_type:       examType,
        exam_type_valid: validExamTypes.includes(examType),
        marks_obtained:  Number(row['Marks Obtained']),
        max_marks:       Number(row['Max Marks']),
        percentage:      row['Max Marks'] > 0
                           ? ((row['Marks Obtained'] / row['Max Marks']) * 100).toFixed(1)
                           : 0
      });
    }

    const uploadKey = `marks_${req.user.email}_${Date.now()}`;
    global.pendingUploads = global.pendingUploads || {};
    global.pendingUploads[uploadKey] = {
      filePath: req.file.path, type: 'marks',
      totalRows: rows.length, facultyEmail: req.user.email
    };

    res.json({ success: true, uploadKey, preview, totalRows: rows.length });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    console.error('previewMarks:', err);
    res.status(500).json({ success: false, message: 'Failed to parse Excel file.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/upload/marks/confirm
// ═══════════════════════════════════════════
exports.confirmMarks = async (req, res) => {
  const { uploadKey, semester } = req.body;
  try {
    const pending = (global.pendingUploads || {})[uploadKey];
    if (!pending) return res.status(400).json({ success: false, message: 'Upload session expired.' });

    const faculty  = await getFaculty(req.user.email);
    const workbook = xlsx.readFile(pending.filePath);
    const rows     = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    let processed = 0, failed = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const enrollmentNo   = String(row['Enrollment No']).trim();
        const subjectCode    = String(row['Subject Code']).trim();
        const examType       = String(row['Exam Type']).trim();
        const marksObtained  = Number(row['Marks Obtained']);
        const maxMarks       = Number(row['Max Marks']);

        const studentId = await getStudentIdByEnrollment(enrollmentNo);
        if (!studentId) { failed++; errors.push(`${enrollmentNo}: not found`); continue; }

        const subjectId = await getSubjectId(subjectCode, semester);
        if (!subjectId) { failed++; errors.push(`${subjectCode}: subject not found`); continue; }

        await pool.query(
          `INSERT INTO marks (student_id, subject_id, exam_type, marks_obtained, max_marks, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             marks_obtained = VALUES(marks_obtained),
             max_marks = VALUES(max_marks),
             uploaded_by = VALUES(uploaded_by)`,
          [studentId, subjectId, examType, marksObtained, maxMarks, faculty.id]
        );
        processed++;
      } catch (rowErr) {
        failed++;
        errors.push(rowErr.message);
      }
    }

    await pool.query(
      `INSERT INTO upload_log (faculty_id, upload_type, file_name, rows_processed, rows_failed, status, error_log)
       VALUES (?, 'marks', ?, ?, ?, 'confirmed', ?)`,
      [faculty.id, path.basename(pending.filePath), processed, failed, errors.slice(0,20).join('\n')]
    );

    fs.unlinkSync(pending.filePath);
    delete global.pendingUploads[uploadKey];

    res.json({ success: true, message: `${processed} marks saved, ${failed} skipped.`, processed, failed, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error('confirmMarks:', err);
    res.status(500).json({ success: false, message: 'Failed to save marks.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/notices
// Create a new notice
// ═══════════════════════════════════════════
exports.postNotice = async (req, res) => {
  try {
    const faculty = await getFaculty(req.user.email);
    const { title, body, category, semester, is_pinned } = req.body;

    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    const validCategories = ['General','Exam','Assignment','Holiday','Event','Urgent'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category.' });
    }

    const [result] = await pool.query(
      `INSERT INTO notices (title, body, category, branch, semester, posted_by, is_pinned)
       VALUES (?, ?, ?, 'CSIT', ?, ?, ?)`,
      [title.trim(), body.trim(), category, semester || null, faculty.id, is_pinned ? 1 : 0]
    );

    res.json({ success: true, message: 'Notice posted successfully.', noticeId: result.insertId });
  } catch (err) {
    console.error('postNotice:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/faculty/notices
// List notices posted by this faculty
// ═══════════════════════════════════════════
exports.getMyNotices = async (req, res) => {
  try {
    const faculty = await getFaculty(req.user.email);
    const [rows]  = await pool.query(
      `SELECT id, title, category, semester, is_pinned, created_at
       FROM notices WHERE posted_by = ?
       ORDER BY created_at DESC`,
      [faculty.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// DELETE /api/faculty/notices/:id
// ═══════════════════════════════════════════
exports.deleteNotice = async (req, res) => {
  try {
    const faculty = await getFaculty(req.user.email);
    const [result] = await pool.query(
      'DELETE FROM notices WHERE id = ? AND posted_by = ?',
      [req.params.id, faculty.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: 'Notice not found or not yours.' });

    res.json({ success: true, message: 'Notice deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/timetable
// Upload timetable (JSON body, not Excel)
// ═══════════════════════════════════════════
exports.postTimetable = async (req, res) => {
  try {
    const faculty  = await getFaculty(req.user.email);
    const { entries, type, semester, section, effective_from } = req.body;

    if (!entries?.length) return res.status(400).json({ success: false, message: 'No timetable entries provided.' });

    let inserted = 0;
    for (const e of entries) {
      const subjectId = e.subject_code ? await getSubjectId(e.subject_code, semester) : null;
      await pool.query(
        `INSERT INTO timetable (branch, semester, section, type, day_of_week, period_no, start_time, end_time, subject_id, room, uploaded_by, effective_from)
         VALUES ('CSIT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [semester, section || 'CSIT-1', type || 'Regular',
         e.day_of_week, e.period_no, e.start_time, e.end_time,
         subjectId, e.room || null, faculty.id, effective_from || new Date()]
      );
      inserted++;
    }

    res.json({ success: true, message: `${inserted} timetable entries saved.` });
  } catch (err) {
    console.error('postTimetable:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/upload/syllabus
// Upload a PDF/doc file for a subject
// ═══════════════════════════════════════════
exports.uploadSyllabus = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const faculty    = await getFaculty(req.user.email);
    const { subject_id, title } = req.body;

    if (!subject_id || !title?.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'subject_id and title are required.' });
    }

    const fileSizeKb = Math.round(req.file.size / 1024);

    await pool.query(
      `INSERT INTO syllabus (subject_id, title, file_name, file_path, file_size_kb, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subject_id, title.trim(), req.file.originalname, req.file.path, fileSizeKb, faculty.id]
    );

    res.json({ success: true, message: 'Syllabus uploaded successfully.' });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    console.error('uploadSyllabus:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/faculty/subjects
// Returns subjects for a given semester (for dropdowns)
// ═══════════════════════════════════════════
exports.getSubjects = async (req, res) => {
  try {
    const semester = req.query.semester;
    let sql  = 'SELECT id, name, code, semester, credits FROM subjects WHERE branch = "CSIT"';
    const params = [];
    if (semester) { sql += ' AND semester = ?'; params.push(semester); }
    sql += ' ORDER BY semester, name';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/subjects/add
// FIX 3: Faculty can add new subjects
// ═══════════════════════════════════════════
exports.addSubject = async (req, res) => {
  try {
    const { name, code, semester, credits, branch } = req.body;
    if (!name?.trim() || !code?.trim() || !semester) {
      return res.status(400).json({ success: false, message: 'Name, code and semester are required.' });
    }
    const codeUpper = code.trim().toUpperCase();

    // Check duplicate
    const [exists] = await pool.query(
      'SELECT id FROM subjects WHERE code = ? AND semester = ? AND branch = ?',
      [codeUpper, semester, branch || 'CSIT']
    );
    if (exists.length > 0) {
      return res.status(409).json({ success: false, message: `Subject code "${codeUpper}" already exists for Semester ${semester}.` });
    }

    const [result] = await pool.query(
      'INSERT INTO subjects (name, code, branch, semester, credits) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), codeUpper, branch || 'CSIT', semester, credits || 4]
    );
    res.json({ success: true, message: 'Subject added successfully.', subjectId: result.insertId });
  } catch (err) {
    console.error('addSubject:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// POST /api/faculty/upload/timetable-image
// FIX 2: Upload timetable as image or PDF
// ═══════════════════════════════════════════
exports.uploadTimetableImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const faculty = await getFaculty(req.user.email);
    const { semester, type, effective_from } = req.body;

    if (!semester || !effective_from) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Semester and effective date are required.' });
    }

    // Save to timetable table in image mode
    await pool.query(
      `INSERT INTO timetable
        (branch, semester, section, type, day_of_week, period_no, start_time, end_time,
         uploaded_by, effective_from, image_path, image_name, upload_mode)
       VALUES ('CSIT', ?, 'CSIT-1', ?, 'Monday', 1, '09:00:00', '17:00:00', ?, ?, ?, ?, 'image')`,
      [semester, type || 'Regular', faculty.id, effective_from,
       req.file.path, req.file.originalname]
    );

    // Log the upload
    await pool.query(
      `INSERT INTO upload_log (faculty_id, upload_type, file_name, rows_processed, rows_failed, status)
       VALUES (?, 'timetable', ?, 1, 0, 'confirmed')`,
      [faculty.id, req.file.originalname]
    );

    res.json({ success: true, message: 'Timetable uploaded successfully. Students can now view it.' });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    console.error('uploadTimetableImage:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/faculty/class-strength
// FIX 6: Class strength visible to faculty
// ═══════════════════════════════════════════
exports.getClassStrength = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         s.branch,
         s.semester,
         COUNT(*) AS total_registered,
         COUNT(DISTINCT al.user_email) AS ever_logged_in
       FROM students s
       LEFT JOIN activity_log al
         ON al.user_email = s.college_email AND al.role = 'student' AND al.action = 'login'
       GROUP BY s.branch, s.semester
       ORDER BY s.branch, s.semester`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getClassStrength:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/faculty/upload-log
// Recent upload history for this faculty
// ═══════════════════════════════════════════
exports.getUploadLog = async (req, res) => {
  try {
    const faculty = await getFaculty(req.user.email);
    const [rows]  = await pool.query(
      `SELECT id, upload_type, file_name, rows_processed, rows_failed, status, created_at
       FROM upload_log WHERE faculty_id = ?
       ORDER BY created_at DESC LIMIT 20`,
      [faculty.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
