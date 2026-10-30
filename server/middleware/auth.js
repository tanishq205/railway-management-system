const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_railway_jwt_key_2026_dbms_project';

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authentication required. Authorization header missing.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid Authorization header format. Expected "Bearer <token>".' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrative privileges are required for this action.' });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  JWT_SECRET
};
