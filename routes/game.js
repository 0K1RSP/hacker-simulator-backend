/**
 * Hacker Clicker Simulator - Game Routes
 * Routes pour les actions de jeu
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getUser, updateUser, updateGlobalStats, getGameData } = require('../utils/dataManager');
const {
  calculateFinalClickValue,
  calculateFinalAutoProduction,
  calculateHackerCost,
  calculateUpgradeCost,
  calculatePrestigeTokens,
  rollEggRarity,
  getRandomPet,
  calculateOfflineEarnings,
  checkQuestCompletion,
  calculatePetMultiplier,
  formatNumber
} = require('../utils/gameLogic');
const gameConfig = require('../config/gameConfig');

/**
 * Middleware to load and validate user
 */
function loadUser(req, res, next) {
  const user = getUser(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }
  req.gameUser = user;
  next();
}

/**
 * GET /api/game/state
 * Get complete game state for a user
 */
router.get('/state', authenticateToken, loadUser, (req, res) => {
  try {
    const user = req.gameUser;
    
    // Calculate offline earnings
    const now = Date.now();
    const offlineTime = now - (user.lastOnline || now);
    let offlineEarnings = 0;
    
    if (offlineTime > 60000) { // More than 1 minute
      offlineEarnings = calculateOfflineEarnings(user, offlineTime);
    }
    
    // Calculate current production
    const clickValue = calculateFinalClickValue(user);
    const autoProduction = calculateFinalAutoProduction(user);
    
    // Get active quests
    const dailyQuests = gameConfig.quests.daily.map(quest => {
      const check = checkQuestCompletion(user, quest);
      const completed = user.completedQuests?.includes(quest.id);
      return {
        ...quest,
        progress: check.progress,
        target: check.target,
        completed: check.completed,
        claimed: completed
      };
    });
    
    const weeklyQuests = gameConfig.quests.weekly.map(quest => {
      const check = checkQuestCompletion(user, quest);
      const completed = user.completedQuests?.includes(quest.id);
      return {
        ...quest,
        progress: check.progress,
        target: check.target,
        completed: check.completed,
        claimed: completed
      };
    });
    
    // Get available hackers with costs
    const hackers = gameConfig.hackers.map(hacker => ({
      ...hacker,
      cost: calculateHackerCost(hacker.id, user),
      owned: user.hackers?.[hacker.id]?.count || 0,
      production: hacker.baseProduction
    }));
    
    // Get available upgrades with costs
    const upgrades = gameConfig.upgrades.map(upgrade => ({
      ...upgrade,
      cost: calculateUpgradeCost(upgrade.id, user),
      level: user.upgrades?.[upgrade.id] || 0,
      maxed: upgrade.maxLevel && (user.upgrades?.[upgrade.id] || 0) >= upgrade.maxLevel
    }));
    
    // Calculate prestige
    const potentialTokens = calculatePrestigeTokens(user.totalLines || 0);
    const prestigeBonus = (user.cryptoTokens || 0) * gameConfig.prestige.bonusPerToken;
    
    // Get pet slots
    const baseSlots = gameConfig.petSlots.base;
    const bonusSlots = user.ascensionTalents?.pet_slot || 0;
    const maxSlots = baseSlots + bonusSlots;
    
    res.json({
      success: true,
      state: {
        resources: {
          lines: user.lines || 0,
          totalLines: user.totalLines || 0,
          gems: user.gems || 0,
          cryptoTokens: user.cryptoTokens || 0
        },
        production: {
          clickValue,
          autoProduction,
          offlineEarnings
        },
        progression: {
          prestigeCount: user.prestigeCount || 0,
          ascensionCount: user.ascensionCount || 0,
          ascensionPoints: user.ascensionPoints || 0,
          prestigeBonus
        },
        stats: {
          totalClicks: user.totalClicks || 0,
          totalHackersBought: user.totalHackersBought || 0,
          totalEggsHatched: user.totalEggsHatched || 0
        },
        hackers,
        upgrades,
        pets: {
          owned: user.pets || [],
          equipped: user.equippedPets || [],
          maxSlots
        },
        appearance: {
          currentSkin: user.currentSkin || 'hacker_basic',
          currentTheme: user.currentTheme || 'green',
          unlockedSkins: user.unlockedSkins || ['hacker_basic'],
          unlockedThemes: user.unlockedThemes || ['green']
        },
        quests: {
          daily: dailyQuests,
          weekly: weeklyQuests
        },
        boosts: user.boosts || [],
        ascensionTalents: user.ascensionTalents || {},
        settings: user.settings || {}
      }
    });
  } catch (err) {
    console.error('[Game] Error getting state:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'état du jeu' });
  }
});

/**
 * POST /api/game/click
 * Register a click
 */
router.post('/click', authenticateToken, loadUser, (req, res) => {
  try {
    const user = req.gameUser;
    const clickValue = calculateFinalClickValue(user);
    
    // Update user
    user.lines = (user.lines || 0) + clickValue;
    user.totalLines = (user.totalLines || 0) + clickValue;
    user.totalClicks = (user.totalClicks || 0) + 1;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    // Update global stats
    const gameData = getGameData();
    updateGlobalStats({
      totalLinesCoded: (gameData.stats.totalLinesCoded || 0) + clickValue
    });
    
    res.json({
      success: true,
      clickValue,
      lines: user.lines,
      totalLines: user.totalLines
    });
  } catch (err) {
    console.error('[Game] Click error:', err);
    res.status(500).json({ error: 'Erreur lors du clic' });
  }
});

/**
 * POST /api/game/buy-hacker
 * Buy a hacker
 */
router.post('/buy-hacker', authenticateToken, loadUser, (req, res) => {
  try {
    const { hackerId } = req.body;
    const user = req.gameUser;
    
    const hackerConfig = gameConfig.hackers.find(h => h.id === hackerId);
    if (!hackerConfig) {
      return res.status(400).json({ error: 'Hacker invalide' });
    }
    
    const cost = calculateHackerCost(hackerId, user);
    
    if (user.lines < cost) {
      return res.status(400).json({ error: 'Pas assez de lignes de code' });
    }
    
    // Deduct cost
    user.lines -= cost;
    
    // Add hacker
    if (!user.hackers) user.hackers = {};
    if (!user.hackers[hackerId]) {
      user.hackers[hackerId] = { count: 0, level: 1 };
    }
    user.hackers[hackerId].count++;
    
    // Update stats
    user.totalHackersBought = (user.totalHackersBought || 0) + 1;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    // Calculate new production
    const autoProduction = calculateFinalAutoProduction(user);
    
    res.json({
      success: true,
      hacker: {
        id: hackerId,
        count: user.hackers[hackerId].count
      },
      cost,
      lines: user.lines,
      autoProduction
    });
  } catch (err) {
    console.error('[Game] Buy hacker error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'achat du hacker' });
  }
});

/**
 * POST /api/game/buy-upgrade
 * Buy an upgrade
 */
router.post('/buy-upgrade', authenticateToken, loadUser, (req, res) => {
  try {
    const { upgradeId } = req.body;
    const user = req.gameUser;
    
    const upgradeConfig = gameConfig.upgrades.find(u => u.id === upgradeId);
    if (!upgradeConfig) {
      return res.status(400).json({ error: 'Amélioration invalide' });
    }
    
    // Check if maxed
    const currentLevel = user.upgrades?.[upgradeId] || 0;
    if (upgradeConfig.maxLevel && currentLevel >= upgradeConfig.maxLevel) {
      return res.status(400).json({ error: 'Amélioration déjà au maximum' });
    }
    
    const cost = calculateUpgradeCost(upgradeId, user);
    const currency = upgradeConfig.currency || 'lines';
    
    if (currency === 'lines' && user.lines < cost) {
      return res.status(400).json({ error: 'Pas assez de lignes de code' });
    }
    if (currency === 'gems' && user.gems < cost) {
      return res.status(400).json({ error: 'Pas assez de gems' });
    }
    
    // Deduct cost
    if (currency === 'lines') {
      user.lines -= cost;
    } else if (currency === 'gems') {
      user.gems -= cost;
    }
    
    // Add upgrade level
    if (!user.upgrades) user.upgrades = {};
    user.upgrades[upgradeId] = currentLevel + 1;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    // Calculate new production
    const clickValue = calculateFinalClickValue(user);
    const autoProduction = calculateFinalAutoProduction(user);
    
    res.json({
      success: true,
      upgrade: {
        id: upgradeId,
        level: user.upgrades[upgradeId]
      },
      lines: user.lines,
      gems: user.gems,
      cost,
      clickValue,
      autoProduction
    });
  } catch (err) {
    console.error('[Game] Buy upgrade error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'achat de l\'amélioration' });
  }
});

/**
 * POST /api/game/hatch-egg
 * Hatch an egg
 */
router.post('/hatch-egg', authenticateToken, loadUser, (req, res) => {
  try {
    const { eggId } = req.body;
    const user = req.gameUser;
    
    const eggConfig = gameConfig.eggs.find(e => e.id === eggId);
    if (!eggConfig) {
      return res.status(400).json({ error: 'Œuf invalide' });
    }
    
    const cost = eggConfig.cost;
    const currency = eggConfig.currency || 'lines';
    
    if (currency === 'lines' && user.lines < cost) {
      return res.status(400).json({ error: 'Pas assez de lignes de code' });
    }
    if (currency === 'gems' && user.gems < cost) {
      return res.status(400).json({ error: 'Pas assez de gems' });
    }
    
    // Deduct cost
    if (currency === 'lines') {
      user.lines -= cost;
    } else if (currency === 'gems') {
      user.gems -= cost;
    }
    
    // Roll for rarity
    const rarity = rollEggRarity(eggId, user);
    
    // Get random pet
    const petConfig = getRandomPet(rarity);
    if (!petConfig) {
      return res.status(500).json({ error: 'Erreur lors de l\'obtention du pet' });
    }
    
    // Add pet to collection
    if (!user.pets) user.pets = [];
    const newPet = {
      id: `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      petId: petConfig.id,
      name: petConfig.name,
      rarity,
      multiplier: petConfig.multiplier,
      icon: petConfig.icon,
      level: 1,
      equipped: false
    };
    user.pets.push(newPet);
    
    // Update stats
    user.totalEggsHatched = (user.totalEggsHatched || 0) + 1;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    // Update global stats
    const gameData = getGameData();
    updateGlobalStats({
      totalPets: (gameData.stats.totalPets || 0) + 1
    });
    
    res.json({
      success: true,
      pet: newPet,
      rarity,
      lines: user.lines,
      gems: user.gems
    });
  } catch (err) {
    console.error('[Game] Hatch egg error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'éclosion de l\'œuf' });
  }
});

/**
 * POST /api/game/equip-pet
 * Equip or unequip a pet
 */
router.post('/equip-pet', authenticateToken, loadUser, (req, res) => {
  try {
    const { petId, equip } = req.body;
    const user = req.gameUser;
    
    // Calculate max slots
    const baseSlots = gameConfig.petSlots.base;
    const bonusSlots = user.ascensionTalents?.pet_slot || 0;
    const maxSlots = baseSlots + bonusSlots;
    
    if (equip) {
      // Check if already equipped
      if (user.equippedPets?.includes(petId)) {
        return res.status(400).json({ error: 'Pet déjà équipé' });
      }
      
      // Check slot limit
      if ((user.equippedPets?.length || 0) >= maxSlots) {
        return res.status(400).json({ error: `Maximum ${maxSlots} pets équipés` });
      }
      
      // Equip pet
      if (!user.equippedPets) user.equippedPets = [];
      user.equippedPets.push(petId);
    } else {
      // Unequip pet
      if (user.equippedPets) {
        user.equippedPets = user.equippedPets.filter(id => id !== petId);
      }
    }
    
    user.lastOnline = Date.now();
    updateUser(user.id, user);
    
    // Calculate new pet multiplier and production
    const petMultiplier = calculatePetMultiplier(user);
    const clickValue = calculateFinalClickValue(user);
    const autoProduction = calculateFinalAutoProduction(user);
    
    res.json({
      success: true,
      equipped: user.equippedPets,
      lines: user.lines,
      gems: user.gems,
      petMultiplier,
      clickValue,
      autoProduction
    });
  } catch (err) {
    console.error('[Game] Equip pet error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'équipement du pet' });
  }
});

/**
 * POST /api/game/fuse-pets
 * Fuse 3 identical pets into a higher level
 */
router.post('/fuse-pets', authenticateToken, loadUser, (req, res) => {
  try {
    const { petIds } = req.body; // Array of 3 pet IDs
    
    if (!petIds || petIds.length !== 3) {
      return res.status(400).json({ error: 'Il faut exactement 3 pets pour fusionner' });
    }
    
    const user = req.gameUser;
    
    // Get the pets
    const pets = petIds.map(id => user.pets?.find(p => p.id === id)).filter(Boolean);
    
    if (pets.length !== 3) {
      return res.status(400).json({ error: 'Pets non trouvés' });
    }
    
    // Check all same type and rarity
    const firstPet = pets[0];
    const allSame = pets.every(p => 
      p.petId === firstPet.petId && 
      p.rarity === firstPet.rarity
    );
    
    if (!allSame) {
      return res.status(400).json({ error: 'Les pets doivent être identiques' });
    }
    
    // Remove old pets
    user.pets = user.pets.filter(p => !petIds.includes(p.id));
    
    // Unequip if any were equipped
    if (user.equippedPets) {
      user.equippedPets = user.equippedPets.filter(id => !petIds.includes(id));
    }
    
    // Create new fused pet
    const newLevel = firstPet.level + 1;
    const newPet = {
      ...firstPet,
      id: `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level: newLevel,
      multiplier: firstPet.multiplier * (1 + ((newLevel - 1) * 0.1))
    };
    user.pets.push(newPet);
    
    user.lastOnline = Date.now();
    updateUser(user.id, user);
    
    res.json({
      success: true,
      newPet,
      message: `Fusion réussie! ${newPet.name} niveau ${newLevel}`
    });
  } catch (err) {
    console.error('[Game] Fuse pets error:', err);
    res.status(500).json({ error: 'Erreur lors de la fusion des pets' });
  }
});

/**
 * POST /api/game/prestige
 * Perform prestige reset
 */
router.post('/prestige', authenticateToken, loadUser, (req, res) => {
  try {
    const user = req.gameUser;
    
    // Check minimum requirement
    if ((user.totalLines || 0) < gameConfig.prestige.minLinesRequired) {
      return res.status(400).json({ 
        error: `Minimum ${formatNumber(gameConfig.prestige.minLinesRequired)} lignes requises` 
      });
    }
    
    // Calculate tokens to earn
    const newTokens = calculatePrestigeTokens(user.totalLines || 0);
    
    if (newTokens === 0) {
      return res.status(400).json({ error: 'Aucun token à gagner' });
    }
    
    // Reset progress but keep tokens
    user.cryptoTokens = (user.cryptoTokens || 0) + newTokens;
    user.prestigeCount = (user.prestigeCount || 0) + 1;
    
    // Reset
    user.lines = 0;
    user.hackers = {};
    user.upgrades = {};
    user.totalClicks = 0;
    user.totalHackersBought = 0;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    const prestigeBonus = user.cryptoTokens * gameConfig.prestige.bonusPerToken;
    
    res.json({
      success: true,
      tokensEarned: newTokens,
      totalTokens: user.cryptoTokens,
      prestigeBonus,
      prestigeCount: user.prestigeCount
    });
  } catch (err) {
    console.error('[Game] Prestige error:', err);
    res.status(500).json({ error: 'Erreur lors du prestige' });
  }
});

/**
 * POST /api/game/ascend
 * Perform ascension reset
 */
router.post('/ascend', authenticateToken, loadUser, (req, res) => {
  try {
    const user = req.gameUser;
    
    // Check minimum requirement
    if ((user.cryptoTokens || 0) < gameConfig.ascension.minPrestigeTokens) {
      return res.status(400).json({ 
        error: `Minimum ${gameConfig.ascension.minPrestigeTokens} crypto tokens requis` 
      });
    }
    
    // Calculate ascension points
    const pointsEarned = gameConfig.ascension.pointsPerAscension;
    
    // Reset everything
    user.ascensionCount = (user.ascensionCount || 0) + 1;
    user.ascensionPoints = (user.ascensionPoints || 0) + pointsEarned;
    
    // Full reset
    user.lines = 0;
    user.totalLines = 0;
    user.gems = 0;
    user.cryptoTokens = 0;
    user.hackers = {};
    user.upgrades = {};
    user.pets = [];
    user.equippedPets = [];
    user.prestigeCount = 0;
    user.totalClicks = 0;
    user.totalHackersBought = 0;
    user.totalEggsHatched = 0;
    user.boosts = [];
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      pointsEarned,
      totalPoints: user.ascensionPoints,
      ascensionCount: user.ascensionCount
    });
  } catch (err) {
    console.error('[Game] Ascend error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'ascension' });
  }
});

/**
 * POST /api/game/buy-talent
 * Buy an ascension talent
 */
router.post('/buy-talent', authenticateToken, loadUser, (req, res) => {
  try {
    const { talentId } = req.body;
    const user = req.gameUser;
    
    const talentConfig = gameConfig.ascension.talents.find(t => t.id === talentId);
    if (!talentConfig) {
      return res.status(400).json({ error: 'Talent invalide' });
    }
    
    const currentLevel = user.ascensionTalents?.[talentId] || 0;
    
    if (currentLevel >= talentConfig.maxLevel) {
      return res.status(400).json({ error: 'Talent déjà au maximum' });
    }
    
    const cost = talentConfig.costPerLevel;
    
    if ((user.ascensionPoints || 0) < cost) {
      return res.status(400).json({ error: 'Pas assez de points d\'ascension' });
    }
    
    // Deduct points
    user.ascensionPoints -= cost;
    
    // Add talent level
    if (!user.ascensionTalents) user.ascensionTalents = {};
    user.ascensionTalents[talentId] = currentLevel + 1;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      talent: {
        id: talentId,
        level: user.ascensionTalents[talentId]
      }
    });
  } catch (err) {
    console.error('[Game] Buy talent error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'achat du talent' });
  }
});

/**
 * POST /api/game/buy-skin
 * Buy a skin
 */
router.post('/buy-skin', authenticateToken, loadUser, (req, res) => {
  try {
    const { skinId } = req.body;
    const user = req.gameUser;
    
    const skinConfig = gameConfig.skins.find(s => s.id === skinId);
    if (!skinConfig) {
      return res.status(400).json({ error: 'Skin invalide' });
    }
    
    // Check if already owned
    if (user.unlockedSkins?.includes(skinId)) {
      return res.status(400).json({ error: 'Skin déjà possédé' });
    }
    
    const cost = skinConfig.cost;
    if (cost > 0 && (user.gems || 0) < cost) {
      return res.status(400).json({ error: 'Pas assez de gems' });
    }
    
    // Deduct cost
    if (cost > 0) {
      user.gems -= cost;
    }
    
    // Unlock skin
    if (!user.unlockedSkins) user.unlockedSkins = ['hacker_basic'];
    user.unlockedSkins.push(skinId);
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      skinId,
      gems: user.gems
    });
  } catch (err) {
    console.error('[Game] Buy skin error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'achat du skin' });
  }
});

/**
 * POST /api/game/select-skin
 * Select current skin
 */
router.post('/select-skin', authenticateToken, loadUser, (req, res) => {
  try {
    const { skinId } = req.body;
    const user = req.gameUser;
    
    if (!user.unlockedSkins?.includes(skinId)) {
      return res.status(400).json({ error: 'Skin non possédé' });
    }
    
    user.currentSkin = skinId;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      currentSkin: skinId
    });
  } catch (err) {
    console.error('[Game] Select skin error:', err);
    res.status(500).json({ error: 'Erreur lors de la sélection du skin' });
  }
});

/**
 * POST /api/game/buy-theme
 * Buy a theme
 */
router.post('/buy-theme', authenticateToken, loadUser, (req, res) => {
  try {
    const { themeId } = req.body;
    const user = req.gameUser;
    
    const themeConfig = gameConfig.themes.find(t => t.id === themeId);
    if (!themeConfig) {
      return res.status(400).json({ error: 'Thème invalide' });
    }
    
    // Check if already owned
    if (user.unlockedThemes?.includes(themeId)) {
      return res.status(400).json({ error: 'Thème déjà possédé' });
    }
    
    const cost = themeConfig.cost;
    if (cost > 0 && (user.gems || 0) < cost) {
      return res.status(400).json({ error: 'Pas assez de gems' });
    }
    
    // Deduct cost
    if (cost > 0) {
      user.gems -= cost;
    }
    
    // Unlock theme
    if (!user.unlockedThemes) user.unlockedThemes = ['green'];
    user.unlockedThemes.push(themeId);
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      themeId,
      gems: user.gems
    });
  } catch (err) {
    console.error('[Game] Buy theme error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'achat du thème' });
  }
});

/**
 * POST /api/game/select-theme
 * Select current theme
 */
router.post('/select-theme', authenticateToken, loadUser, (req, res) => {
  try {
    const { themeId } = req.body;
    const user = req.gameUser;
    
    if (!user.unlockedThemes?.includes(themeId)) {
      return res.status(400).json({ error: 'Thème non possédé' });
    }
    
    user.currentTheme = themeId;
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      currentTheme: themeId
    });
  } catch (err) {
    console.error('[Game] Select theme error:', err);
    res.status(500).json({ error: 'Erreur lors de la sélection du thème' });
  }
});

/**
 * POST /api/game/buy-boost
 * Buy a temporary boost
 */
router.post('/buy-boost', authenticateToken, loadUser, (req, res) => {
  try {
    const { boostId } = req.body;
    const user = req.gameUser;
    
    const boostConfig = gameConfig.shop.boosts.find(b => b.id === boostId);
    if (!boostConfig) {
      return res.status(400).json({ error: 'Boost invalide' });
    }
    
    const cost = boostConfig.cost;
    if ((user.gems || 0) < cost) {
      return res.status(400).json({ error: 'Pas assez de gems' });
    }
    
    // Deduct cost
    user.gems -= cost;
    
    // Add boost
    if (!user.boosts) user.boosts = [];
    user.boosts.push({
      type: boostId.includes('x') ? 'production' : 'click',
      multiplier: boostConfig.multiplier,
      endTime: Date.now() + boostConfig.duration
    });
    
    user.lastOnline = Date.now();
    updateUser(user.id, user);
    
    res.json({
      success: true,
      boosts: user.boosts,
      gems: user.gems
    });
  } catch (err) {
    console.error('[Game] Buy boost error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'achat du boost' });
  }
});

/**
 * POST /api/game/claim-quest
 * Claim quest reward
 */
router.post('/claim-quest', authenticateToken, loadUser, (req, res) => {
  try {
    const { questId } = req.body;
    const user = req.gameUser;
    
    // Find quest
    const quest = [...gameConfig.quests.daily, ...gameConfig.quests.weekly]
      .find(q => q.id === questId);
    
    if (!quest) {
      return res.status(400).json({ error: 'Quête invalide' });
    }
    
    // Check if completed
    const check = checkQuestCompletion(user, quest);
    if (!check.completed) {
      return res.status(400).json({ error: 'Quête non terminée' });
    }
    
    // Check if already claimed
    if (user.completedQuests?.includes(questId)) {
      return res.status(400).json({ error: 'Récompense déjà réclamée' });
    }
    
    // Give rewards
    if (quest.reward.lines) {
      user.lines = (user.lines || 0) + quest.reward.lines;
      user.totalLines = (user.totalLines || 0) + quest.reward.lines;
    }
    if (quest.reward.gems) {
      user.gems = (user.gems || 0) + quest.reward.gems;
    }
    
    // Mark as completed
    if (!user.completedQuests) user.completedQuests = [];
    user.completedQuests.push(questId);
    user.lastOnline = Date.now();
    
    updateUser(user.id, user);
    
    res.json({
      success: true,
      rewards: quest.reward,
      lines: user.lines,
      gems: user.gems
    });
  } catch (err) {
    console.error('[Game] Claim quest error:', err);
    res.status(500).json({ error: 'Erreur lors de la réclamation de la quête' });
  }
});

/**
 * POST /api/game/save
 * Manual save
 */
router.post('/save', authenticateToken, loadUser, (req, res) => {
  try {
    const user = req.gameUser;
    user.lastOnline = Date.now();
    updateUser(user.id, user);
    
    res.json({
      success: true,
      message: 'Partie sauvegardée'
    });
  } catch (err) {
    console.error('[Game] Save error:', err);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

module.exports = router;