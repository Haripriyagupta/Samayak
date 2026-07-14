# 🛠️ Samayak — Complete Setup Guide (Backend + Database + Email OTP)

This guide walks you through setting everything up **manually on your own computer**, step by step, with zero assumptions. Follow it top to bottom.

---

## 📋 What You Need to Install First

| Tool | Purpose | Download Link |
|---|---|---|
| Node.js (v18+) | Runs the backend server | https://nodejs.org |
| MySQL Community Server | The database | https://dev.mysql.com/downloads/mysql/ |
| MySQL Workbench (optional but helpful) | GUI to view your database | https://dev.mysql.com/downloads/workbench/ |
| VS Code (or any code editor) | Editing files | https://code.visualstudio.com |
| Git | Pushing to GitHub | https://git-scm.com |

Install all of these before continuing. Restart your terminal after installing Node.js and MySQL.

---

## STEP 1 — Verify Installations

Open PowerShell / Terminal and run:

```bash
node -v
npm -v
mysql --version
```

Each should print a version number. If `mysql` isn't recognized, you may need to add MySQL's `bin` folder to your system PATH (search "Edit environment variables" on Windows).

---

## STEP 2 — Set Up MySQL Database

### 2.1 — Log into MySQL

```bash
mysql -u root -p
```

Enter the root password you set during MySQL installation.

### 2.2 — Run the schema file

Exit the MySQL prompt first (`exit;`), then from the `backend` folder run:

```bash
mysql -u root -p < database.sql
```

This creates:
- The `samayak_db` database
- `students`, `faculty`, `otp_verifications`, `activity_log`, `faculty_verification_codes` tables
- 3 demo faculty verification codes (see below)

### 2.3 — Demo Faculty Verification Codes

These are pre-seeded so you can test faculty signup immediately:

```
CSIT-FAC-2026
CSIT-FAC-7741
CSIT-FAC-9203
```

Each code works **once**. Add more anytime with:
```sql
INSERT INTO faculty_verification_codes (code) VALUES ('YOUR-NEW-CODE');
```

### 2.4 — Verify it worked

```bash
mysql -u root -p
USE samayak_db;
SHOW TABLES;
SELECT * FROM faculty_verification_codes;
```

You should see 5 tables and 3 codes.

---

## STEP 3 — Set Up Gmail App Password (for sending OTP emails)

Gmail blocks normal password logins from apps like this — you need a special **App Password**.

### 3.1 — Enable 2-Step Verification (required first)
1. Go to https://myaccount.google.com/security
2. Under "How you sign in to Google" → turn on **2-Step Verification** (follow the phone verification steps)

### 3.2 — Generate the App Password
1. Go to https://myaccount.google.com/apppasswords
   - (If this link doesn't work, search "App Passwords" in your Google Account search bar)
2. Under "App name," type: `Samayak Backend`
3. Click **Create**
4. Google shows you a **16-character password** like `abcd efgh ijkl mnop`
5. **Copy it** (remove the spaces) — you'll paste this into `.env` shortly

⚠️ This is NOT your Gmail password. Don't use your real password — it won't work and isn't safe to use here.

---

## STEP 4 — Configure the Backend

### 4.1 — Navigate to the backend folder

```bash
cd backend
```

### 4.2 — Install dependencies

```bash
npm install
```

This installs Express, MySQL driver, bcrypt, JWT, Nodemailer, and everything else listed in `package.json`.

### 4.3 — Create your `.env` file

Copy `.env.example` to a new file named `.env`:

```bash
copy .env.example .env
```
*(On Mac/Linux use: `cp .env.example .env`)*

### 4.4 — Edit `.env` with your real values

Open `.env` in your code editor and fill in:

```env
DB_PASSWORD=your_actual_mysql_root_password
JWT_SECRET=any_long_random_string_here
EMAIL_USER=youractualgmail@gmail.com
EMAIL_APP_PASSWORD=the16characterapppasswordwithnospaces
```

**To generate a strong JWT_SECRET**, run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output into `JWT_SECRET`.

---

## STEP 5 — Start the Backend Server

From inside the `backend` folder:

```bash
npm start
```

You should see:
```
✅ MySQL connected successfully to database: samayak_db
✅ Email service ready (Gmail)

🌿 Samayak backend running at http://localhost:5000
   Health check: http://localhost:5000/api/health
```

If you see ❌ errors instead, check the troubleshooting section below.

**Keep this terminal window open** — closing it stops the server.

---

## STEP 6 — Run the Frontend

The frontend is plain HTML/CSS/JS — no build step needed.

### Easiest way: VS Code Live Server
1. Open the `frontend` folder in VS Code
2. Install the **"Live Server"** extension if you don't have it
3. Right-click `login.html` → **Open with Live Server**
4. It opens at something like `http://127.0.0.1:5500/login.html`

### Alternative: just double-click `login.html`
This works too, but some browsers restrict local file requests. Live Server is more reliable.

> ⚠️ Make sure the URL in `frontend/config.js` matches your backend port (default: `http://localhost:5000/api`).

---

## STEP 7 — Test the Full Flow

1. Open `login.html` in your browser (backend must still be running)
2. Click **"Create one here"** to switch to Signup
3. Fill in the Student form, or switch to the Faculty tab and use code `CSIT-FAC-2026`
4. Click **Send OTP & Create Account**
5. Check the email inbox you registered with — you'll get a 6-digit code within seconds
6. Enter the code in the popup → account is created
7. Go back to Login → log in with your new credentials

If everything works, you'll see "Login successful!" and get redirected.

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| `❌ MySQL connection failed` | Check `DB_PASSWORD` in `.env` matches your real MySQL root password |
| `❌ Email transporter error` | Re-check `EMAIL_APP_PASSWORD` has no spaces; confirm 2-Step Verification is ON |
| "Cannot reach server" in browser | Backend isn't running — check the `npm start` terminal window |
| CORS error in browser console | Update `FRONTEND_URL` in `.env` to match your Live Server URL exactly |
| OTP email not arriving | Check spam folder; Gmail sometimes delays first-time sends by 1-2 minutes |
| `Error: listen EADDRINUSE :::5000` | Port 5000 is already in use — close other running servers or change `PORT` in `.env` |

---

## 📁 Project Structure Reference

```
samayak-auth/
├── backend/
│   ├── config/db.js              ← MySQL connection
│   ├── controllers/authController.js  ← All auth logic
│   ├── middleware/authMiddleware.js   ← JWT route protection
│   ├── routes/authRoutes.js      ← /api/auth/* endpoints
│   ├── routes/userRoutes.js      ← /api/user/* endpoints
│   ├── utils/mailer.js           ← OTP email sending
│   ├── database.sql              ← Run this to create DB + tables
│   ├── .env.example              ← Copy to .env and fill in
│   ├── .env                      ← YOUR real secrets (never commit!)
│   ├── package.json
│   └── server.js                 ← Start here
│
└── frontend/
    ├── login.html                ← Main login/signup page
    ├── auth.css                  ← Auth page styles
    ├── auth.js                   ← All frontend logic + API calls
    ├── config.js                 ← Backend URL config
    └── style.css                 ← Shared styles from landing page
```

---

## 🔐 Before Pushing to GitHub

Your `.env` file contains real passwords — **never commit it**. A `.gitignore` is already included that excludes it. Double check with:

```bash
git status
```

If `.env` shows up as a file to be committed, STOP and verify `.gitignore` includes `.env`.

---

## API Endpoints Reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup/start` | Submit signup form → sends OTP |
| POST | `/api/auth/signup/verify` | Submit OTP → creates account |
| POST | `/api/auth/otp/resend` | Resend OTP |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/password/forgot` | Request password reset OTP |
| POST | `/api/auth/password/reset` | Submit OTP + new password |
| GET | `/api/user/me` | Get logged-in user's profile (requires token) |
| GET | `/api/health` | Check if backend is running |

---

*You're all set! 🌿 If you get stuck on any step, the error message in your terminal usually points directly to the fix.*
