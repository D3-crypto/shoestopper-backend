const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Variant = require('../models/Variant');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// All cart operations now require authentication
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`[CART] Get cart request for user: ${userId}`);
    
    const cart = await Cart.findOne({ userId }).populate('items.variantId');
    
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
    const userId = req.user.id;
    
    console.log(`[CART] Add item request - User: ${userId}, Variant: ${variantId}, Qty: ${qty}`);
    
    if (!variantId || !qty || qty <= 0) {
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

    // Find user's cart
    let cart = await Cart.findOne({ userId });
    
    // Get user email for abandoned cart emails
    const user = await User.findById(userId);
    const userEmail = user?.email;
    
    if (cart) {
      const existingItem = cart.items.find(item => item.variantId.toString() === variantId);
      if (existingItem) {
        console.log(`[CART] Item exists, updating quantity from ${existingItem.qty} to ${existingItem.qty + qty}`);
        existingItem.qty += qty;
        if (existingItem.qty > variant.stock) {
          return res.status(400).json({ error: 'Insufficient stock for total quantity' });
        }
        cart.userEmail = userEmail;
        cart.abandonedEmailSent = false; // Reset email flag when cart is updated
        await cart.save();
        return res.json(cart);
      } else {
        // Add new item to existing cart
        cart.items.push({ variantId, qty });
        cart.userEmail = userEmail;
        cart.abandonedEmailSent = false;
        await cart.save();
        return res.json(cart);
      }
    } else {
      // Create new cart for user
      const newCart = new Cart({
        userId,
        items: [{ variantId, qty }],
        userEmail,
        abandonedEmailSent: false
      });
      
      await newCart.save();
      console.log(`[CART] Created new cart for user: ${userId}`);
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
    const userId = req.user.id;
    
    if (!variantId) {
      return res.status(400).json({ error: 'Variant ID required' });
    }
    
    const cart = await Cart.findOneAndUpdate(
      { userId }, 
      { $pull: { items: { variantId } } }, 
      { new: true }
    );
    
    res.json(cart || { items: [] });
  } catch (err) {
    console.error('[CART] Error removing from cart:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cart = await Cart.findOneAndUpdate(
      { userId },
      { items: [] },
      { new: true }
    );
    
    res.json(cart || { items: [] });
  } catch (err) {
    console.error('[CART] Error clearing cart:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
