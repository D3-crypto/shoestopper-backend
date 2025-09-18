const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

// Middleware to verify JWT access token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log(`[AUTH MIDDLEWARE] Checking authentication for ${req.method} ${req.url}`);

  if (!token) {
    console.log(`[AUTH MIDDLEWARE] No token provided`);
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    console.log(`[AUTH MIDDLEWARE] Verifying token...`);
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    console.log(`[AUTH MIDDLEWARE] Token decoded, user ID: ${decoded.sub}`);
    
    const user = await User.findById(decoded.sub).select('-password');
    if (!user) {
      console.log(`[AUTH MIDDLEWARE] User not found in database: ${decoded.sub}`);
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log(`[AUTH MIDDLEWARE] Authentication successful for user: ${user.email}`);
    req.user = user;
    next();
  } catch (err) {
    console.log(`[AUTH MIDDLEWARE] Token verification failed: ${err.message}`);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Check if user has admin flag OR email contains 'admin' (for backward compatibility)
  const isAdmin = req.user.isAdmin || req.user.email.includes('admin');
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = { authenticateToken, requireAdmin };
