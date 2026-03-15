/**
 * Food7 Backend Server
 * AI-Powered Smart Restaurant Management System
 */

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// CORS — allow configured frontend URL(s) or all origins in development
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Railway health checks)
    if (!origin) return callback(null, true);
    // In development allow everything
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    // In production allow listed origins
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🍽️ Welcome to Food7 API - AI-Powered Restaurant Management',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      inventory: '/api/inventory',
      calls: '/api/calls',
      marketing: '/api/marketing',
      analytics: '/api/analytics',
    },
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/twilio', require('./routes/twilio'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/payments', require('./routes/payments'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log('');
  console.log('🍽️  ========================================');
  console.log('   FOOD7 - AI Restaurant Management System');
  console.log('   ========================================');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📚 Environment: ${config.nodeEnv}`);
  console.log('');
  console.log('🤖 AI Features:');
  console.log(`   - Call Analysis: ${config.openaiApiKey ? '✅ Enabled' : '⚠️  Disabled (no API key)'}`);
  console.log(`   - Marketing AI: ${config.groqApiKey ? '✅ Enabled' : '⚠️  Disabled (no API key)'}`);
  console.log(`   - Inventory Prediction: ✅ Enabled`);
  console.log(`   - Analytics Insights: ✅ Enabled`);
  console.log('');
  console.log('📡 Ready to accept requests!');
  console.log('========================================');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});
