const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Variant = require('../models/Variant');
const User = require('../models/User');
const crypto = require('crypto');

// Helper function to generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to get cart identifier
const getCartIdentifier = (req) => {
  const userId = req.user?.id; // From auth middleware if logged in
  const sessionId = req.headers['x-session-id'] || req.query.sessionId || req.body.sessionId;
  
  return { userId, sessionId };
};

// Generate session ID for anonymous users
router.post('/session', (req, res) => {
  const sessionId = generateSessionId();
  console.log(`[CART] Generated new session ID: ${sessionId}`);
  res.json({ sessionId });
});

router.get('/', async (req, res) => {
  try {
    const { userId, sessionId } = getCartIdentifier(req);
    console.log(`[CART] Get cart request - User: ${userId}, Session: ${sessionId}`);
    
    if (!userId && !sessionId) {
      console.log(`[CART] No user or session identifier provided`);
      return res.status(400).json({ error: 'No cart identifier provided' });
    }
    
    const query = userId ? { userId } : { sessionId };
    const cart = await Cart.findOne(query).populate('items.variantId');
    
    console.log(`[CART] Cart retrieved with ${cart ? cart.items.length : 0} items`);
    res.json(cart || { items: [] });
  } catch (error) {
    console.error('[CART] Error getting cart:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { variantId, qty } = req.body;
    const { userId, sessionId } = getCartIdentifier(req);
    
    console.log(`[CART] Add item request - User: ${userId}, Session: ${sessionId}, Variant: ${variantId}, Qty: ${qty}`);
    
    if ((!userId && !sessionId) || !variantId || !qty || qty <= 0) {
      console.log(`[CART] Invalid fields in add request`);
      return res.status(400).json({ error: 'Invalid fields' });
    }

    const variant = await Variant.findById(variantId);
    if (!variant) {
      console.log(`[CART] Variant not found: ${variantId}`);
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    if (variant.stock < qty) {
      console.log(`[CART] Insufficient stock - Requested: ${qty}, Available: ${variant.stock}`);
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Find cart by userId or sessionId
    const query = userId ? { userId } : { sessionId };
    let cart = await Cart.findOne(query);
    
    // Get user email if logged in for abandoned cart emails
    let userEmail = null;
    if (userId) {
      const user = await User.findById(userId);
      userEmail = user?.email;
    }
    
    if (cart) {
      const existingItem = cart.items.find(item => item.variantId.toString() === variantId);
      if (existingItem) {
        console.log(`[CART] Item exists, updating quantity from ${existingItem.qty} to ${existingItem.qty + qty}`);
        existingItem.qty += qty;
        if (existingItem.qty > variant.stock) {
          return res.status(400).json({ error: 'Insufficient stock for total quantity' });
        }
        cart.userEmail = userEmail; // Update email for abandoned cart
        await cart.save();
        return res.json(cart);
      } else {
        // Add new item to existing cart
        cart.items.push({ variantId, qty });
        cart.userEmail = userEmail;
        await cart.save();
        return res.json(cart);
      }
    } else {
      // Create new cart
      const cartData = {
        items: [{ variantId, qty }],
        userEmail
      };
      
      if (userId) {
        cartData.userId = userId;
      } else {
        cartData.sessionId = sessionId;
      }
      
      const newCart = new Cart(cartData);
      await newCart.save();
      console.log(`[CART] Created new cart for ${userId ? 'user' : 'session'}: ${userId || sessionId}`);
      return res.json(newCart);
    }
  } catch (err) {
    console.error('[CART] Error adding to cart:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const { variantId } = req.body;
    const { userId, sessionId } = getCartIdentifier(req);
    
    if ((!userId && !sessionId) || !variantId) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    
    const query = userId ? { userId } : { sessionId };
    const cart = await Cart.findOneAndUpdate(
      query, 
      { $pull: { items: { variantId } } }, 
      { new: true }
    );
    
    res.json(cart || { items: [] });
  } catch (err) {
    console.error('[CART] Error removing from cart:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
