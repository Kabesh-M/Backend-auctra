const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const connectDB = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const { logUserActivity, detectAnomalousActivity } = require('./middleware/complianceMiddleware');

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app = express();

const envOrigins = [process.env.FRONTEND_URL, process.env.CORS_ORIGIN]
  .filter(Boolean)
  .flatMap((value) => value.split(',').map((origin) => origin.trim()))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://frontend-auctra.vercel.app'
]);

const vercelPreviewRegex = /^https:\/\/frontend-auctra-[a-z0-9-]+\.vercel\.app$/i;

// Security Middleware
app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || vercelPreviewRegex.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Compliance & Activity Logging
app.use(logUserActivity);
app.use(detectAnomalousActivity);

// Rate Limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth/2fa', require('./routes/twoFactorRoutes'));
app.use('/api/kyc', require('./routes/kycRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/compliance', require('./routes/complianceRoutes'));
app.use('/api/chits', require('./routes/chitRoutes'));
app.use('/api/auctions', require('./routes/auctionRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Auctra API is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    version: '2.0.0-enterprise'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const server = http.createServer(app);

// Socket.io initialization
const io = require('./config/socket').init(server);

// Socket.io connection with enhanced security
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_auction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
    console.log(`User ${socket.id} joined auction: ${auctionId}`);
  });

  socket.on('bid_placed', (bidData) => {
    io.to(`auction_${bidData.auctionId}`).emit('bid_update', bidData);
  });

  socket.on('notification', (notificationData) => {
    io.to(`user_${notificationData.userId}`).emit('new_notification', notificationData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Auctra API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔐 Security: Enabled (Helmet, CORS, JWT)`);
  console.log(`💳 Payment Gateway: Razorpay Integrated`);
  console.log(`✅ KYC/AML: Enabled`);
  console.log(`🔑 2FA: Enabled`);
  console.log(`📱 Real-time: Socket.io enabled`);
});

module.exports = { app, io };
