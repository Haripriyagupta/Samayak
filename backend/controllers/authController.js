// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { generateOTP, sendOTPEmail } = require('../utils/mailer');

const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────
// Helper: log activity (best-effort, non-blocking)
// ─────────────────────────────────────────────
async function logActivity(email, role, action, ip) {
  try {
    await pool.query(
      'INSERT INTO activity_log (user_email, role, action, ip_address) VALUES (?, ?, ?, ?)',
      [email, role, action, ip]
    );
  } catch (err) {
    console.error('Activity log failed (non-blocking):', err.message);
  }
}

// ─────────────────────────────────────────────
// Helper: generate JWT
// ─────────────────────────────────────────────
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

// ═══════════════════════════════════════════════
// STEP 1 — START SIGNUP (sends OTP, does NOT create account yet)
// ═══════════════════════════════════════════════
exports.startSignup = async (req, res) => {
  const { role } = req.body;

  try {
    if (role === 'student') {
      const { fullName, enrollmentNo, branch, semester, collegeEmail, password } = req.body;

      if (!fullName || !enrollmentNo || !semester || !collegeEmail || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }
      // FIX 6: Validate college email domain
      if (!collegeEmail.endsWith('@acropolis.in')) {
        return res.status(400).json({ success: false, message: 'Please use your college email ending with @acropolis.in' });
      }
      // FIX 6: Validate enrollment number prefix
      if (!enrollmentNo.startsWith('0827')) {
        return res.status(400).json({ success: false, message: 'Enrollment number must start with 0827.' });
      }

      // Check duplicates
      const [existing] = await pool.query(
        'SELECT id FROM students WHERE college_email = ? OR enrollment_no = ?',
        [collegeEmail, enrollmentNo]
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'An account with this email or enrollment number already exists.' });
      }

      // Store pending signup data temporarily in OTP table via JSON-stuffed approach
      // (Simple approach: store hashed password + data in a pending_signups style row)
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Clear old OTPs for this email
      await pool.query('DELETE FROM otp_verifications WHERE email = ? AND purpose = "signup"', [collegeEmail]);

      // Stash pending data as JSON in a temp table-free way: use session-style cache table
      // For simplicity in this demo, we store it in a JSON column appended to otp table.
      await pool.query(
        `INSERT INTO otp_verifications (email, otp_code, purpose, role, expires_at) VALUES (?, ?, 'signup', 'student', ?)`,
        [collegeEmail, otp, expiresAt]
      );

      // Cache pending signup in memory (simple demo-grade approach)
      global.pendingSignups = global.pendingSignups || {};
      global.pendingSignups[collegeEmail] = {
        role: 'student', fullName, enrollmentNo, branch: branch || 'CSIT',
        semester, collegeEmail, passwordHash
      };

      await sendOTPEmail(collegeEmail, otp, 'signup');
      return res.json({ success: true, message: 'OTP sent to your college email.', email: collegeEmail });

    } else if (role === 'faculty') {
      const { fullName, department, designation, collegeEmail, password, verificationCode } = req.body;

      if (!fullName || !designation || !collegeEmail || !password || !verificationCode) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }
      // FIX 6: Validate college email domain for faculty too
      if (!collegeEmail.endsWith('@acropolis.in')) {
        return res.status(400).json({ success: false, message: 'Please use your college email ending with @acropolis.in' });
      }

      // Validate verification code
      const [codeRows] = await pool.query(
        'SELECT * FROM faculty_verification_codes WHERE code = ? AND is_used = FALSE',
        [verificationCode]
      );
      if (codeRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Invalid or already-used Faculty Verification Code.' });
      }

      const [existing] = await pool.query('SELECT id FROM faculty WHERE college_email = ?', [collegeEmail]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      await pool.query('DELETE FROM otp_verifications WHERE email = ? AND purpose = "signup"', [collegeEmail]);
      await pool.query(
        `INSERT INTO otp_verifications (email, otp_code, purpose, role, expires_at) VALUES (?, ?, 'signup', 'faculty', ?)`,
        [collegeEmail, otp, expiresAt]
      );

      global.pendingSignups = global.pendingSignups || {};
      global.pendingSignups[collegeEmail] = {
        role: 'faculty', fullName, department: department || 'CSIT', designation,
        collegeEmail, passwordHash, verificationCode
      };

      await sendOTPEmail(collegeEmail, otp, 'signup');
      return res.json({ success: true, message: 'OTP sent to your college email.', email: collegeEmail });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }
  } catch (err) {
    console.error('Signup start error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════
// STEP 2 — VERIFY OTP & CREATE ACCOUNT
// ═══════════════════════════════════════════════
exports.verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = 'signup' AND is_used = FALSE ORDER BY id DESC LIMIT 1`,
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
    if (new Date(rows[0].expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const pending = (global.pendingSignups || {})[email];
    if (!pending) {
      return res.status(400).json({ success: false, message: 'Signup session expired. Please start again.' });
    }

    // Mark OTP used
    await pool.query('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [rows[0].id]);

    if (pending.role === 'student') {
      await pool.query(
        `INSERT INTO students (full_name, enrollment_no, branch, semester, college_email, password_hash, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [pending.fullName, pending.enrollmentNo, pending.branch, pending.semester, pending.collegeEmail, pending.passwordHash]
      );
    } else {
      await pool.query(
        `INSERT INTO faculty (full_name, department, designation, college_email, password_hash, is_verified)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [pending.fullName, pending.department, pending.designation, pending.collegeEmail, pending.passwordHash]
      );
      // Mark verification code as used
      await pool.query(
        'UPDATE faculty_verification_codes SET is_used = TRUE, used_by_email = ? WHERE code = ?',
        [pending.collegeEmail, pending.verificationCode]
      );
    }

    delete global.pendingSignups[email];
    await logActivity(email, pending.role, 'signup', req.ip);

    return res.json({ success: true, message: 'Account created successfully! You can now log in.' });
  } catch (err) {
    console.error('OTP verify error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════
// RESEND OTP
// ═══════════════════════════════════════════════
exports.resendOTP = async (req, res) => {
  const { email, purpose } = req.body; // purpose: 'signup' | 'password_reset'
  try {
    const pending = (global.pendingSignups || {})[email];
    let role = pending ? pending.role : null;

    if (!role) {
      // Could be password reset for existing user — detect role
      const [s] = await pool.query('SELECT id FROM students WHERE college_email = ?', [email]);
      const [f] = await pool.query('SELECT id FROM faculty WHERE college_email = ?', [email]);
      role = s.length ? 'student' : (f.length ? 'faculty' : null);
    }
    if (!role) {
      return res.status(404).json({ success: false, message: 'No pending request found for this email.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await pool.query('DELETE FROM otp_verifications WHERE email = ? AND purpose = ?', [email, purpose]);
    await pool.query(
      `INSERT INTO otp_verifications (email, otp_code, purpose, role, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [email, otp, purpose, role, expiresAt]
    );
    await sendOTPEmail(email, otp, purpose);

    return res.json({ success: true, message: 'A new OTP has been sent.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════
exports.login = async (req, res) => {
  const { role, identifier, password, rememberMe } = req.body;
  // identifier = email OR enrollment number (students only)

  try {
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your credentials.' });
    }

    let user, table, idField;
    if (role === 'student') {
      const [rows] = await pool.query(
        'SELECT * FROM students WHERE college_email = ? OR enrollment_no = ?',
        [identifier, identifier]
      );
      user = rows[0];
      table = 'students';
    } else if (role === 'faculty') {
      const [rows] = await pool.query('SELECT * FROM faculty WHERE college_email = ?', [identifier]);
      user = rows[0];
      table = 'faculty';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    if (!user) {
      await logActivity(identifier, role, 'login_failed', req.ip);
      return res.status(401).json({ success: false, message: 'No account found with these credentials.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await logActivity(user.college_email, role, 'login_failed', req.ip);
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ success: false, message: 'Account not verified. Please complete OTP verification.' });
    }

    const token = generateToken({
      id: user.id,
      role,
      email: user.college_email,
      name: user.full_name
    });

    await logActivity(user.college_email, role, 'login', req.ip);

    const { password_hash, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      role,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════
// FORGOT PASSWORD — Step 1: send OTP
// ═══════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  const { role, email } = req.body;
  try {
    const table = role === 'student' ? 'students' : 'faculty';
    const [rows] = await pool.query(`SELECT id FROM ${table} WHERE college_email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    await pool.query('DELETE FROM otp_verifications WHERE email = ? AND purpose = "password_reset"', [email]);
    await pool.query(
      `INSERT INTO otp_verifications (email, otp_code, purpose, role, expires_at) VALUES (?, ?, 'password_reset', ?, ?)`,
      [email, otp, role, expiresAt]
    );
    await sendOTPEmail(email, otp, 'password_reset');

    return res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ═══════════════════════════════════════════════
// FORGOT PASSWORD — Step 2: verify OTP + set new password
// ═══════════════════════════════════════════════
exports.resetPassword = async (req, res) => {
  const { role, email, otp, newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await pool.query(
      `SELECT * FROM otp_verifications WHERE email = ? AND otp_code = ? AND purpose = 'password_reset' AND is_used = FALSE ORDER BY id DESC LIMIT 1`,
      [email, otp]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
    if (new Date(rows[0].expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const table = role === 'student' ? 'students' : 'faculty';
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(`UPDATE ${table} SET password_hash = ? WHERE college_email = ?`, [passwordHash, email]);
    await pool.query('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [rows[0].id]);
    await logActivity(email, role, 'password_reset', req.ip);

    return res.json({ success: true, message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
