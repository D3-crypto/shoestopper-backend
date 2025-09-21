const express = require('express');
const Coupon = require('../models/Coupon');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Validate and apply coupon
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { code, cartTotal, cartItems } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({ error: 'Coupon has expired or reached usage limit' });
    }

    // Check if user can use this coupon
    if (!coupon.canUserUse(req.user.id)) {
      return res.status(400).json({ error: 'You have already used this coupon the maximum number of times' });
    }

    // Check minimum amount
    if (cartTotal < coupon.minimumAmount) {
      return res.status(400).json({ 
        error: `Minimum order amount of $${coupon.minimumAmount} required` 
      });
    }

    // Check if coupon applies to cart items
    if (coupon.applicableCategories.length > 0 || coupon.applicableProducts.length > 0) {
      const applicableItems = cartItems.filter(item => {
        const categoryMatch = coupon.applicableCategories.length === 0 || 
          item.categories.some(cat => coupon.applicableCategories.includes(cat));
        const productMatch = coupon.applicableProducts.length === 0 || 
          coupon.applicableProducts.includes(item.productId);
        return categoryMatch || productMatch;
      });

      if (applicableItems.length === 0) {
        return res.status(400).json({ 
          error: 'This coupon is not applicable to items in your cart' 
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cartTotal * coupon.value) / 100;
      if (coupon.maximumDiscount && discountAmount > coupon.maximumDiscount) {
        discountAmount = coupon.maximumDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.value, cartTotal);
    }

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        type: coupon.type,
        value: coupon.value,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round((cartTotal - discountAmount) * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply coupon (mark as used)
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { couponId } = req.body;
    
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check if coupon is still valid
    if (!coupon.isValid()) {
      return res.status(400).json({ error: 'Coupon is no longer valid' });
    }

    // Check if user can still use this coupon
    if (!coupon.canUserUse(req.user.id)) {
      return res.status(400).json({ error: 'You cannot use this coupon anymore' });
    }

    // Update coupon usage
    coupon.usageCount += 1;
    
    const existingUser = coupon.usedBy.find(usage => 
      usage.userId.toString() === req.user.id.toString()
    );
    
    if (existingUser) {
      existingUser.usedCount += 1;
      existingUser.usedAt = new Date();
    } else {
      coupon.usedBy.push({
        userId: req.user.id,
        usedCount: 1,
        usedAt: new Date()
      });
    }

    await coupon.save();
    
    res.json({
      success: true,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;