const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('❤️ [WISHLIST] Fetching wishlist for user:', req.user.email);
    const wl = await Wishlist.findOne({ userId: req.user._id }).populate({
      path: 'products',
      select: 'name images variants price'
    });
    console.log('❤️ [WISHLIST] Found wishlist:', wl ? `${wl.products.length} items` : 'empty');
    res.json({ success: true, items: wl ? wl.products : [] });
  } catch (err) {
    console.error('❌ [WISHLIST ERROR]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    
    console.log('❤️ [WISHLIST ADD] Adding product', productId, 'for user:', req.user.email);
    const wl = await Wishlist.findOneAndUpdate(
      { userId: req.user._id }, 
      { $addToSet: { products: productId }, $setOnInsert: { userId: req.user._id } }, 
      { upsert: true, new: true }
    );
    console.log('❤️ [WISHLIST ADD] Product added successfully');
    res.json({ success: true, wishlist: wl });
  } catch (err) {
    console.error('❌ [WISHLIST ADD ERROR]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/remove', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    
    console.log('❤️ [WISHLIST REMOVE] Removing product', productId, 'for user:', req.user.email);
    const wl = await Wishlist.findOneAndUpdate(
      { userId: req.user._id }, 
      { $pull: { products: productId } }, 
      { new: true }
    );
    console.log('❤️ [WISHLIST REMOVE] Product removed successfully');
    res.json({ success: true, wishlist: wl || { products: [] } });
  } catch (err) {
    console.error('❌ [WISHLIST REMOVE ERROR]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
