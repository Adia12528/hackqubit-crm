require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const pool = require('./db/pool');
const { initBuckets } = require('./config/minio');

// Routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const inboxRoutes = require('./routes/inbox');
const campaignRoutes = require('./routes/campaigns');
const offerRoutes = require('./routes/offers');
const templateRoutes = require('./routes/templates');
const dealRoutes = require('./routes/deals');
const taskRoutes = require('./routes/tasks');
const callRoutes = require('./routes/calls');
const whatsappRoutes = require('./routes/whatsapp');
const emailRoutes = require('./routes/emails');
const smsRoutes = require('./routes/sms');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = http.createServer(app);

// =============================================
// Socket.IO for Real-Time Updates
// =============================================
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('join_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// =============================================
// Middleware
// =============================================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.set('trust proxy', 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

// =============================================
// Routes
// =============================================
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: { database: 'ok', storage: 'ok' }
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

// =============================================
// Start Server
// =============================================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB & Run Migrations
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connection OK');
      try {
        const { runMigration } = require('./db/migrate');
        await runMigration();
      } catch (migErr) {
        console.warn('⚠️ Auto-migration notice:', migErr.message);
      }
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL is not reachable at localhost:5432 (' + dbErr.message + '). Database features will be offline until PostgreSQL starts.');
    }

    // Init MinIO buckets (optional on local dev)
    try {
      await initBuckets();
    } catch (minioErr) {
      console.warn('⚠️ MinIO not reachable. Call recordings & attachments will be disabled until MinIO starts:', minioErr.message);
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 HackQubit CRM Backend Running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 API:    http://localhost:${PORT}/api
🏥 Health: http://localhost:${PORT}/health
🔌 WS:     ws://localhost:${PORT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
