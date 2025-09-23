const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const cron = require('node-cron');

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
    'http://localhost:5174', // Vite dev server for admin (alternative port)
    'http://localhost:3001', // Vite dev server for admin (current port)
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
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/cart-recovery', require('./routes/cartRecovery'));

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
      
      // Start abandoned cart email scheduler (runs daily at 10 AM)
      startAbandonedCartScheduler();
    });
  } catch (error) {
    console.error(`[DATABASE] ❌ Connection failed:`, error.message);
    throw error;
  }
}

// Abandoned cart email functionality
const sendAbandonedCartEmails = async () => {
  try {
    console.log('🔍 Checking for abandoned carts...');
    
    const Cart = require('./models/Cart');
    const mailer = require('./utils/mailer');
    
    // Find carts abandoned for more than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const abandonedCarts = await Cart.find({
      'items.0': { $exists: true },
      lastActivity: { $lt: oneDayAgo },
      abandonedEmailSent: { $ne: true },
      userEmail: { $exists: true, $ne: null }
    }).populate('items.variantId');
    
    console.log(`📧 Found ${abandonedCarts.length} abandoned carts`);
    
    for (const cart of abandonedCarts) {
      try {
        const items = cart.items.map(item => ({
          name: item.variantId.productId?.title || 'Product',
          color: item.variantId.color,
          size: item.variantId.size,
          quantity: item.qty,
          price: item.variantId.price
        }));
        
        const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>👟 Your Cart is Waiting!</h2>
            <p>Don't let these amazing shoes slip away!</p>
            <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
              ${items.map(item => `
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                  <strong>${item.name}</strong><br>
                  ${item.color} • Size ${item.size} • Qty: ${item.quantity}<br>
                  <span style="color: #666;">$${item.price}</span>
                </div>
              `).join('')}
              <div style="padding: 10px; font-weight: bold; font-size: 18px;">
                Total: $${totalValue.toFixed(2)}
              </div>
            </div>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/cart" 
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Your Purchase
            </a>
          </div>
        `;
        
        await mailer.sendEmail({
          to: cart.userEmail,
          subject: '👟 Your Cart is Waiting - Complete Your Purchase!',
          html: emailHtml
        });
        
        cart.abandonedEmailSent = true;
        await cart.save();
        
        console.log(`✅ Sent abandoned cart email to: ${cart.userEmail}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${cart.userEmail}:`, error.message);
      }
    }
  } catch (error) {
    console.error('💥 Error in abandoned cart process:', error);
  }
};

const startAbandonedCartScheduler = () => {
  // Run daily at 10:00 AM
  cron.schedule('0 10 * * *', () => {
    console.log('🕐 Running abandoned cart email check...');
    sendAbandonedCartEmails();
  });
  
  console.log('📅 Abandoned cart email scheduler started (daily at 10 AM)');
};

start().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});

