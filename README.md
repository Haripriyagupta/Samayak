# Samayak — Authentication & User Management Module
This module adds a complete, working login/signup system to Samayak: Your CampusMitra, matching the visual identity of the existing landing page.

## What's Included

✅ Single-page login with **Student / Faculty tab switcher**
✅ Student login via **Enrollment Number OR College Email**
✅ Faculty login via **College Email**
✅ Show/Hide password, Remember Me, Forgot Password
✅ Full **signup flow with email OTP verification** (Gmail)
✅ **Faculty Verification Code** system (demo codes included)
✅ Duplicate enrollment number / email prevention (backend-enforced)
✅ Password reset via OTP
✅ JWT-based session tokens
✅ Rate limiting on login & OTP requests (brute-force protection)
✅ Activity logging (signup, login, login_failed, password_reset)
✅ Real MySQL database with proper schema
### ----------------------------------------        SAMAYAK- Your Campus Mantri           -----------------------------------------------
<br>
IN SHORT:- This a site where Faculty can directly upload Students academic details including Attendance, MST Marks, Syllabus, Timetables , Important academic Notices, Assignment details etc, which students can access easily, anywhere, all in same platform.

## Quick Start

1. Read **SETUP_GUIDE.md** — full step-by-step instructions for installing MySQL, configuring Gmail OTP, and running the backend locally.
2. Backend lives in `/backend`, frontend in `/frontend`.
3. Demo Faculty Verification Codes (for testing signup):
   - `CSIT-FAC-2026`
   - `CSIT-FAC-7741`
   - `CSIT-FAC-9203`

## Folder Structure

```
samayak-auth/
├── backend/        ← Node.js + Express + MySQL API
├── frontend/        ← login.html + matching styles/scripts
└── SETUP_GUIDE.md   ← Full manual setup walkthrough
```

## Tech Stack

- **Backend:** Node.js, Express, MySQL2, bcryptjs, JWT, Nodemailer
- **Frontend:** Vanilla HTML/CSS/JS (no framework — matches existing site)
- **Email:** Gmail SMTP via App Password
- **Database:** MySQL

## Security Notes for Demo/Production

- Passwords are hashed with bcrypt (never stored in plain text)
- OTPs expire after 10 minutes and are single-use
- JWT tokens expire after 7 days (configurable)
- Login attempts are rate-limited (10 per 15 min per IP)
- `.env` file is gitignored — never commit real credentials
