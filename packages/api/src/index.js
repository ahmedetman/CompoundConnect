require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import database and middleware
const db = require('./database/connection');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalRateLimit } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const qrCodeRoutes = require('./routes/qrcodes');
const managementRoutes = require('./routes/management');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const feedbackRoutes = require('./routes/feedback');

// Import services
const cronService = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:19006'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalRateLimit);

// Static files (for uploaded images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/qrcodes', qrCodeRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feedback', feedbackRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CompoundConnect API Server',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop accepting new connections
    server.close(async () => {
      console.log('HTTP server closed');
      
      // Close database connection
      await db.close();
      console.log('Database connection closed');
      
      // Stop cron jobs
      cronService.stop();
      console.log('Cron jobs stopped');
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
    
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Initialize server
const startServer = async () => {
  try {
    // Connect to database
    await db.connect();
    console.log('Database connected successfully');
    
    // Start cron jobs
    cronService.start();
    console.log('Cron jobs started');
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`CompoundConnect API Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;