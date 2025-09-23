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
    
    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.variantId',
        populate: {
          path: 'productId',
          model: 'Product'
        }
      });
    
    console.log(`[CART] Cart retrieved with ${cart ? cart.items.length : 0} items`);
    res.json(cart || { items: [] });
  } catch (error) {
    console.error('[CART] Error getting cart:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { variantId, size, qty } = req.body;
    const userId = req.user.id;
    
    console.log(`[CART] Add item request - User: ${userId}, Variant: ${variantId}, Size: ${size}, Qty: ${qty}`);
    
    if (!variantId || !size || !qty || qty <= 0) {
      console.log(`[CART] Invalid fields in add request`);
      return res.status(400).json({ error: 'Invalid fields. variantId, size, and qty are required.' });
    }

    const variant = await Variant.findById(variantId);
    if (!variant) {
      console.log(`[CART] Variant not found: ${variantId}`);
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    // Find the specific size within the variant
    const sizeInfo = variant.sizes.find(s => s.size === size);
    if (!sizeInfo) {
      console.log(`[CART] Size ${size} not found in variant ${variantId}`);
      return res.status(404).json({ error: `Size ${size} not available for this color` });
    }
    
    if (sizeInfo.stock < qty) {
      console.log(`[CART] Insufficient stock - Requested: ${qty}, Available: ${sizeInfo.stock}`);
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Find user's cart
    let cart = await Cart.findOne({ userId });
    
    // Get user email for abandoned cart emails
    const user = await User.findById(userId);
    const userEmail = user?.email;
    
    if (cart) {
      const existingItem = cart.items.find(item => 
        item.variantId.toString() === variantId && item.size === size
      );
      if (existingItem) {
        console.log(`[CART] Item exists, updating quantity from ${existingItem.qty} to ${existingItem.qty + qty}`);
        existingItem.qty += qty;
        if (existingItem.qty > sizeInfo.stock) {
          return res.status(400).json({ error: 'Insufficient stock for total quantity' });
        }
        cart.userEmail = userEmail;
        cart.abandonedEmailSent = false; // Reset email flag when cart is updated
        await cart.save();
        return res.json(cart);
      } else {
        // Add new item to existing cart
        cart.items.push({ variantId, size, qty });
        cart.userEmail = userEmail;
        cart.abandonedEmailSent = false;
        await cart.save();
        return res.json(cart);
      }
    } else {
      // Create new cart with first item
      cart = new Cart({
        userId,
        userEmail,
        items: [{ variantId, size, qty }],
        abandonedEmailSent: false
      });
      await cart.save();
      console.log(`[CART] Created new cart for user ${userId}`);
      return res.json(cart);
    }
  } catch (error) {
    console.error('[CART] Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.put('/update', async (req, res) => {
  try {
    const { variantId, size, qty } = req.body;
    const userId = req.user.id;
    
    console.log(`[CART] Update item request - User: ${userId}, Variant: ${variantId}, Size: ${size}, Qty: ${qty}`);
    
    if (!variantId || !size || qty < 0) {
      return res.status(400).json({ error: 'Invalid fields. variantId, size, and qty are required.' });
    }

    // Check stock availability
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }
    
    const sizeInfo = variant.sizes.find(s => s.size === size);
    if (!sizeInfo) {
      return res.status(404).json({ error: `Size ${size} not available for this color` });
    }
    
    if (qty > sizeInfo.stock) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.variantId.toString() === variantId && item.size === size
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (qty === 0) {
      // Remove item if quantity is 0
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].qty = qty;
    }

    await cart.save();
    console.log(`[CART] Item updated successfully`);
    res.json(cart);
  } catch (error) {
    console.error('[CART] Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const { variantId, size } = req.body;
    const userId = req.user.id;
    
    if (!variantId || !size) {
      return res.status(400).json({ error: 'Variant ID and size required' });
    }
    
    const cart = await Cart.findOneAndUpdate(
      { userId }, 
      { $pull: { items: { variantId, size } } }, 
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
