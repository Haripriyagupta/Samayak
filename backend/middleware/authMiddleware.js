// middleware/authMiddleware.js
// Protects routes that require a logged-in user (e.g. dashboard APIs later).

const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    req.user = decoded; // { id, role, email, name }
    next();
  });
}

module.exports = { verifyToken };
