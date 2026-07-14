// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

// Limit brute-force attempts on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Limit OTP spam
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait before trying again.' }
});

router.post('/signup/start', otpLimiter, authController.startSignup);
router.post('/signup/verify', authController.verifySignupOTP);
router.post('/otp/resend', otpLimiter, authController.resendOTP);

router.post('/login', loginLimiter, authController.login);

router.post('/password/forgot', otpLimiter, authController.forgotPassword);
router.post('/password/reset', authController.resetPassword);

module.exports = router;
