/**
 * Hacker Clicker Simulator - Authentication Routes
 * Routes pour l'authentification des joueurs et admin
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const {
  generateToken,
  verifyAdminCredentials,
  authRateLimit
} = require('../middleware/auth');
const { getUser, createUser, updateUser } = require('../utils/dataManager');

// Rate limiting for auth endpoints
const authLimiter = rateLimit(authRateLimit);

/**
 * POST /api/auth/register
 * Create a new player account
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Nom d\'utilisateur requis' });
    }
    
    // Generate unique user ID
    const userId = uuidv4();
    
    // Create new user
    const user = createUser(userId);
    user.username = username;
    user.email = email || null;
    updateUser(userId, user);
    
    // Generate JWT token
    const token = generateToken({ 
      userId, 
      username,
      isAdmin: false 
    });
    
    res.status(201).json({
      success: true,
      user: {
        id: userId,
        username,
        email: email || null
      },
      token
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

/**
 * POST /api/auth/login
 * Login player
 */
router.post('/login', authLimiter, (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId && !username) {
      return res.status(400).json({ error: 'ID ou nom d\'utilisateur requis' });
    }
    
    // Find user
    let user = null;
    if (userId) {
      user = getUser(userId);
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Generate JWT token
    const token = generateToken({ 
      userId: user.id, 
      username: user.username,
      isAdmin: false 
    });
    
    // Update last online
    updateUser(user.id, { lastOnline: Date.now() });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      token
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

/**
 * POST /api/auth/admin/login
 * Admin login
 */
router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiants requis' });
    }
    
    // Verify admin credentials
    const isValid = await verifyAdminCredentials(username, password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    // Generate admin JWT token
    const token = generateToken({ 
      username, 
      isAdmin: true 
    });
    
    res.json({
      success: true,
      token,
      admin: {
        username
      }
    });
  } catch (err) {
    console.error('[Auth] Admin login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion admin' });
  }
});

/**
 * POST /api/auth/guest
 * Quick guest login
 */
router.post('/guest', (req, res) => {
  try {
    const userId = uuidv4();
    const username = `Guest_${userId.slice(0, 6)}`;
    
    // Create guest user
    const user = createUser(userId);
    user.username = username;
    updateUser(userId, user);
    
    // Generate JWT token
    const token = generateToken({ 
      userId, 
      username,
      isAdmin: false 
    });
    
    res.status(201).json({
      success: true,
      user: {
        id: userId,
        username,
        isGuest: true
      },
      token
    });
  } catch (err) {
    console.error('[Auth] Guest login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion invité' });
  }
});

/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false });
  }
  
  const { verifyToken } = require('../middleware/auth');
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({ valid: false });
  }
  
  // Get user data
  const user = getUser(decoded.userId);
  
  res.json({
    valid: true,
    user: decoded,
    userData: user
  });
});

module.exports = router;