// routes/userRoutes.js
// Example protected routes — demonstrates how the dashboard
// will later fetch the logged-in user's own data only.

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const pool = require('../config/db');

// GET /api/user/me — returns the logged-in user's own profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { role, email } = req.user;
    const table = role === 'student' ? 'students' : 'faculty';

    const [rows] = await pool.query(
      `SELECT * FROM ${table} WHERE college_email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password_hash, ...safeUser } = rows[0];
    return res.json({ success: true, role, user: safeUser });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
