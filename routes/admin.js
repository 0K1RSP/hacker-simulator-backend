/**
 * Hacker Clicker Simulator - Admin Routes
 * Routes pour le panneau d'administration
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserCount,
  getGameData,
  updateGameData,
  updateGlobalStats,
  addAnnouncement,
  getAnnouncements,
  addActiveEvent,
  getActiveEvents,
  addPoll,
  getPolls,
  voteOnPoll
} = require('../utils/dataManager');
const {
  calculateFinalClickValue,
  calculateFinalAutoProduction,
  formatNumber
} = require('../utils/gameLogic');
const gameConfig = require('../config/gameConfig');

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes' }
});

// Apply rate limiting to all admin routes
router.use(adminLimiter);

// ============================================
// DASHBOARD
// ============================================

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
router.get('/dashboard', authenticateAdmin, (req, res) => {
  try {
    const gameData = getGameData();
    const users = getAllUsers();
    const userCount = Object.keys(users).length;
    
    // Calculate totals
    let totalLines = 0;
    let totalGems = 0;
    let totalPets = 0;
    let totalAscensions = 0;
    let activePlayers = 0;
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    Object.values(users).forEach(user => {
      totalLines += user.totalLines || 0;
      totalGems += user.gems || 0;
      totalPets += (user.pets || []).length;
      totalAscensions += user.ascensionCount || 0;
      if ((user.lastOnline || 0) > oneHourAgo) {
        activePlayers++;
      }
    });
    
    // Get top players
    const topPlayers = Object.values(users)
      .sort((a, b) => (b.totalLines || 0) - (a.totalLines || 0))
      .slice(0, 10)
      .map(user => ({
        id: user.id,
        username: user.username,
        totalLines: user.totalLines || 0,
        ascensionCount: user.ascensionCount || 0,
        petCount: (user.pets || []).length
      }));
    
    res.json({
      success: true,
      dashboard: {
        stats: {
          totalPlayers: userCount,
          totalLines,
          totalGems,
          totalPets,
          totalAscensions,
          activePlayers
        },
        topPlayers,
        activeEvents: gameData.events?.active || [],
        recentAnnouncements: gameData.announcements?.slice(0, 5) || []
      }
    });
  } catch (err) {
    console.error('[Admin] Dashboard error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du dashboard' });
  }
});

// ============================================
// PLAYER MANAGEMENT
// ============================================

/**
 * GET /api/admin/players
 * Get list of all players with optional search/filter
 */
router.get('/players', authenticateAdmin, (req, res) => {
  try {
    const { search, page = 1, limit = 20, sortBy = 'totalLines', order = 'desc' } = req.query;
    const users = getAllUsers();
    
    let playerList = Object.values(users);
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      playerList = playerList.filter(user => 
        (user.username && user.username.toLowerCase().includes(searchLower)) ||
        (user.id && user.id.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort
    playerList.sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedList = playerList.slice(startIndex, endIndex);
    
    // Enrich with production data
    const enrichedList = paginatedList.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      lines: user.lines || 0,
      totalLines: user.totalLines || 0,
      gems: user.gems || 0,
      cryptoTokens: user.cryptoTokens || 0,
      prestigeCount: user.prestigeCount || 0,
      ascensionCount: user.ascensionCount || 0,
      ascensionPoints: user.ascensionPoints || 0,
      petCount: (user.pets || []).length,
      hackerCount: Object.values(user.hackers || {}).reduce((sum, h) => sum + (h.count || 0), 0),
      totalClicks: user.totalClicks || 0,
      createdAt: user.createdAt,
      lastOnline: user.lastOnline,
      isBanned: user.isBanned || false
    }));
    
    res.json({
      success: true,
      players: enrichedList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: playerList.length,
        totalPages: Math.ceil(playerList.length / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[Admin] Get players error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des joueurs' });
  }
});

/**
 * GET /api/admin/players/:userId
 * Get detailed player profile
 */
router.get('/players/:userId', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const user = getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    // Calculate production
    const clickValue = calculateFinalClickValue(user);
    const autoProduction = calculateFinalAutoProduction(user);
    
    res.json({
      success: true,
      player: {
        ...user,
        production: {
          clickValue,
          autoProduction
        }
      }
    });
  } catch (err) {
    console.error('[Admin] Get player error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du joueur' });
  }
});

/**
 * POST /api/admin/players/:userId/give-lines
 * Give lines to a player
 */
router.post('/players/:userId/give-lines', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    user.lines = (user.lines || 0) + amount;
    user.totalLines = (user.totalLines || 0) + amount;
    updateUser(userId, user);
    
    // Log action
    logAdminAction(req.admin.username, 'give_lines', { userId, amount });
    
    res.json({
      success: true,
      message: `${formatNumber(amount)} lignes ajoutées`,
      newBalance: user.lines
    });
  } catch (err) {
    console.error('[Admin] Give lines error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de lignes' });
  }
});

/**
 * POST /api/admin/players/:userId/give-gems
 * Give gems to a player
 */
router.post('/players/:userId/give-gems', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    user.gems = (user.gems || 0) + amount;
    updateUser(userId, user);
    
    logAdminAction(req.admin.username, 'give_gems', { userId, amount });
    
    res.json({
      success: true,
      message: `${amount} gems ajoutées`,
      newBalance: user.gems
    });
  } catch (err) {
    console.error('[Admin] Give gems error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de gems' });
  }
});

/**
 * POST /api/admin/players/:userId/give-ascensions
 * Give ascensions to a player
 */
router.post('/players/:userId/give-ascensions', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    user.ascensionCount = (user.ascensionCount || 0) + amount;
    user.ascensionPoints = (user.ascensionPoints || 0) + amount;
    updateUser(userId, user);
    
    logAdminAction(req.admin.username, 'give_ascensions', { userId, amount });
    
    res.json({
      success: true,
      message: `${amount} ascensions ajoutées`,
      newAscensions: user.ascensionCount,
      newPoints: user.ascensionPoints
    });
  } catch (err) {
    console.error('[Admin] Give ascensions error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout d\'ascensions' });
  }
});

/**
 * POST /api/admin/players/:userId/give-pet
 * Give a pet to a player (by rarity, random pet from that rarity)
 */
router.post('/players/:userId/give-pet', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { rarity, level = 1 } = req.body;
    
    if (!rarity) {
      return res.status(400).json({ error: 'Rareté requise' });
    }
    
    const rarityPets = gameConfig.pets[rarity];
    if (!rarityPets || rarityPets.length === 0) {
      return res.status(400).json({ error: 'Rareté invalide' });
    }
    
    // Pick a random pet from the rarity
    const petConfig = rarityPets[Math.floor(Math.random() * rarityPets.length)];
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    if (!user.pets) user.pets = [];
    
    const newPet = {
      id: `pet_admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      petId: petConfig.id,
      name: petConfig.name,
      rarity,
      multiplier: petConfig.multiplier * (1 + ((level - 1) * 0.1)),
      icon: petConfig.icon,
      level,
      equipped: false
    };
    
    user.pets.push(newPet);
    updateUser(userId, user);
    
    // Broadcast to the player if connected
    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('petReceived', {
        pet: newPet,
        from: 'admin'
      });
    }
    
    logAdminAction(req.admin.username, 'give_pet', { userId, petId: petConfig.id, rarity, level });
    
    res.json({
      success: true,
      message: `Pet ${newPet.name} (${rarity}) ajouté!`,
      pet: newPet
    });
  } catch (err) {
    console.error('[Admin] Give pet error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du pet' });
  }
});

/**
 * POST /api/admin/players/:userId/reset
 * Reset a player's progress
 */
router.post('/players/:userId/reset', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { fullReset = false } = req.body;
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    if (fullReset) {
      // Full reset including ascension
      user.lines = 0;
      user.totalLines = 0;
      user.gems = 0;
      user.cryptoTokens = 0;
      user.hackers = {};
      user.upgrades = {};
      user.pets = [];
      user.equippedPets = [];
      user.prestigeCount = 0;
      user.ascensionCount = 0;
      user.ascensionPoints = 0;
      user.totalClicks = 0;
      user.totalHackersBought = 0;
      user.totalEggsHatched = 0;
      user.boosts = [];
      user.ascensionTalents = {};
    } else {
      // Soft reset (like prestige but keep everything else)
      user.lines = 0;
      user.hackers = {};
      user.upgrades = {};
      user.totalClicks = 0;
      user.totalHackersBought = 0;
    }
    
    updateUser(userId, user);
    
    logAdminAction(req.admin.username, 'reset_player', { userId, fullReset });
    
    res.json({
      success: true,
      message: fullReset ? 'Joueur complètement réinitialisé' : 'Progression réinitialisée'
    });
  } catch (err) {
    console.error('[Admin] Reset player error:', err);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

/**
 * POST /api/admin/players/:userId/ban
 * Ban/unban a player
 */
router.post('/players/:userId/ban', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { ban = true, reason = '' } = req.body;
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    user.isBanned = ban;
    user.banReason = reason;
    user.bannedAt = ban ? Date.now() : null;
    updateUser(userId, user);
    
    logAdminAction(req.admin.username, ban ? 'ban' : 'unban', { userId, reason });
    
    res.json({
      success: true,
      message: ban ? 'Joueur banni' : 'Joueur débanni'
    });
  } catch (err) {
    console.error('[Admin] Ban player error:', err);
    res.status(500).json({ error: 'Erreur lors du banissement' });
  }
});

/**
 * POST /api/admin/players/:userId/rename
 * Rename a player
 */
router.post('/players/:userId/rename', authenticateAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { newName } = req.body;
    
    if (!newName || newName.length < 3 || newName.length > 20) {
      return res.status(400).json({ error: 'Nom invalide (3-20 caractères)' });
    }
    
    const user = getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Joueur non trouvé' });
    }
    
    const oldName = user.username;
    user.username = newName;
    updateUser(userId, user);
    
    logAdminAction(req.admin.username, 'rename', { userId, oldName, newName });
    
    res.json({
      success: true,
      message: `Joueur renommé de ${oldName} à ${newName}`
    });
  } catch (err) {
    console.error('[Admin] Rename player error:', err);
    res.status(500).json({ error: 'Erreur lors du renommage' });
  }
});

// ============================================
// PET MANAGEMENT
// ============================================

/**
 * GET /api/admin/pets
 * Get all pet configurations
 */
router.get('/pets', authenticateAdmin, (req, res) => {
  try {
    const pets = gameConfig.pets;
    res.json({
      success: true,
      pets
    });
  } catch (err) {
    console.error('[Admin] Get pets error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des pets' });
  }
});

/**
 * GET /api/admin/eggs
 * Get all egg configurations
 */
router.get('/eggs', authenticateAdmin, (req, res) => {
  try {
    const eggs = gameConfig.eggs;
    res.json({
      success: true,
      eggs
    });
  } catch (err) {
    console.error('[Admin] Get eggs error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des œufs' });
  }
});

// ============================================
// ANNOUNCEMENTS
// ============================================

/**
 * GET /api/admin/announcements
 * Get all announcements
 */
router.get('/announcements', authenticateAdmin, (req, res) => {
  try {
    const announcements = getAnnouncements(50);
    res.json({
      success: true,
      announcements
    });
  } catch (err) {
    console.error('[Admin] Get announcements error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
  }
});

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
router.post('/announcements', authenticateAdmin, (req, res) => {
  try {
    const { title, message, type = 'info', broadcast = true } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Titre et message requis' });
    }
    
    const announcement = addAnnouncement({
      title,
      message,
      type,
      author: req.admin.username
    });
    
    // Broadcast to all connected players
    if (broadcast) {
      const io = req.app.get('io');
      if (io) {
        io.emit('announcement', {
          title,
          message,
          type,
          timestamp: Date.now()
        });
      }
    }
    
    logAdminAction(req.admin.username, 'announcement', { title, type });
    
    res.json({
      success: true,
      announcement
    });
  } catch (err) {
    console.error('[Admin] Create announcement error:', err);
    res.status(500).json({ error: 'Erreur lors de la création de l\'annonce' });
  }
});

// ============================================
// POLLS
// ============================================

/**
 * GET /api/admin/polls
 * Get all polls
 */
router.get('/polls', authenticateAdmin, (req, res) => {
  try {
    const polls = getPolls();
    
    // Calculate results
    const pollsWithResults = polls.map(poll => {
      const totalVotes = Object.keys(poll.votes || {}).length;
      const results = {};
      
      poll.options.forEach((option, index) => {
        const votes = Object.values(poll.votes || {}).filter(v => v === index).length;
        results[index] = {
          option,
          votes,
          percentage: totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0
        };
      });
      
      return {
        ...poll,
        totalVotes,
        results
      };
    });
    
    res.json({
      success: true,
      polls: pollsWithResults
    });
  } catch (err) {
    console.error('[Admin] Get polls error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des sondages' });
  }
});

/**
 * POST /api/admin/polls
 * Create a new poll
 */
router.post('/polls', authenticateAdmin, (req, res) => {
  try {
    const { question, options, duration } = req.body;
    
    if (!question || !options || options.length < 2 || options.length > 5) {
      return res.status(400).json({ error: 'Question et 2-5 options requises' });
    }
    
    const poll = addPoll({
      question,
      options,
      duration,
      endTime: duration ? Date.now() + duration : null,
      author: req.admin.username
    });
    
    // Broadcast to all connected players
    const io = req.app.get('io');
    if (io) {
      io.emit('newPoll', poll);
    }
    
    logAdminAction(req.admin.username, 'poll', { question, optionsCount: options.length });
    
    res.json({
      success: true,
      poll
    });
  } catch (err) {
    console.error('[Admin] Create poll error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du sondage' });
  }
});

// ============================================
// EVENTS
// ============================================

/**
 * GET /api/admin/events
 * Get all active events
 */
router.get('/events', authenticateAdmin, (req, res) => {
  try {
    const events = getActiveEvents();
    res.json({
      success: true,
      events
    });
  } catch (err) {
    console.error('[Admin] Get events error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
});

/**
 * POST /api/admin/events/start
 * Start a new event
 */
router.post('/events/start', authenticateAdmin, (req, res) => {
  try {
    const { type, duration, intensity = 1 } = req.body;
    
    const eventConfig = gameConfig.events.types.find(e => e.id === type);
    if (!eventConfig) {
      return res.status(400).json({ error: 'Type d\'événement invalide' });
    }
    
    const event = addActiveEvent({
      ...eventConfig,
      intensity,
      duration: duration || eventConfig.duration,
      endTime: Date.now() + (duration || eventConfig.duration)
    });
    
    // Broadcast to all connected players
    const io = req.app.get('io');
    if (io) {
      io.emit('eventStarted', event);
    }
    
    logAdminAction(req.admin.username, 'start_event', { type, duration });
    
    res.json({
      success: true,
      event
    });
  } catch (err) {
    console.error('[Admin] Start event error:', err);
    res.status(500).json({ error: 'Erreur lors du démarrage de l\'événement' });
  }
});

// ============================================
// SYSTEM UTILITIES
// ============================================

/**
 * POST /api/admin/system/backup
 * Create a manual backup
 */
router.post('/system/backup', authenticateAdmin, (req, res) => {
  try {
    const { saveAllData } = require('../utils/dataManager');
    saveAllData();
    
    logAdminAction(req.admin.username, 'backup');
    
    res.json({
      success: true,
      message: 'Sauvegarde effectuée avec succès'
    });
  } catch (err) {
    console.error('[Admin] Backup error:', err);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

/**
 * GET /api/admin/system/export
 * Export all player data as JSON
 */
router.get('/system/export', authenticateAdmin, (req, res) => {
  try {
    const users = getAllUsers();
    const gameData = getGameData();
    
    // Remove sensitive data
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      stats: gameData.stats,
      players: Object.values(users).map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        lines: u.lines,
        totalLines: u.totalLines,
        gems: u.gems,
        cryptoTokens: u.cryptoTokens,
        prestigeCount: u.prestigeCount,
        ascensionCount: u.ascensionCount,
        ascensionPoints: u.ascensionPoints,
        hackers: u.hackers,
        upgrades: u.upgrades,
        pets: u.pets,
        createdAt: u.createdAt,
        lastOnline: u.lastOnline
      }))
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=hacker-simulator-export.json');
    
    res.json(exportData);
  } catch (err) {
    console.error('[Admin] Export error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

/**
 * GET /api/admin/system/logs
 * Get system logs
 */
router.get('/system/logs', authenticateAdmin, (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // In a real app, this would read from a log file
    // For now, return a placeholder
    res.json({
      success: true,
      logs: [
        { timestamp: Date.now(), level: 'info', message: 'Système démarré' },
        { timestamp: Date.now(), level: 'info', message: 'Données chargées' }
      ],
      message: 'Les logs complets sont disponibles dans les fichiers du serveur'
    });
  } catch (err) {
    console.error('[Admin] Get logs error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }
});

/**
 * POST /api/admin/system/maintenance
 * Toggle maintenance mode
 */
router.post('/system/maintenance', authenticateAdmin, (req, res) => {
  try {
    const { enabled = false, message = 'Maintenance en cours...' } = req.body;
    
    const gameData = getGameData();
    if (!gameData.maintenance) {
      gameData.maintenance = {};
    }
    
    gameData.maintenance = {
      enabled,
      message,
      toggledAt: Date.now(),
      toggledBy: req.admin.username
    };
    
    updateGameData(gameData);
    
    // Broadcast to all connected players
    const io = req.app.get('io');
    if (io) {
      io.emit('maintenanceMode', { enabled, message });
    }
    
    logAdminAction(req.admin.username, 'maintenance', { enabled, message });
    
    res.json({
      success: true,
      maintenance: gameData.maintenance
    });
  } catch (err) {
    console.error('[Admin] Maintenance toggle error:', err);
    res.status(500).json({ error: 'Erreur lors du changement de mode maintenance' });
  }
});

// ============================================
// HELPERS
// ============================================

// Simple in-memory log storage
const adminLogs = [];

function logAdminAction(username, action, details = {}) {
  adminLogs.push({
    timestamp: Date.now(),
    username,
    action,
    details
  });
  
  // Keep only last 1000 logs
  if (adminLogs.length > 1000) {
    adminLogs.splice(0, adminLogs.length - 1000);
  }
}

module.exports = router;