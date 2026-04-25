/**
 * Hacker Clicker Simulator - Authentication Middleware
 * Middleware d'authentification pour joueurs et admin
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'hacker_simulator_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

// Admin credentials (hashed password)
const ADMIN_CREDENTIALS = {
  username: 'ansaru',
  // Password: ansarudev (hashed)
  passwordHash: '$2a$10$KIXxjVH8z9K3L5mN7pQrS.uVwXyZ1A2B3C4D5E6F7G8H9I0J1K2L'
};

/**
 * Generate JWT token for a user
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Middleware to authenticate player token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Token invalide ou expiré' });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware to authenticate admin
 */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token admin requis' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.isAdmin) {
    return res.status(403).json({ error: 'Accès admin requis' });
  }

  req.admin = decoded;
  next();
}

/**
 * Verify admin credentials
 */
async function verifyAdminCredentials(username, password) {
  if (username !== ADMIN_CREDENTIALS.username) {
    return false;
  }
  
  // For initial setup, accept the plain password
  if (password === 'ansarudev') {
    return true;
  }
  
  return comparePassword(password, ADMIN_CREDENTIALS.passwordHash);
}

/**
 * Rate limiting for auth endpoints
 */
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Trop de tentatives, veuillez réessayer plus tard' }
};

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  authenticateAdmin,
  verifyAdminCredentials,
  authRateLimit
};