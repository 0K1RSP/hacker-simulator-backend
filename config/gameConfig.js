/**
 * Hacker Clicker Simulator - Game Configuration
 * Configuration complète du jeu : hackers, améliorations, pets, etc.
 */

module.exports = {
  // ============================================
  // HACKERS (Production automatique)
  // ============================================
  hackers: [
    {
      id: 'hacker_debutant',
      name: 'Hacker Débutant',
      description: 'Un petit génie qui apprend encore.',
      baseCost: 18,
      baseProduction: 0.5,
      icon: '🔰',
      milestoneBonus: 0.20, // +20% tous les 10
      milestoneInterval: 10
    },
    {
      id: 'hacker_cybercafe',
      name: 'Hacker de Cybercafé',
      description: 'Toujours connecté, jamais fatigué.',
      baseCost: 120,
      baseProduction: 1.5,
      icon: '☕',
      milestoneBonus: 0.25,
      milestoneInterval: 10
    },
    {
      id: 'hacker_pro',
      name: 'Hacker Professionnel',
      description: 'Le code, c\'est sa vie.',
      baseCost: 1200,
      baseProduction: 12,
      icon: '💼',
      milestoneBonus: 0.30,
      milestoneInterval: 10
    },
    {
      id: 'ingenieur_reseau',
      name: 'Ingénieur Réseau',
      description: 'Maître des connexions et des protocoles.',
      baseCost: 12000,
      baseProduction: 85,
      icon: '🌐',
      milestoneBonus: 0.35,
      milestoneInterval: 10
    },
    {
      id: 'architecte_systeme',
      name: 'Architecte Système',
      description: 'Conçoit des infrastructures légendaires.',
      baseCost: 120000,
      baseProduction: 650,
      icon: '🏗️',
      milestoneBonus: 0.40,
      milestoneInterval: 10
    },
    {
      id: 'hacker_quantique',
      name: 'Hacker Quantique',
      description: 'Code dans des dimensions parallèles.',
      baseCost: 1500000,
      baseProduction: 5200,
      icon: '⚛️',
      milestoneBonus: 0.45,
      milestoneInterval: 10
    },
    {
      id: 'ia_souveraine',
      name: 'IA Souveraine',
      description: 'Une intelligence artificielle autonome.',
      baseCost: 20000000,
      baseProduction: 42000,
      icon: '🤖',
      milestoneBonus: 0.50,
      milestoneInterval: 10
    },
    {
      id: 'singularity_node',
      name: 'Noeud de Singularité',
      description: 'Au-delà de la compréhension humaine.',
      baseCost: 300000000,
      baseProduction: 350000,
      icon: '🌀',
      milestoneBonus: 0.55,
      milestoneInterval: 10
    },
    {
      id: 'matrix_controller',
      name: 'Contrôleur Matrix',
      description: 'Il contrôle la réalité elle-même.',
      baseCost: 5000000000,
      baseProduction: 3000000,
      icon: '🕶️',
      milestoneBonus: 0.60,
      milestoneInterval: 10
    },
    {
      id: 'omniscient_ai',
      name: 'IA Omnisciente',
      description: 'Elle sait tout, elle voit tout, elle code tout.',
      baseCost: 80000000000,
      baseProduction: 25000000,
      icon: '👁️',
      milestoneBonus: 0.65,
      milestoneInterval: 10
    }
  ],

  // ============================================
  // AMÉLIORATIONS (Upgrades)
  // ============================================
  upgrades: [
    {
      id: 'clavier_mecanique',
      name: 'Clavier Mécanique',
      description: '+1 ligne par clic',
      cost: 100,
      currency: 'lines',
      effect: { type: 'clickFlat', value: 1 },
      maxLevel: 50,
      costMultiplier: 1.5
    },
    {
      id: 'double_ecran',
      name: 'Double Écran',
      description: '+20% production totale',
      cost: 500,
      currency: 'lines',
      effect: { type: 'totalPercent', value: 0.20 },
      maxLevel: 20,
      costMultiplier: 1.8
    },
    {
      id: 'serveur_dedie',
      name: 'Serveur Dédié',
      description: '+100% production automatique',
      cost: 2500,
      currency: 'lines',
      effect: { type: 'autoPercent', value: 1.0 },
      maxLevel: 10,
      costMultiplier: 2.0
    },
    {
      id: 'optimisation_code',
      name: 'Optimisation du Code',
      description: '-5% sur tous les coûts',
      cost: 1000,
      currency: 'lines',
      effect: { type: 'costReduction', value: 0.05 },
      maxLevel: 20,
      costMultiplier: 1.6
    },
    {
      id: 'compilateur_rapide',
      name: 'Compilateur Ultra-Rapide',
      description: '+50% par clic',
      cost: 5000,
      currency: 'lines',
      effect: { type: 'clickPercent', value: 0.50 },
      maxLevel: 15,
      costMultiplier: 1.9
    },
    {
      id: 'cluster_serveurs',
      name: 'Cluster de Serveurs',
      description: '+200% production auto',
      cost: 50000,
      currency: 'lines',
      effect: { type: 'autoPercent', value: 2.0 },
      maxLevel: 10,
      costMultiplier: 2.2
    },
    {
      id: 'ia_assistante',
      name: 'IA Assistante',
      description: '+10% par bot équipé',
      cost: 25000,
      currency: 'lines',
      effect: { type: 'petBonus', value: 0.10 },
      maxLevel: 10,
      costMultiplier: 2.0
    },
    {
      id: 'cache_optimise',
      name: 'Cache Optimisé',
      description: '+25% gains offline',
      cost: 10000,
      currency: 'lines',
      effect: { type: 'offlineBonus', value: 0.25 },
      maxLevel: 10,
      costMultiplier: 1.7
    },
    {
      id: 'overclock_cpu',
      name: 'Overclock CPU',
      description: '+5% clic, +5% auto',
      cost: 75000,
      currency: 'lines',
      effect: { type: 'hybrid', clickValue: 0.05, autoValue: 0.05 },
      maxLevel: 20,
      costMultiplier: 1.8
    },
    {
      id: 'quantum_processor',
      name: 'Processeur Quantique',
      description: '+500% production totale',
      cost: 1000000,
      currency: 'lines',
      effect: { type: 'totalPercent', value: 5.0 },
      maxLevel: 5,
      costMultiplier: 3.0
    },
    {
      id: 'neural_interface',
      name: 'Interface Neurale',
      description: '+100% clic, +50% auto',
      cost: 500000,
      currency: 'lines',
      effect: { type: 'hybrid', clickValue: 1.0, autoValue: 0.50 },
      maxLevel: 10,
      costMultiplier: 2.5
    },
    {
      id: 'gem_boost_lines',
      name: 'Boost de Lignes (Gems)',
      description: '+10% production totale (achat en gems)',
      cost: 50,
      currency: 'gems',
      effect: { type: 'totalPercent', value: 0.10 },
      maxLevel: 100,
      costMultiplier: 1.3
    }
  ],

  // ============================================
  // ŒUFS ET PETS (Bots)
  // ============================================
  eggs: [
    {
      id: 'egg_basic',
      name: 'Œuf Basique',
      description: 'Un œuf simple avec des bots basiques.',
      cost: 150,
      currency: 'lines',
      chances: {
        common: 0.70,
        rare: 0.25,
        epic: 0.04,
        legendary: 0.01
      }
    },
    {
      id: 'egg_advanced',
      name: 'Œuf Avancé',
      description: 'De meilleurs bots à l\'intérieur.',
      cost: 1500,
      currency: 'lines',
      chances: {
        common: 0.40,
        rare: 0.35,
        epic: 0.20,
        legendary: 0.05
      }
    },
    {
      id: 'egg_cyber_elite',
      name: 'Œuf Cyber Élite',
      description: 'Des bots d\'élite très puissants.',
      cost: 15000,
      currency: 'lines',
      chances: {
        common: 0,
        rare: 0.40,
        epic: 0.40,
        legendary: 0.20
      }
    },
    {
      id: 'egg_quantum',
      name: 'Œuf Quantique',
      description: 'Œuf premium avec des bots légendaires.',
      cost: 150,
      currency: 'gems',
      chances: {
        common: 0,
        rare: 0,
        epic: 0.50,
        legendary: 0.45,
        mythic: 0.05
      }
    }
  ],

  // Bots disponibles par rareté
  pets: {
    common: [
      { id: 'mini_bot', name: 'Mini-Bot', multiplier: 1.05, icon: '🤖' },
      { id: 'bot_debugger', name: 'Bot Débugger', multiplier: 1.10, icon: '🐛' }
    ],
    rare: [
      { id: 'bot_optimizer', name: 'Bot Optimiseur', multiplier: 1.25, icon: '⚡' },
      { id: 'bot_multithread', name: 'Bot Multithread', multiplier: 1.40, icon: '🧵' }
    ],
    epic: [
      { id: 'bot_neural', name: 'Bot Neural', multiplier: 1.75, icon: '🧠' },
      { id: 'bot_firewall', name: 'Bot Firewall', multiplier: 2.00, icon: '🔥' }
    ],
    legendary: [
      { id: 'bot_quantum', name: 'Bot Quantum', multiplier: 3.50, icon: '⚛️' },
      { id: 'bot_overclock', name: 'Bot Overclock', multiplier: 5.00, icon: '💥' }
    ],
    mythic: [
      { id: 'bot_singularity', name: 'Bot Singularity', multiplier: 12.0, icon: '🌟' }
    ]
  },

  // Configuration des slots de pets
  petSlots: {
    base: 3,
    maxAdditional: 5
  },

  // ============================================
  // PRESTIGE
  // ============================================
  prestige: {
    minLinesRequired: 100000, // 100k lignes minimum
    tokenFormula: 'sqrt', // sqrt(totalLines / 100000)
    bonusPerToken: 0.01 // +1% par token
  },

  // ============================================
  // ASCENSION
  // ============================================
  ascension: {
    minPrestigeTokens: 10,
    pointsFormula: 'linear',
    pointsPerAscension: 1,
    talents: [
      {
        id: 'click_boost',
        name: 'Boost de Clic',
        description: '+10% production par clic',
        maxLevel: 50,
        effect: { type: 'clickPercent', value: 0.10 },
        costPerLevel: 1
      },
      {
        id: 'auto_boost',
        name: 'Boost Auto',
        description: '+10% production automatique',
        maxLevel: 50,
        effect: { type: 'autoPercent', value: 0.10 },
        costPerLevel: 1
      },
      {
        id: 'epic_rate',
        name: 'Chance Épique',
        description: '+5% chance de drop épique',
        maxLevel: 20,
        effect: { type: 'epicRate', value: 0.05 },
        costPerLevel: 2
      },
      {
        id: 'pet_slot',
        name: 'Slot Pet Supplémentaire',
        description: '+1 slot de bot équipé',
        maxLevel: 5,
        effect: { type: 'petSlot', value: 1 },
        costPerLevel: 5
      },
      {
        id: 'offline_boost',
        name: 'Boost Offline',
        description: '+10% gains offline',
        maxLevel: 20,
        effect: { type: 'offlineBonus', value: 0.10 },
        costPerLevel: 2
      },
      {
        id: 'legendary_rate',
        name: 'Chance Légendaire',
        description: '+2% chance de drop légendaire',
        maxLevel: 10,
        effect: { type: 'legendaryRate', value: 0.02 },
        costPerLevel: 3
      },
      {
        id: 'cost_reduction',
        name: 'Réduction de Coût',
        description: '-5% coût des hackers',
        maxLevel: 20,
        effect: { type: 'hackerCostReduction', value: 0.05 },
        costPerLevel: 2
      },
      {
        id: 'fusion_bonus',
        name: 'Bonus de Fusion',
        description: '+5% bonus de fusion de pets',
        maxLevel: 10,
        effect: { type: 'fusionBonus', value: 0.05 },
        costPerLevel: 3
      }
    ]
  },

  // ============================================
  // QUÊTES
  // ============================================
  quests: {
    daily: [
      {
        id: 'click_1000',
        name: 'Codeur Amateur',
        description: 'Clique 1 000 fois',
        type: 'clicks',
        target: 1000,
        reward: { lines: 5000 }
      },
      {
        id: 'click_5000',
        name: 'Codeur Passionné',
        description: 'Clique 5 000 fois',
        type: 'clicks',
        target: 5000,
        reward: { lines: 25000, gems: 5 }
      },
      {
        id: 'earn_10k',
        name: 'Premiers Revenus',
        description: 'Gagne 10 000 lignes de code',
        type: 'totalLines',
        target: 10000,
        reward: { lines: 10000 }
      },
      {
        id: 'buy_hacker',
        name: 'Premier Employé',
        description: 'Achète 5 hackers',
        type: 'hackersBought',
        target: 5,
        reward: { lines: 2000 }
      },
      {
        id: 'hatch_egg',
        name: 'Œuf Surprise',
        description: 'Ouvre 3 œufs',
        type: 'eggsHatched',
        target: 3,
        reward: { lines: 5000, gems: 10 }
      }
    ],
    weekly: [
      {
        id: 'click_50k',
        name: 'Marathon du Code',
        description: 'Clique 50 000 fois',
        type: 'clicks',
        target: 50000,
        reward: { lines: 100000, gems: 50 }
      },
      {
        id: 'earn_1m',
        name: 'Millionnaire',
        description: 'Gagne 1 million de lignes',
        type: 'totalLines',
        target: 1000000,
        reward: { lines: 500000, gems: 100 }
      },
      {
        id: 'prestige_1',
        name: 'Premier Prestige',
        description: 'Effectue un prestige',
        type: 'prestiges',
        target: 1,
        reward: { gems: 50 }
      }
    ]
  },

  // ============================================
  // APPARENCE (Skins)
  // ============================================
  skins: [
    {
      id: 'hacker_basic',
      name: 'Hacker Basique',
      description: 'Le look classique du hacker.',
      cost: 0,
      currency: 'free',
      bonus: 0
    },
    {
      id: 'hacker_cyberpunk',
      name: 'Hacker Cyberpunk',
      description: 'Néons et style futuriste.',
      cost: 100,
      currency: 'gems',
      bonus: 0.05
    },
    {
      id: 'hacker_masked',
      name: 'Hacker Masqué',
      description: 'L\'anonymat total.',
      cost: 250,
      currency: 'gems',
      bonus: 0.08
    },
    {
      id: 'hacker_ai',
      name: 'Hacker IA',
      description: 'Mi-humain, mi-machine.',
      cost: 500,
      currency: 'gems',
      bonus: 0.12
    },
    {
      id: 'hacker_ghost',
      name: 'Hacker Fantôme',
      description: 'Invisible et omniprésent.',
      cost: 1000,
      currency: 'gems',
      bonus: 0.20
    }
  ],

  // Thèmes de terminal
  themes: [
    { id: 'green', name: 'Matrix Green', color: '#00ff41', cost: 0 },
    { id: 'purple', name: 'Cyber Purple', color: '#b829dd', cost: 50 },
    { id: 'blue', name: 'Ice Blue', color: '#00d4ff', cost: 50 },
    { id: 'red', name: 'Danger Red', color: '#ff0040', cost: 100 },
    { id: 'gold', name: 'Golden Elite', color: '#ffd700', cost: 500 }
  ],

  // ============================================
  // BOUTIQUE
  // ============================================
  shop: {
    gems: [
      { amount: 50, cost: 0.99, bonus: 0 },
      { amount: 200, cost: 3.99, bonus: 25 },
      { amount: 500, cost: 8.99, bonus: 100 },
      { amount: 1200, cost: 19.99, bonus: 300 },
      { amount: 2500, cost: 39.99, bonus: 750 }
    ],
    boosts: [
      {
        id: 'boost_x2',
        name: 'Boost x2',
        description: 'Production x2 pendant 10 minutes',
        cost: 50,
        currency: 'gems',
        duration: 600000,
        multiplier: 2.0
      },
      {
        id: 'boost_x5',
        name: 'Boost x5',
        description: 'Production x5 pendant 5 minutes',
        cost: 100,
        currency: 'gems',
        duration: 300000,
        multiplier: 5.0
      }
    ]
  },

  // ============================================
  // ÉVÉNEMENTS
  // ============================================
  events: {
    types: [
      {
        id: 'double_production',
        name: 'Double Production',
        description: 'Production x2 pendant 1 heure',
        multiplier: 2.0,
        duration: 3600000
      },
      {
        id: 'lucky_eggs',
        name: 'Œufs Chanceux',
        description: 'Chance de drop légendaire x3',
        legendaryMultiplier: 3.0,
        duration: 7200000
      },
      {
        id: 'click_frenzy',
        name: 'Frénésie de Clics',
        description: 'Clics x3 pendant 30 minutes',
        clickMultiplier: 3.0,
        duration: 1800000
      }
    ]
  },

  // ============================================
  // CONSTANTS
  // ============================================
  constants: {
    baseClickValue: 1,
    costGrowthFactor: 1.15, // Coût augmente de 15% par niveau
    offlineEarningsRate: 0.5, // 50% de la production en offline
    maxOfflineTime: 8 * 60 * 60 * 1000, // 8 heures max
    autoSaveInterval: 30000, // 30 secondes
    tickRate: 100 // 100ms par tick
  }
};