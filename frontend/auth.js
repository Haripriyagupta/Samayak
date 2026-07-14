// auth.js — Fixed version
// Fixes: email domain validation (@acropolis.in), enrollment prefix (0827),
// removed backend tip from error message, fixed all validation

let currentRole = 'student';
let currentMode = 'login';
let pendingOtpEmail = null;
let pendingOtpPurpose = null;
let resendCooldownTimer = null;

// ═══════════════════════════════════════════════
// ROLE SWITCHING
// ═══════════════════════════════════════════════
function switchRole(role) {
  currentRole = role;
  document.getElementById('tab-student').classList.toggle('active', role === 'student');
  document.getElementById('tab-faculty').classList.toggle('active', role === 'faculty');
  document.getElementById('student-identifier-toggle').style.display = role === 'student' ? 'flex' : 'none';
  document.getElementById('signup-student-fields').style.display = role === 'student' ? 'block' : 'none';
  document.getElementById('signup-faculty-fields').style.display = role === 'faculty' ? 'block' : 'none';
  updateIdentifierField();
  hideAlert();
}

function updateIdentifierField() {
  const label = document.getElementById('identifier-label');
  const input = document.getElementById('login-identifier');
  if (currentRole === 'faculty') {
    label.textContent = 'College Email';
    input.placeholder = 'yourname@acropolis.in';
    input.type = 'email';
    return;
  }
  const idType = document.querySelector('input[name="idType"]:checked').value;
  if (idType === 'enrollment') {
    label.textContent = 'Enrollment Number';
    input.placeholder = 'e.g. 0827CS241001';
    input.type = 'text';
  } else {
    label.textContent = 'College Email';
    input.placeholder = 'yourname@acropolis.in';
    input.type = 'email';
  }
}

// ═══════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════
function validateCollegeEmail(email) {
  if (!email) return 'Email is required.';
  if (!email.endsWith('@acropolis.in')) return 'Must be a college email ending with @acropolis.in';
  return null;
}

function validateEnrollmentNo(enrollment) {
  if (!enrollment) return 'Enrollment number is required.';
  if (!enrollment.startsWith('0827')) return 'Enrollment number must start with 0827.';
  if (enrollment.length < 10) return 'Please enter your complete enrollment number.';
  return null;
}

// ═══════════════════════════════════════════════
// MODE SWITCHING
// ═══════════════════════════════════════════════
function switchToSignup() {
  currentMode = 'signup';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'flex';
  document.querySelector('.auth-divider').style.display = 'none';
  document.querySelector('.signup-cta').style.display = 'none';
  document.getElementById('back-to-login-cta').style.display = 'block';
  document.getElementById('form-heading').textContent = 'Create your account';
  document.getElementById('form-subheading').textContent = 'Fill in your details to register.';
  hideAlert();
}

function switchToLogin() {
  currentMode = 'login';
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('signup-form').style.display = 'none';
  document.querySelector('.auth-divider').style.display = 'block';
  document.querySelector('.signup-cta').style.display = 'block';
  document.getElementById('back-to-login-cta').style.display = 'none';
  document.getElementById('form-heading').textContent = 'Login to your account';
  document.getElementById('form-subheading').textContent = 'Choose your role and enter your credentials.';
  hideAlert();
}

// ═══════════════════════════════════════════════
// PASSWORD VISIBILITY TOGGLE
// ═══════════════════════════════════════════════
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 8 11 8a21.6 21.6 0 01-3.22 4.44M14.12 14.12a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ═══════════════════════════════════════════════
// ALERT HELPERS
// ═══════════════════════════════════════════════
function showAlert(message, type = 'error') {
  const banner = document.getElementById('alert-banner');
  const icon   = document.getElementById('alert-icon');
  const text   = document.getElementById('alert-text');
  banner.className = `alert-banner show ${type}`;
  text.textContent = message;
  icon.innerHTML = type === 'success'
    ? `<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>`
    : `<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>`;
}
function hideAlert() {
  document.getElementById('alert-banner').classList.remove('show');
}
function setFieldError(fieldId, message) {
  const errEl = document.getElementById(fieldId + '-error');
  if (errEl) {
    errEl.classList.add('show');
    errEl.querySelector('span').textContent = message;
  }
}
function clearFieldErrors() {
  document.querySelectorAll('.field-msg.error').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.input-wrap input').forEach(el => el.classList.remove('has-error'));
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

// ═══════════════════════════════════════════════
// API HELPER — cleaner error messages
// ═══════════════════════════════════════════════
async function apiCall(endpoint, payload) {
  try {
    const res  = await fetch(`${API_BASE_URL}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { success: false, message: 'Unable to connect. Please check your internet connection and try again.' } };
  }
}

// ═══════════════════════════════════════════════
// LOGIN HANDLER
// ═══════════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  hideAlert();
  clearFieldErrors();

  const identifier = document.getElementById('login-identifier').value.trim();
  const password   = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  // Validate identifier
  if (!identifier) {
    setFieldError('identifier-error', 'This field is required.');
    return false;
  }

  // If student login with email, validate domain
  if (currentRole === 'student') {
    const idType = document.querySelector('input[name="idType"]:checked').value;
    if (idType === 'email') {
      const emailErr = validateCollegeEmail(identifier);
      if (emailErr) { setFieldError('identifier-error', emailErr); return false; }
    } else {
      const enrollErr = validateEnrollmentNo(identifier);
      if (enrollErr) { setFieldError('identifier-error', enrollErr); return false; }
    }
  } else {
    // Faculty always uses email
    const emailErr = validateCollegeEmail(identifier);
    if (emailErr) { setFieldError('identifier-error', emailErr); return false; }
  }

  if (!password) {
    setFieldError('password-error', 'Please enter your password.');
    return false;
  }

  setLoading('login-btn', true);
  const { ok, data } = await apiCall('/auth/login', { role: currentRole, identifier, password, rememberMe });
  setLoading('login-btn', false);

  if (ok && data.success) {
    showAlert('Login successful! Redirecting...', 'success');
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('samayak_token', data.token);
    storage.setItem('samayak_role',  data.role);
    storage.setItem('samayak_user',  JSON.stringify(data.user));
    setTimeout(() => {
      window.location.href = currentRole === 'student' ? 'student-dashboard.html' : 'faculty-dashboard.html';
    }, 1000);
  } else {
    showAlert(data.message || 'Login failed. Please try again.', 'error');
  }
  return false;
}

// ═══════════════════════════════════════════════
// SIGNUP HANDLER
// ═══════════════════════════════════════════════
async function handleSignup(e) {
  e.preventDefault();
  hideAlert();

  const fullName = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  // Validate email domain
  const emailErr = validateCollegeEmail(email);
  if (emailErr) { showAlert(emailErr, 'error'); return false; }

  if (!fullName) { showAlert('Please enter your full name.', 'error'); return false; }
  if (password.length < 6) { showAlert('Password must be at least 6 characters.', 'error'); return false; }

  let payload = { role: currentRole, fullName, collegeEmail: email, password };

  if (currentRole === 'student') {
    const enrollmentNo = document.getElementById('signup-enrollment').value.trim();
    const semester     = document.getElementById('signup-semester').value;
    const branch       = document.getElementById('signup-branch').value;

    const enrollErr = validateEnrollmentNo(enrollmentNo);
    if (enrollErr) { showAlert(enrollErr, 'error'); return false; }
    if (!semester) { showAlert('Please select your semester.', 'error'); return false; }

    payload = { ...payload, enrollmentNo, semester, branch };
  } else {
    const department       = document.getElementById('signup-department').value;
    const designation      = document.getElementById('signup-designation').value;
    const verificationCode = document.getElementById('signup-verification-code').value.trim();
    if (!designation)      { showAlert('Please select your designation.', 'error'); return false; }
    if (!verificationCode) { showAlert('Faculty verification code is required.', 'error'); return false; }
    payload = { ...payload, department, designation, verificationCode };
  }

  setLoading('signup-btn', true);
  const { ok, data } = await apiCall('/auth/signup/start', payload);
  setLoading('signup-btn', false);

  if (ok && data.success) {
    pendingOtpEmail   = email;
    pendingOtpPurpose = 'signup';
    openOtpModal(email);
  } else {
    showAlert(data.message || 'Registration failed. Please try again.', 'error');
  }
  return false;
}

// ═══════════════════════════════════════════════
// OTP MODAL
// ═══════════════════════════════════════════════
function openOtpModal(email) {
  document.getElementById('otp-target-email').textContent = email;
  document.getElementById('otp-modal-overlay').classList.add('show');
  document.getElementById('otp-error').classList.remove('show');
  document.querySelectorAll('.otp-digit').forEach(d => d.value = '');
  document.querySelector('.otp-digit').focus();
  startResendCooldown();
}
function closeOtpModal() {
  document.getElementById('otp-modal-overlay').classList.remove('show');
  clearInterval(resendCooldownTimer);
}

document.addEventListener('DOMContentLoaded', () => {
  setupOtpDigitInputs('.otp-digit');
  setupOtpDigitInputs('.forgot-otp-digit');
});

function setupOtpDigitInputs(selector) {
  const inputs = document.querySelectorAll(selector);
  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      // Handle full 6-digit paste
      const pasted = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
      if (pasted.length === 6) {
        e.preventDefault();
        inputs.forEach((inp, i) => inp.value = pasted[i] || '');
        inputs[5].focus();
      }
    });
  });
}

function getOtpValue(selector) {
  return Array.from(document.querySelectorAll(selector)).map(i => i.value).join('');
}

async function verifyOTP() {
  const otp   = getOtpValue('.otp-digit');
  const errEl = document.getElementById('otp-error');
  errEl.classList.remove('show');
  if (otp.length !== 6) {
    document.getElementById('otp-error-text').textContent = 'Please enter all 6 digits.';
    errEl.classList.add('show');
    return;
  }
  setLoading('otp-verify-btn', true);
  const { ok, data } = await apiCall('/auth/signup/verify', { email: pendingOtpEmail, otp });
  setLoading('otp-verify-btn', false);
  if (ok && data.success) {
    closeOtpModal();
    switchToLogin();
    showAlert('Account created successfully! You can now log in.', 'success');
  } else {
    document.getElementById('otp-error-text').textContent = data.message || 'Invalid OTP. Please try again.';
    errEl.classList.add('show');
  }
}

async function resendOTP() {
  const { ok, data } = await apiCall('/auth/otp/resend', { email: pendingOtpEmail, purpose: pendingOtpPurpose });
  if (ok && data.success) {
    startResendCooldown();
  } else {
    const errId = pendingOtpPurpose === 'signup' ? 'otp-error' : 'reset-error';
    document.getElementById(errId + '-text').textContent = data.message || 'Could not resend OTP.';
    document.getElementById(errId).classList.add('show');
  }
}

function startResendCooldown() {
  let seconds = 30;
  const btn     = document.getElementById('resend-btn');
  const timerEl = document.getElementById('resend-timer');
  btn.disabled  = true;
  clearInterval(resendCooldownTimer);
  timerEl.textContent = ` (${seconds}s)`;
  resendCooldownTimer = setInterval(() => {
    seconds--;
    timerEl.textContent = ` (${seconds}s)`;
    if (seconds <= 0) {
      clearInterval(resendCooldownTimer);
      btn.disabled        = false;
      timerEl.textContent = '';
    }
  }, 1000);
}

// ═══════════════════════════════════════════════
// FORGOT PASSWORD
// ═══════════════════════════════════════════════
function openForgotPassword() {
  document.getElementById('forgot-modal-overlay').classList.add('show');
  document.getElementById('forgot-step-1').style.display = 'block';
  document.getElementById('forgot-step-2').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-error').classList.remove('show');
}
function closeForgotModal() {
  document.getElementById('forgot-modal-overlay').classList.remove('show');
}

async function sendForgotOTP() {
  const email = document.getElementById('forgot-email').value.trim();
  const errEl = document.getElementById('forgot-error');
  errEl.classList.remove('show');

  const emailErr = validateCollegeEmail(email);
  if (emailErr) {
    document.getElementById('forgot-error-text').textContent = emailErr;
    errEl.classList.add('show');
    return;
  }

  setLoading('forgot-send-btn', true);
  const { ok, data } = await apiCall('/auth/password/forgot', { role: currentRole, email });
  setLoading('forgot-send-btn', false);

  if (ok && data.success) {
    pendingOtpEmail   = email;
    pendingOtpPurpose = 'password_reset';
    document.getElementById('forgot-target-email').textContent = email;
    document.getElementById('forgot-step-1').style.display = 'none';
    document.getElementById('forgot-step-2').style.display = 'block';
    document.querySelectorAll('.forgot-otp-digit').forEach(d => d.value = '');
    document.querySelector('.forgot-otp-digit').focus();
    startResendCooldown();
  } else {
    document.getElementById('forgot-error-text').textContent = data.message || 'Could not send reset code.';
    errEl.classList.add('show');
  }
}

async function submitNewPassword() {
  const otp         = getOtpValue('.forgot-otp-digit');
  const newPassword = document.getElementById('new-password').value;
  const errEl       = document.getElementById('reset-error');
  errEl.classList.remove('show');

  if (otp.length !== 6) {
    document.getElementById('reset-error-text').textContent = 'Please enter all 6 digits.';
    errEl.classList.add('show');
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    document.getElementById('reset-error-text').textContent = 'Password must be at least 6 characters.';
    errEl.classList.add('show');
    return;
  }

  setLoading('reset-btn', true);
  const { ok, data } = await apiCall('/auth/password/reset', {
    role: currentRole, email: pendingOtpEmail, otp, newPassword
  });
  setLoading('reset-btn', false);

  if (ok && data.success) {
    closeForgotModal();
    showAlert('Password reset successful! Please log in with your new password.', 'success');
  } else {
    document.getElementById('reset-error-text').textContent = data.message || 'Could not reset password.';
    errEl.classList.add('show');
  }
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
updateIdentifierField();
