// server.js
// Entry point — starts the Express server.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes      = require('./routes/authRoutes');
const userRoutes      = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const facultyRoutes   = require('./routes/facultyRoutes');

const app = express();

const path = require('path');

// ── Middleware ──
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIX 2: Serve uploaded files (timetable images, syllabus PDFs) statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──
app.use('/api/auth',      authRoutes);
app.use('/api/user',      userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/faculty',   facultyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Samayak backend is running 🌿' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Global error handler (safety net)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🌿 Samayak backend running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
