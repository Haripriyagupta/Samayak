// controllers/dashboardController.js
// All student-facing data endpoints.

const pool = require('../config/db');

// ─────────────────────────────────────────
// Helper: get student row from JWT user
// ─────────────────────────────────────────
async function getStudent(email) {
  const [rows] = await pool.query(
    'SELECT * FROM students WHERE college_email = ?', [email]
  );
  return rows[0] || null;
}

// ═══════════════════════════════════════════
// GET /api/dashboard/profile
// Returns the logged-in student's full profile
// ═══════════════════════════════════════════
exports.getProfile = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    const { password_hash, ...safe } = student;
    res.json({ success: true, data: safe });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/attendance
// Returns attendance per subject for logged-in student
// ═══════════════════════════════════════════
exports.getAttendance = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      `SELECT
         a.id,
         s.name        AS subject_name,
         s.code        AS subject_code,
         s.credits,
         a.total_classes,
         a.attended,
         a.percentage,
         a.last_updated
       FROM attendance a
       JOIN subjects s ON s.id = a.subject_id
       WHERE a.student_id = ?
       ORDER BY s.name`,
      [student.id]
    );

    // Overall percentage
    const totalClasses = rows.reduce((sum, r) => sum + r.total_classes, 0);
    const totalAttended = rows.reduce((sum, r) => sum + r.attended, 0);
    const overallPct = totalClasses > 0
      ? ((totalAttended / totalClasses) * 100).toFixed(1)
      : null;

    // Status label
    const status = overallPct === null ? 'No Data'
      : overallPct >= 85 ? 'Excellent'
      : overallPct >= 75 ? 'Good'
      : overallPct >= 65 ? 'Average'
      : 'Low — Attention Needed';

    res.json({
      success: true,
      data: {
        subjects: rows,
        summary: { totalClasses, totalAttended, overallPct, status }
      }
    });
  } catch (err) {
    console.error('getAttendance error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/marks
// Returns all marks grouped by subject
// ═══════════════════════════════════════════
exports.getMarks = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      `SELECT
         m.id,
         s.name          AS subject_name,
         s.code          AS subject_code,
         m.exam_type,
         m.marks_obtained,
         m.max_marks,
         ROUND((m.marks_obtained / m.max_marks) * 100, 1) AS percentage,
         m.last_updated
       FROM marks m
       JOIN subjects s ON s.id = m.subject_id
       WHERE m.student_id = ?
       ORDER BY s.name, FIELD(m.exam_type,'MST1','MST2','Internal','Practical','Assignment')`,
      [student.id]
    );

    // Group by subject for easy frontend rendering
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.subject_code]) {
        grouped[row.subject_code] = {
          subject_name: row.subject_name,
          subject_code: row.subject_code,
          exams: []
        };
      }
      grouped[row.subject_code].exams.push({
        exam_type: row.exam_type,
        marks_obtained: row.marks_obtained,
        max_marks: row.max_marks,
        percentage: row.percentage,
        last_updated: row.last_updated
      });
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    console.error('getMarks error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/timetable
// Returns timetable — image URL or grid data
// FIX 2: Now returns image/PDF if uploaded as file
// ═══════════════════════════════════════════
exports.getTimetable = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const type = req.query.type || 'Regular';

    // Check for image-mode timetable first (most recent)
    const [imageRows] = await pool.query(
      `SELECT image_path, image_name, effective_from
       FROM timetable
       WHERE branch = ? AND semester = ? AND type = ? AND upload_mode = 'image'
       ORDER BY effective_from DESC, id DESC LIMIT 1`,
      [student.branch, student.semester, type]
    );

    if (imageRows.length > 0 && imageRows[0].image_path) {
      // Build a URL the frontend can use to fetch the file
      const relativePath = imageRows[0].image_path.replace(/\\/g, '/');
      const fileName     = require('path').basename(relativePath);
      return res.json({
        success: true,
        data: {
          type,
          imageUrl:       `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/timetable/${fileName}`,
          effective_from: imageRows[0].effective_from,
          timetable: []
        }
      });
    }

    // Fallback: grid-based timetable
    const [rows] = await pool.query(
      `SELECT
         t.id, t.day_of_week, t.period_no,
         t.start_time, t.end_time, t.type, t.room, t.effective_from,
         s.name AS subject_name, s.code AS subject_code
       FROM timetable t
       LEFT JOIN subjects s ON s.id = t.subject_id
       WHERE t.branch = ? AND t.semester = ? AND t.type = ? AND (t.upload_mode = 'grid' OR t.upload_mode IS NULL)
       ORDER BY FIELD(t.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), t.period_no`,
      [student.branch, student.semester, type]
    );

    const days  = {};
    const ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    for (const row of rows) {
      if (!days[row.day_of_week]) days[row.day_of_week] = [];
      days[row.day_of_week].push(row);
    }
    const timetable = ORDER.filter(d => days[d]).map(d => ({ day: d, periods: days[d] }));

    res.json({ success: true, data: { timetable, type } });
  } catch (err) {
    console.error('getTimetable error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/notices
// Returns notices for student's branch+semester
// ═══════════════════════════════════════════
exports.getNotices = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const category = req.query.category || null; // optional filter
    const limit = parseInt(req.query.limit) || 20;

    let sql = `
      SELECT
        n.id, n.title, n.body, n.category,
        n.is_pinned, n.created_at, n.updated_at,
        f.full_name AS posted_by_name,
        f.designation AS posted_by_designation
      FROM notices n
      JOIN faculty f ON f.id = n.posted_by
      WHERE n.branch = ?
        AND (n.semester IS NULL OR n.semester = ?)
    `;
    const params = [student.branch, student.semester];

    if (category) { sql += ' AND n.category = ?'; params.push(category); }
    sql += ' ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getNotices error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/syllabus
// Returns syllabus files for student's semester
// ═══════════════════════════════════════════
exports.getSyllabus = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const [rows] = await pool.query(
      `SELECT
         sy.id, sy.title, sy.file_name,
         sy.file_size_kb, sy.created_at,
         s.name AS subject_name, s.code AS subject_code,
         f.full_name AS uploaded_by
       FROM syllabus sy
       JOIN subjects s ON s.id = sy.subject_id
       JOIN faculty f ON f.id = sy.uploaded_by
       WHERE s.branch = ? AND s.semester = ?
       ORDER BY s.name, sy.created_at DESC`,
      [student.branch, student.semester]
    );

    // Group by subject
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.subject_code]) {
        grouped[row.subject_code] = {
          subject_name: row.subject_name,
          subject_code: row.subject_code,
          files: []
        };
      }
      grouped[row.subject_code].files.push(row);
    }

    res.json({ success: true, data: Object.values(grouped) });
  } catch (err) {
    console.error('getSyllabus error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/summary
// One call that returns everything for the overview card
// ═══════════════════════════════════════════
exports.getSummary = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Attendance overall
    const [[attRow]] = await pool.query(
      `SELECT
         SUM(total_classes) AS total_classes,
         SUM(attended)       AS attended,
         COUNT(*)            AS subjects_count
       FROM attendance WHERE student_id = ?`,
      [student.id]
    );

    // Marks: avg percentage across all exams
    const [[marksRow]] = await pool.query(
      `SELECT
         COUNT(*) AS exams_uploaded,
         ROUND(AVG((marks_obtained/max_marks)*100),1) AS avg_pct
       FROM marks WHERE student_id = ?`,
      [student.id]
    );

    // Upcoming / unread notices count
    const [[noticeRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM notices
       WHERE branch = ? AND (semester IS NULL OR semester = ?)`,
      [student.branch, student.semester]
    );

    const overallAtt = attRow.total_classes > 0
      ? ((attRow.attended / attRow.total_classes) * 100).toFixed(1)
      : null;

    const attStatus = overallAtt === null ? 'No Data'
      : overallAtt >= 85 ? 'Excellent'
      : overallAtt >= 75 ? 'Good'
      : overallAtt >= 65 ? 'Average'
      : 'Low';

    res.json({
      success: true,
      data: {
        student: { ...student, password_hash: undefined },
        attendance: {
          overall: overallAtt,
          status: attStatus,
          subjects_count: attRow.subjects_count || 0
        },
        marks: {
          exams_uploaded: marksRow.exams_uploaded || 0,
          avg_percentage: marksRow.avg_pct || null
        },
        notices: { total: noticeRow.total || 0 }
      }
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ═══════════════════════════════════════════
// GET /api/dashboard/syllabus/download/:id
// Serve the actual file
// ═══════════════════════════════════════════
exports.downloadSyllabus = async (req, res) => {
  try {
    const student = await getStudent(req.user.email);
    if (!student) return res.status(404).json({ success: false, message: 'Not found.' });

    const [rows] = await pool.query(
      `SELECT sy.*, s.branch, s.semester
       FROM syllabus sy JOIN subjects s ON s.id = sy.subject_id
       WHERE sy.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'File not found.' });

    const file = rows[0];
    // Security: ensure the file belongs to student's branch/semester
    if (file.branch !== student.branch || file.semester !== student.semester) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const path = require('path');
    const filePath = path.resolve(file.file_path);
    res.download(filePath, file.file_name);
  } catch (err) {
    console.error('downloadSyllabus error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
