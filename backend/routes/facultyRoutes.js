// routes/facultyRoutes.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/facultyController');

// ── Faculty-only guard ──
function facultyOnly(req, res, next) {
  if (req.user.role !== 'faculty') {
    return res.status(403).json({ success: false, message: 'Faculty access only.' });
  }
  next();
}

// ── Multer: Excel uploads ──
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.path.includes('marks') ? 'marks' : 'attendance';
    cb(null, path.join(__dirname, `../uploads/${type}`));
  },
  filename: (req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});
const excelFilter = (req, file, cb) => {
  const ok = ['.xlsx', '.xls'].includes(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Only .xlsx and .xls files are allowed.'));
};
const uploadExcel = multer({ storage: excelStorage, fileFilter: excelFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Multer: PDF/doc uploads ──
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Timetable images go to uploads/timetable, everything else to uploads/syllabus
    const isTimetable = req.path.includes('timetable');
    cb(null, path.join(__dirname, isTimetable ? '../uploads/timetable' : '../uploads/syllabus'));
  },
  filename:    (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});
const pdfFilter = (req, file, cb) => {
  const ok = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase());
  ok ? cb(null, true) : cb(new Error('Only PDF, document, or image files are allowed.'));
};
const uploadPdf = multer({ storage: pdfStorage, fileFilter: pdfFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Apply auth + role to all routes ──
router.use(verifyToken);
router.use(facultyOnly);

// Profile & utility
router.get('/profile',              ctrl.getProfile);
router.get('/subjects',             ctrl.getSubjects);
router.post('/subjects/add',        ctrl.addSubject);
router.get('/upload-log',           ctrl.getUploadLog);
router.get('/class-strength',       ctrl.getClassStrength);

// Attendance
router.post('/upload/attendance',           uploadExcel.single('file'), ctrl.previewAttendance);
router.post('/upload/attendance/confirm',   ctrl.confirmAttendance);

// Marks
router.post('/upload/marks',                uploadExcel.single('file'), ctrl.previewMarks);
router.post('/upload/marks/confirm',        ctrl.confirmMarks);

// Notices
router.post('/notices',             ctrl.postNotice);
router.get('/notices',              ctrl.getMyNotices);
router.delete('/notices/:id',       ctrl.deleteNotice);

// Timetable
router.post('/timetable',                ctrl.postTimetable);
router.post('/upload/timetable-image',   uploadPdf.single('file'), ctrl.uploadTimetableImage);

// Syllabus
router.post('/upload/syllabus',     uploadPdf.single('file'), ctrl.uploadSyllabus);

module.exports = router;
