const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${req.method} ${req.url}`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    // Don't log passwords for security
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[HIDDEN]';
    if (logBody.otp) logBody.otp = '[HIDDEN]';
    console.log(`[REQUEST BODY]`, JSON.stringify(logBody, null, 2));
  }
  
  if (req.headers.authorization) {
    console.log(`[AUTH HEADER] Bearer token present`);
  }
  
  next();
});

// CORS middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173', // Vite dev server for frontend
    'http://localhost:5174', // Vite dev server for admin
    process.env.FRONTEND_URL, // Production frontend URL
    process.env.ADMIN_URL     // Production admin URL
  ].filter(Boolean); // Remove undefined values

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Preflight request handled`);
    res.sendStatus(200);
  } else {
    next();
  }
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[RESPONSE] ${res.statusCode} - ${req.method} ${req.url}`);
    if (data && typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        // Don't log tokens for security
        const logData = { ...parsed };
        if (logData.tokens) logData.tokens = '[HIDDEN]';
        if (logData.access) logData.access = '[HIDDEN]';
        if (logData.refresh) logData.refresh = '[HIDDEN]';
        console.log(`[RESPONSE DATA]`, JSON.stringify(logData, null, 2));
      } catch (e) {
        console.log(`[RESPONSE DATA]`, data.substring(0, 200));
      }
    }
    console.log(`[REQUEST COMPLETED] ================\n`);
    return originalSend.call(this, data);
  };
  next();
});

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/newsletter', require('./routes/newsletter'));

// Health check endpoint for hosts like Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Root endpoint to verify service is up
app.get('/', (req, res) => {
  res.send('ShoeStopper backend is running');
});

async function start() {
  try {
    console.log(`[DATABASE] Connecting to MongoDB...`);
    await mongoose.connect(config.mongoUri, { autoIndex: true });
    console.log(`[DATABASE] ✅ Connected to MongoDB successfully`);
    
    app.listen(config.port, () => {
      console.log(`[SERVER] ✅ Server running on port ${config.port}`);
      console.log(`[SERVER] 🔗 API available at http://localhost:${config.port}`);
      console.log(`[SERVER] 📋 Endpoints:`);
      console.log(`[SERVER]   - Auth: /api/auth/*`);
      console.log(`[SERVER]   - Users: /api/users/*`);
      console.log(`[SERVER]   - Products: /api/products/*`);
      console.log(`[SERVER]   - Cart: /api/cart/*`);
      console.log(`[SERVER]   - Wishlist: /api/wishlist/*`);
      console.log(`[SERVER]   - Orders: /api/orders/*`);
      console.log(`[SERVER]   - Admin: /api/admin/*`);
      console.log(`[SERVER] 🎯 Ready to receive requests!\n`);
    });
  } catch (error) {
    console.error(`[DATABASE] ❌ Connection failed:`, error.message);
    throw error;
  }
}

start().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});

