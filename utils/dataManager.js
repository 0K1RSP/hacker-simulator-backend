/**
 * Hacker Clicker Simulator - Data Manager
 * Gestion de la sauvegarde et chargement des données
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const GAME_DATA_FILE = path.join(DATA_DIR, 'gameData.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// In-memory data store
let gameData = null;
let users = null;

/**
 * Initialize default game data structure
 */
function getDefaultGameData() {
  return {
    stats: {
      totalPlayers: 0,
      totalLinesCoded: 0,
      totalPets: 0,
      totalAscensions: 0,
      createdAt: Date.now()
    },
    events: {
      active: [],
      scheduled: []
    },
    announcements: [],
    polls: [],
    leaderboard: {
      byLines: [],
      byAscensions: [],
      byPets: []
    }
  };
}

/**
 * Initialize default user data structure
 */
function getDefaultUserData(userId) {
  return {
    id: userId,
    createdAt: Date.now(),
    lastSave: Date.now(),
    lastOnline: Date.now(),
    
    // Resources
    lines: 0,
    totalLines: 0,
    gems: 0,
    cryptoTokens: 0,
    
    // Progression
    prestigeCount: 0,
    ascensionCount: 0,
    ascensionPoints: 0,
    
    // Stats
    totalClicks: 0,
    totalHackersBought: 0,
    totalEggsHatched: 0,
    
    // Hackers (id -> { count, level })
    hackers: {},
    
    // Upgrades (id -> level)
    upgrades: {},
    
    // Pets
    pets: [], // [{ id, rarity, level, equipped }]
    equippedPets: [],
    
    // Appearance
    currentSkin: 'hacker_basic',
    currentTheme: 'green',
    unlockedSkins: ['hacker_basic'],
    unlockedThemes: ['green'],
    
    // Quests
    dailyQuests: [],
    weeklyQuests: [],
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
    completedQuests: [],
    
    // Active boosts
    boosts: [],
    
    // Settings
    settings: {
      soundEnabled: true,
      notificationsEnabled: true
    },
    
    // Activity
    totalPlayTime: 0,
    lastActivity: Date.now()
  };
}

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load game data from file
 */
function loadData() {
  ensureDataDir();
  
  try {
    if (fs.existsSync(GAME_DATA_FILE)) {
      gameData = JSON.parse(fs.readFileSync(GAME_DATA_FILE, 'utf8'));
    } else {
      gameData = getDefaultGameData();
      saveGameData();
    }
  } catch (err) {
    console.error('[DataManager] Error loading game data:', err);
    gameData = getDefaultGameData();
  }
  
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } else {
      users = {};
      saveUsersData();
    }
  } catch (err) {
    console.error('[DataManager] Error loading users:', err);
    users = {};
  }
  
  console.log('[DataManager] Data loaded successfully');
  return { gameData, users };
}

/**
 * Save game data to file
 */
function saveGameData() {
  try {
    ensureDataDir();
    fs.writeFileSync(GAME_DATA_FILE, JSON.stringify(gameData, null, 2));
  } catch (err) {
    console.error('[DataManager] Error saving game data:', err);
  }
}

/**
 * Save users data to file
 */
function saveUsersData() {
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('[DataManager] Error saving users:', err);
  }
}

/**
 * Save all data
 */
function saveAllData() {
  saveGameData();
  saveUsersData();
  console.log('[DataManager] All data saved');
}

/**
 * Get game data
 */
function getGameData() {
  if (!gameData) loadData();
  return gameData;
}

/**
 * Update game data
 */
function updateGameData(updates) {
  if (!gameData) loadData();
  gameData = { ...gameData, ...updates };
  return gameData;
}

/**
 * Get all users
 */
function getAllUsers() {
  if (!users) loadData();
  return users;
}

/**
 * Get user by ID
 */
function getUser(userId) {
  if (!users) loadData();
  return users[userId] || null;
}

/**
 * Create new user
 */
function createUser(userId) {
  if (!users) loadData();
  
  const newUser = getDefaultUserData(userId);
  users[userId] = newUser;
  
  // Update stats
  gameData.stats.totalPlayers = Object.keys(users).length;
  
  saveUsersData();
  return newUser;
}

/**
 * Update user data
 */
function updateUser(userId, updates) {
  if (!users) loadData();
  
  if (!users[userId]) {
    return createUser(userId);
  }
  
  users[userId] = { 
    ...users[userId], 
    ...updates,
    lastSave: Date.now()
  };
  
  return users[userId];
}

/**
 * Delete user
 */
function deleteUser(userId) {
  if (!users) loadData();
  
  if (users[userId]) {
    delete users[userId];
    saveUsersData();
    return true;
  }
  return false;
}

/**
 * Get user count
 */
function getUserCount() {
  if (!users) loadData();
  return Object.keys(users).length;
}

/**
 * Update global stats
 */
function updateGlobalStats(updates) {
  if (!gameData) loadData();
  
  gameData.stats = { ...gameData.stats, ...updates };
  return gameData.stats;
}

/**
 * Add announcement
 */
function addAnnouncement(announcement) {
  if (!gameData) loadData();
  
  gameData.announcements.unshift({
    ...announcement,
    id: Date.now().toString(),
    createdAt: Date.now()
  });
  
  // Keep only last 50 announcements
  if (gameData.announcements.length > 50) {
    gameData.announcements = gameData.announcements.slice(0, 50);
  }
  
  return gameData.announcements[0];
}

/**
 * Get announcements
 */
function getAnnouncements(limit = 10) {
  if (!gameData) loadData();
  return gameData.announcements.slice(0, limit);
}

/**
 * Add active event
 */
function addActiveEvent(event) {
  if (!gameData) loadData();
  
  gameData.events.active.push({
    ...event,
    startedAt: Date.now()
  });
  
  return gameData.events.active[gameData.events.active.length - 1];
}

/**
 * Get active events
 */
function getActiveEvents() {
  if (!gameData) loadData();
  
  const now = Date.now();
  gameData.events.active = gameData.events.active.filter(e => 
    !e.endTime || e.endTime > now
  );
  
  return gameData.events.active;
}

/**
 * Add poll
 */
function addPoll(poll) {
  if (!gameData) loadData();
  
  gameData.polls.push({
    ...poll,
    id: Date.now().toString(),
    createdAt: Date.now(),
    votes: {}
  });
  
  return gameData.polls[gameData.polls.length - 1];
}

/**
 * Get polls
 */
function getPolls(activeOnly = false) {
  if (!gameData) loadData();
  
  if (activeOnly) {
    const now = Date.now();
    return gameData.polls.filter(p => !p.endTime || p.endTime > now);
  }
  
  return gameData.polls;
}

/**
 * Vote on poll
 */
function voteOnPoll(pollId, optionIndex, userId) {
  if (!gameData) loadData();
  
  const poll = gameData.polls.find(p => p.id === pollId);
  if (!poll) return null;
  
  if (!poll.votes[userId]) {
    poll.votes[userId] = optionIndex;
  } else {
    poll.votes[userId] = optionIndex; // Allow changing vote
  }
  
  return poll;
}

module.exports = {
  loadData,
  saveAllData,
  saveGameData,
  saveUsersData,
  getGameData,
  updateGameData,
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserCount,
  updateGlobalStats,
  addAnnouncement,
  getAnnouncements,
  addActiveEvent,
  getActiveEvents,
  addPoll,
  getPolls,
  voteOnPoll,
  getDefaultUserData
};