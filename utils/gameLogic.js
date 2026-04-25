/**
 * Hacker Clicker Simulator - Game Logic
 * Logique de calcul du jeu : production, coûts, multiplicateurs
 */

const gameConfig = require('../config/gameConfig');
const { getUser, updateUser, updateGlobalStats, getActiveEvents } = require('./dataManager');

const { constants } = gameConfig;

/**
 * Calculate cost for a hacker/upgrade based on owned count
 * Cost = baseCost * (costGrowthFactor ^ count)
 */
function calculateCost(baseCost, count, costMultiplier = 1) {
  return Math.floor(baseCost * Math.pow(constants.costGrowthFactor, count) * costMultiplier);
}

/**
 * Calculate total production from all hackers
 */
function calculateBaseAutoProduction(user) {
  let production = 0;
  
  for (const [hackerId, hackerData] of Object.entries(user.hackers || {})) {
    const hackerConfig = gameConfig.hackers.find(h => h.id === hackerId);
    if (hackerConfig) {
      // Base production
      let hackerProd = hackerConfig.baseProduction * hackerData.count;
      
      // Milestone bonus
      const milestones = Math.floor(hackerData.count / hackerConfig.milestoneInterval);
      const milestoneMultiplier = 1 + (milestones * hackerConfig.milestoneBonus);
      hackerProd *= milestoneMultiplier;
      
      // Level bonus
      if (hackerData.level) {
        hackerProd *= (1 + (hackerData.level - 1) * 0.1);
      }
      
      production += hackerProd;
    }
  }
  
  return production;
}

/**
 * Calculate click value
 */
function calculateClickValue(user) {
  let value = constants.baseClickValue;
  
  // Flat bonuses from upgrades
  for (const [upgradeId, level] of Object.entries(user.upgrades || {})) {
    const upgradeConfig = gameConfig.upgrades.find(u => u.id === upgradeId);
    if (upgradeConfig && level > 0) {
      if (upgradeConfig.effect.type === 'clickFlat') {
        value += upgradeConfig.effect.value * level;
      }
    }
  }
  
  return value;
}

/**
 * Calculate all multipliers for a user
 */
function calculateMultipliers(user) {
  const multipliers = {
    click: 1,
    auto: 1,
    total: 1,
    costReduction: 0,
    offlineBonus: 0,
    petBonus: 1,
    epicRate: 0,
    legendaryRate: 0,
    hackerCostReduction: 0,
    fusionBonus: 0
  };
  
  // Upgrades multipliers
  for (const [upgradeId, level] of Object.entries(user.upgrades || {})) {
    const upgradeConfig = gameConfig.upgrades.find(u => u.id === upgradeId);
    if (upgradeConfig && level > 0) {
      const effect = upgradeConfig.effect;
      const totalLevel = level; // For multi-level upgrades
      
      switch (effect.type) {
        case 'clickPercent':
          multipliers.click += effect.value * totalLevel;
          break;
        case 'autoPercent':
          multipliers.auto += effect.value * totalLevel;
          break;
        case 'totalPercent':
          multipliers.total += effect.value * totalLevel;
          break;
        case 'costReduction':
          multipliers.costReduction += effect.value * totalLevel;
          break;
        case 'offlineBonus':
          multipliers.offlineBonus += effect.value * totalLevel;
          break;
        case 'petBonus':
          multipliers.petBonus += effect.value * totalLevel;
          break;
        case 'hybrid':
          multipliers.click += effect.clickValue * totalLevel;
          multipliers.auto += effect.autoValue * totalLevel;
          break;
      }
    }
  }
  
  // Prestige bonus
  if (user.cryptoTokens > 0) {
    multipliers.total += user.cryptoTokens * gameConfig.prestige.bonusPerToken;
  }
  
  // Pet multiplier
  const petMultiplier = calculatePetMultiplier(user);
  multipliers.petBonus *= petMultiplier;
  
  // Ascension talents
  if (user.ascensionTalents) {
    for (const [talentId, level] of Object.entries(user.ascensionTalents || {})) {
      const talentConfig = gameConfig.ascension.talents.find(t => t.id === talentId);
      if (talentConfig && level > 0) {
        switch (talentConfig.effect.type) {
          case 'clickPercent':
            multipliers.click += talentConfig.effect.value * level;
            break;
          case 'autoPercent':
            multipliers.auto += talentConfig.effect.value * level;
            break;
          case 'epicRate':
            multipliers.epicRate += talentConfig.effect.value * level;
            break;
          case 'legendaryRate':
            multipliers.legendaryRate += talentConfig.effect.value * level;
            break;
          case 'hackerCostReduction':
            multipliers.hackerCostReduction += talentConfig.effect.value * level;
            break;
          case 'offlineBonus':
            multipliers.offlineBonus += talentConfig.effect.value * level;
            break;
          case 'fusionBonus':
            multipliers.fusionBonus += talentConfig.effect.value * level;
            break;
        }
      }
    }
  }
  
  // Skin bonus
  if (user.currentSkin) {
    const skinConfig = gameConfig.skins.find(s => s.id === user.currentSkin);
    if (skinConfig) {
      multipliers.total += skinConfig.bonus;
    }
  }
  
  // Active boosts
  const now = Date.now();
  for (const boost of user.boosts || []) {
    if (boost.endTime > now) {
      if (boost.type === 'production') {
        multipliers.total *= boost.multiplier;
      } else if (boost.type === 'click') {
        multipliers.click *= boost.multiplier;
      }
    }
  }
  
  // Active events
  const activeEvents = getActiveEvents();
  for (const event of activeEvents) {
    if (event.multiplier) {
      multipliers.total *= event.multiplier;
    }
    if (event.clickMultiplier) {
      multipliers.click *= event.clickMultiplier;
    }
  }
  
  return multipliers;
}

/**
 * Calculate pet multiplier from equipped pets
 */
function calculatePetMultiplier(user) {
  let multiplier = 1;
  
  const equippedPets = user.equippedPets || [];
  for (const petId of equippedPets) {
    const pet = user.pets?.find(p => p.id === petId);
    if (pet) {
      const petConfig = getPetConfig(pet.petId, pet.rarity);
      if (petConfig) {
        // Level bonus: +10% per level
        const levelBonus = 1 + ((pet.level - 1) * 0.1);
        multiplier *= petConfig.multiplier * levelBonus;
      }
    }
  }
  
  return multiplier;
}

/**
 * Get pet configuration
 */
function getPetConfig(petId, rarity) {
  const rarityPets = gameConfig.pets[rarity];
  if (rarityPets) {
    return rarityPets.find(p => p.id === petId);
  }
  return null;
}

/**
 * Calculate final click production
 */
function calculateFinalClickValue(user) {
  const baseValue = calculateClickValue(user);
  const multipliers = calculateMultipliers(user);
  
  return Math.floor(baseValue * multipliers.click * multipliers.total * multipliers.petBonus);
}

/**
 * Calculate final auto production per second
 */
function calculateFinalAutoProduction(user) {
  const baseProduction = calculateBaseAutoProduction(user);
  const multipliers = calculateMultipliers(user);
  
  return baseProduction * multipliers.auto * multipliers.total * multipliers.petBonus;
}

/**
 * Calculate hacker cost with all reductions
 */
function calculateHackerCost(hackerId, user) {
  const hackerConfig = gameConfig.hackers.find(h => h.id === hackerId);
  if (!hackerConfig) return Infinity;
  
  const owned = user.hackers?.[hackerId]?.count || 0;
  let cost = calculateCost(hackerConfig.baseCost, owned);
  
  // Apply cost reductions
  const multipliers = calculateMultipliers(user);
  cost = Math.floor(cost * (1 - multipliers.costReduction) * (1 - multipliers.hackerCostReduction));
  
  return Math.max(1, cost);
}

/**
 * Calculate upgrade cost
 */
function calculateUpgradeCost(upgradeId, user) {
  const upgradeConfig = gameConfig.upgrades.find(u => u.id === upgradeId);
  if (!upgradeConfig) return Infinity;
  
  const owned = user.upgrades?.[upgradeId] || 0;
  const cost = calculateCost(upgradeConfig.cost, owned, upgradeConfig.costMultiplier);
  
  return cost;
}

/**
 * Calculate prestige tokens earned
 */
function calculatePrestigeTokens(totalLines) {
  const { minLinesRequired, tokenFormula } = gameConfig.prestige;
  
  if (totalLines < minLinesRequired) return 0;
  
  switch (tokenFormula) {
    case 'sqrt':
      return Math.floor(Math.sqrt(totalLines / minLinesRequired));
    case 'linear':
      return Math.floor(totalLines / minLinesRequired);
    case 'log':
      return Math.floor(Math.log10(totalLines / minLinesRequired + 1) * 10);
    default:
      return Math.floor(Math.sqrt(totalLines / minLinesRequired));
  }
}

/**
 * Roll for egg rarity
 */
function rollEggRarity(eggId, user) {
  const eggConfig = gameConfig.eggs.find(e => e.id === eggId);
  if (!eggConfig) return 'common';
  
  const roll = Math.random();
  const multipliers = calculateMultipliers(user);
  
  // Apply rate bonuses from ascension talents
  let legendaryChance = eggConfig.chances.legendary || 0;
  let epicChance = eggConfig.chances.epic || 0;
  
  legendaryChance += multipliers.legendaryRate;
  epicChance += multipliers.epicRate;
  
  // Active events bonus
  const activeEvents = getActiveEvents();
  for (const event of activeEvents) {
    if (event.legendaryMultiplier) {
      legendaryChance *= event.legendaryMultiplier;
    }
  }
  
  // Roll for rarity (check from rarest to common)
  if (eggConfig.chances.mythic && roll < eggConfig.chances.mythic) {
    return 'mythic';
  }
  if (roll < legendaryChance) {
    return 'legendary';
  }
  if (roll < legendaryChance + epicChance) {
    return 'epic';
  }
  if (roll < legendaryChance + epicChance + (eggConfig.chances.rare || 0)) {
    return 'rare';
  }
  return 'common';
}

/**
 * Get random pet from rarity
 */
function getRandomPet(rarity) {
  const pets = gameConfig.pets[rarity];
  if (!pets || pets.length === 0) return null;
  
  return pets[Math.floor(Math.random() * pets.length)];
}

/**
 * Calculate offline earnings
 */
function calculateOfflineEarnings(user, offlineTime) {
  const cappedTime = Math.min(offlineTime, constants.maxOfflineTime);
  const multipliers = calculateMultipliers(user);
  
  let baseProduction = calculateBaseAutoProduction(user);
  let earnings = baseProduction * (cappedTime / 1000) * constants.offlineEarningsRate;
  
  // Apply multipliers
  earnings *= (1 + multipliers.offlineBonus) * multipliers.auto * multipliers.total * multipliers.petBonus;
  
  return Math.floor(earnings);
}

/**
 * Check if quest is completed
 */
function checkQuestCompletion(user, quest) {
  let progress = 0;
  
  switch (quest.type) {
    case 'clicks':
      progress = user.totalClicks || 0;
      break;
    case 'totalLines':
      progress = user.totalLines || 0;
      break;
    case 'hackersBought':
      progress = user.totalHackersBought || 0;
      break;
    case 'eggsHatched':
      progress = user.totalEggsHatched || 0;
      break;
    case 'prestiges':
      progress = user.prestigeCount || 0;
      break;
  }
  
  return {
    completed: progress >= quest.target,
    progress: Math.min(progress, quest.target),
    target: quest.target
  };
}

/**
 * Calculate fusion result
 */
function calculateFusion(pets) {
  if (pets.length !== 3) return null;
  
  // Check all pets are same type and rarity
  const firstPet = pets[0];
  const allSame = pets.every(p => 
    p.petId === firstPet.petId && 
    p.rarity === firstPet.rarity
  );
  
  if (!allSame) return null;
  
  const newLevel = firstPet.level + 1;
  const multipliers = calculateMultipliersForUser({ 
    ascensionTalents: pets[0].ascensionTalents 
  });
  
  const fusionBonus = 1 + ((newLevel - 1) * 0.1) + (multipliers.fusionBonus || 0);
  
  return {
    petId: firstPet.petId,
    rarity: firstPet.rarity,
    level: newLevel,
    fusionBonus
  };
}

/**
 * Helper to calculate multipliers for a partial user object
 */
function calculateMultipliersForUser(partialUser) {
  const multipliers = {
    fusionBonus: 0
  };
  
  if (partialUser.ascensionTalents) {
    for (const [talentId, level] of Object.entries(partialUser.ascensionTalents || {})) {
      const talentConfig = gameConfig.ascension.talents.find(t => t.id === talentId);
      if (talentConfig && level > 0 && talentConfig.effect.type === 'fusionBonus') {
        multipliers.fusionBonus += talentConfig.effect.value * level;
      }
    }
  }
  
  return multipliers;
}

/**
 * Format number for display
 */
function formatNumber(num) {
  if (num >= 1e18) return (num / 1e18).toFixed(2) + 'Q';
  if (num >= 1e15) return (num / 1e15).toFixed(2) + 'q';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'k';
  return Math.floor(num).toLocaleString();
}

/**
 * Format time duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}j ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

module.exports = {
  calculateCost,
  calculateBaseAutoProduction,
  calculateClickValue,
  calculateMultipliers,
  calculatePetMultiplier,
  calculateFinalClickValue,
  calculateFinalAutoProduction,
  calculateHackerCost,
  calculateUpgradeCost,
  calculatePrestigeTokens,
  rollEggRarity,
  getRandomPet,
  calculateOfflineEarnings,
  checkQuestCompletion,
  calculateFusion,
  formatNumber,
  formatDuration
};