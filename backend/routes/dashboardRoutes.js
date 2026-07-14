// routes/dashboardRoutes.js
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/dashboardController');

// All dashboard routes require a valid student JWT
// Frontend sends: Authorization: Bearer <token>

router.use(verifyToken);  // applies to every route below

router.get('/summary',             ctrl.getSummary);
router.get('/profile',             ctrl.getProfile);
router.get('/attendance',          ctrl.getAttendance);
router.get('/marks',               ctrl.getMarks);
router.get('/timetable',           ctrl.getTimetable);   // ?type=Regular|MST|Practical|Special
router.get('/notices',             ctrl.getNotices);     // ?category=Exam&limit=10
router.get('/syllabus',            ctrl.getSyllabus);
router.get('/syllabus/download/:id', ctrl.downloadSyllabus);

module.exports = router;
