const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Variant = require('../models/Variant');

// For demo we accept userId in body/query (no middleware); in real app use auth middleware

router.get('/', async (req, res) => {
  const userId = req.query.userId;
  console.log(`[CART] Get cart request for user: ${userId}`);
  
  if (!userId) {
    console.log(`[CART] Missing userId in request`);
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  const cart = await Cart.findOne({ userId }).populate('items.variantId');
  console.log(`[CART] Cart retrieved with ${cart ? cart.items.length : 0} items`);
  res.json(cart || { items: [] });
});

router.post('/add', async (req, res) => {
  try {
    const { userId, variantId, qty } = req.body;
    console.log(`[CART] Add item request - User: ${userId}, Variant: ${variantId}, Qty: ${qty}`);
    
    if (!userId || !variantId || !qty || qty <= 0) {
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

    // Check if item already exists in cart
    const cart = await Cart.findOne({ userId });
    if (cart) {
      const existingItem = cart.items.find(item => item.variantId.toString() === variantId);
      if (existingItem) {
        console.log(`[CART] Item exists, updating quantity from ${existingItem.qty} to ${existingItem.qty + qty}`);
        existingItem.qty += qty;
        if (existingItem.qty > variant.stock) {
          return res.status(400).json({ error: 'Insufficient stock for total quantity' });
        }
        await cart.save();
        return res.json(cart);
      }
    }

    const updatedCart = await Cart.findOneAndUpdate(
      { userId }, 
      { $setOnInsert: { userId }, $push: { items: { variantId, qty } } }, 
      { upsert: true, new: true }
    );
    res.json(updatedCart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const { userId, variantId } = req.body;
    if (!userId || !variantId) return res.status(400).json({ error: 'Missing fields' });
    const cart = await Cart.findOneAndUpdate({ userId }, { $pull: { items: { variantId } } }, { new: true });
    res.json(cart || { items: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
