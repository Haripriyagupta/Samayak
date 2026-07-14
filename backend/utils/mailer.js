// utils/mailer.js
// Handles sending OTP emails via Gmail (using App Password).

const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// Verify transporter config on startup (logs only — doesn't crash the app)
transporter.verify((err) => {
  if (err) {
    console.error('❌ Email transporter error:', err.message);
    console.error('   Check EMAIL_USER and EMAIL_APP_PASSWORD in your .env file');
  } else {
    console.log('✅ Email service ready (Gmail)');
  }
});

/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an OTP email for signup verification or password reset
 * @param {string} toEmail
 * @param {string} otp
 * @param {'signup'|'password_reset'} purpose
 */
async function sendOTPEmail(toEmail, otp, purpose) {
  const isSignup = purpose === 'signup';

  const subject = isSignup
    ? 'Verify your Samayak account — OTP Code'
    : 'Reset your Samayak password — OTP Code';

  const heading = isSignup ? 'Verify Your Email' : 'Reset Your Password';
  const message = isSignup
    ? 'Use the OTP below to verify your email and activate your Samayak account.'
    : 'Use the OTP below to reset your Samayak account password.';

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #faf9f5; padding: 32px; border-radius: 16px;">
    <div style="background: #1a3c2e; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
      <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Samayak <span style="color:#f0b429;">🌿</span></h2>
      <p style="color: #a8c5b5; margin: 4px 0 0; font-size: 13px;">Your CampusMitra</p>
    </div>
    <h3 style="color: #1c1c1c;">${heading}</h3>
    <p style="color: #5a5a5a; font-size: 14px; line-height: 1.6;">${message}</p>
    <div style="background: #ffffff; border: 1.5px dashed #3a8c5c; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a3c2e;">${otp}</span>
    </div>
    <p style="color: #5a5a5a; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
    <p style="color: #9a9a9a; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
  </div>`;

  await transporter.sendMail({
    from: `"Samayak CampusMitra" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html
  });
}

module.exports = { generateOTP, sendOTPEmail };
