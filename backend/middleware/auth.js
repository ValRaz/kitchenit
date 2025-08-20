/**
 * Auth middleware
 * - Validates JWT from "Authorization: Bearer <token>"
 * - Attaches { userId } to req.user on success
 */
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};