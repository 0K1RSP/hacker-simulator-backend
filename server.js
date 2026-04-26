/**
 * Hacker Clicker Simulator - Main Server
 * Serveur principal avec Express et Socket.IO
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Import modules
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const adminRoutes = require('./routes/admin');
const { authenticateToken, authenticateAdmin } = require('./middleware/auth');
const { saveAllData, loadData } = require('./utils/dataManager');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configuration
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'gameData.json');

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware (must be after routes but before wildcard)
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Serve game frontend - Only match non-API routes
// Use regex pattern for Express 5 compatibility
app.get(/^(?!\/api|\/admin).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO connection handling
const connectedPlayers = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Player connected: ${socket.id}`);
  connectedPlayers.set(socket.id, { connectedAt: Date.now() });

  socket.on('joinGame', (data) => {
    if (data.userId) {
      socket.join(`user_${data.userId}`);
      connectedPlayers.set(socket.id, { 
        ...connectedPlayers.get(socket.id), 
        userId: data.userId 
      });
      console.log(`[Socket] Player ${data.userId} joined game room`);
    }
  });

  socket.on('click', (data) => {
    socket.to(`user_${data.userId}`).emit('clickEffect', {
      x: data.x,
      y: data.y,
      amount: data.amount
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Player disconnected: ${socket.id}`);
    connectedPlayers.delete(socket.id);
  });
});

// Global announcement system
io.announce = (title, message, type = 'info') => {
  io.emit('announcement', { title, message, type, timestamp: Date.now() });
};

// Broadcast game stats periodically
setInterval(() => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      io.emit('globalStats', {
        totalPlayers: data.stats?.totalPlayers || 0,
        totalLinesCoded: data.stats?.totalLinesCoded || 0,
        totalPets: data.stats?.totalPets || 0,
        totalAscensions: data.stats?.totalAscensions || 0,
        activePlayers: connectedPlayers.size
      });
    }
  } catch (err) {
    console.error('[Stats] Error broadcasting stats:', err);
  }
}, 30000);

// Auto-save every 5 minutes
setInterval(() => {
  console.log('[System] Auto-saving...');
  saveAllData();
}, 5 * 60 * 1000);

// Server startup
async function startServer() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing data or initialize
    loadData();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎮  HACKER CLICKER SIMULATOR - Server Started          ║
║                                                           ║
║   🌐  URL: http://0.0.0.0:${PORT}                        ║
║   📡  WebSocket: Active                                   ║
║   💾  Data: ${DATA_FILE}                            ║
║                                                           ║
║   Default Admin: ansaru / ansarudev                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('[Startup] Error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[System] Shutting down...');
  saveAllData();
  server.close(() => {
    process.exit(0);
  });
});

startServer();

module.exports = { app, server, io };