const express = require('express');
const router = express.Router();
const AbandonedCart = require('../models/AbandonedCart');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');
const cartRecoveryEmail = require('../utils/cartRecoveryEmail');

// Track abandoned cart (called when user leaves without purchasing)
router.post('/track', async (req, res) => {
  try {
    const { userId, sessionId, email, cartItems } = req.body;

    if (!email || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Email and cart items are required' });
    }

    // Calculate total value
    const totalValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check if abandoned cart already exists for this user/session
    const existingCart = await AbandonedCart.findOne({
      $or: [
        { user: userId },
        { email: email }
      ],
      isRecovered: false
    });

    if (existingCart) {
      // Update existing abandoned cart
      existingCart.cartItems = cartItems;
      existingCart.totalValue = totalValue;
      existingCart.lastModified = new Date();
      existingCart.generateRecoveryToken();
      await existingCart.save();
      
      res.json({ 
        message: 'Abandoned cart updated',
        cartId: existingCart._id,
        recoveryToken: existingCart.recoveryToken
      });
    } else {
      // Create new abandoned cart
      const abandonedCart = new AbandonedCart({
        user: userId,
        sessionId,
        email,
        cartItems,
        totalValue
      });
      
      abandonedCart.generateRecoveryToken();
      await abandonedCart.save();

      res.json({ 
        message: 'Abandoned cart tracked',
        cartId: abandonedCart._id,
        recoveryToken: abandonedCart.recoveryToken
      });
    }

  } catch (error) {
    console.error('Error tracking abandoned cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Recover abandoned cart
router.get('/recover/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const abandonedCart = await AbandonedCart.findOne({
      recoveryToken: token,
      isRecovered: false,
      expiresAt: { $gt: new Date() }
    }).populate('cartItems.product');

    if (!abandonedCart) {
      return res.status(404).json({ message: 'Cart not found or expired' });
    }

    // Verify product availability and update prices
    const validCartItems = [];
    for (const item of abandonedCart.cartItems) {
      const product = await Product.findById(item.product._id);
      if (product) {
        // Check if variant and size are still available
        const variant = product.variants.find(v => 
          v.color === item.color && 
          v.sizes.some(s => s.size === item.size && s.stock > 0)
        );
        
        if (variant) {
          validCartItems.push({
            ...item.toObject(),
            product: product,
            currentPrice: product.price,
            available: true
          });
        } else {
          validCartItems.push({
            ...item.toObject(),
            product: product,
            currentPrice: product.price,
            available: false
          });
        }
      }
    }

    res.json({
      cartId: abandonedCart._id,
      cartItems: validCartItems,
      originalTotal: abandonedCart.totalValue,
      createdAt: abandonedCart.createdAt,
      email: abandonedCart.email,
      hasChanges: validCartItems.some(item => !item.available || item.currentPrice !== item.price)
    });

  } catch (error) {
    console.error('Error recovering cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Restore cart items to user's active cart
router.post('/restore/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    const abandonedCart = await AbandonedCart.findOne({
      recoveryToken: token,
      isRecovered: false,
      expiresAt: { $gt: new Date() }
    });

    if (!abandonedCart) {
      return res.status(404).json({ message: 'Cart not found or expired' });
    }

    // Get or create user's active cart
    let activeCart = await Cart.findOne({ user: userId });
    if (!activeCart) {
      activeCart = new Cart({ user: userId, items: [] });
    }

    // Add available items to active cart
    let itemsAdded = 0;
    let itemsSkipped = [];

    for (const item of abandonedCart.cartItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const variant = product.variants.find(v => 
          v.color === item.color && 
          v.sizes.some(s => s.size === item.size && s.stock >= item.quantity)
        );

        if (variant) {
          // Check if item already exists in cart
          const existingItem = activeCart.items.find(cartItem => 
            cartItem.product.toString() === item.product.toString() &&
            cartItem.size === item.size &&
            cartItem.color === item.color
          );

          if (existingItem) {
            existingItem.quantity += item.quantity;
          } else {
            activeCart.items.push({
              product: item.product,
              size: item.size,
              color: item.color,
              quantity: item.quantity
            });
          }
          itemsAdded++;
        } else {
          itemsSkipped.push({
            name: product.name,
            reason: 'Out of stock or size unavailable'
          });
        }
      }
    }

    // Save active cart and mark abandoned cart as recovered
    await activeCart.save();
    await abandonedCart.markAsRecovered();

    res.json({
      message: 'Cart restored successfully',
      itemsAdded,
      itemsSkipped,
      cartId: activeCart._id
    });

  } catch (error) {
    console.error('Error restoring cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send cart recovery reminder (manual trigger)
router.post('/send-reminder', async (req, res) => {
  try {
    const { email, reminderType = 'first' } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const abandonedCart = await AbandonedCart.findOne({
      email,
      isRecovered: false,
      expiresAt: { $gt: new Date() }
    }).populate('cartItems.product user');

    if (!abandonedCart) {
      return res.status(404).json({ message: 'No abandoned cart found for this email' });
    }

    // Check if eligible for this reminder type
    if (!abandonedCart.isEligibleForReminder(reminderType)) {
      return res.status(400).json({ 
        message: 'Not eligible for this reminder type or already sent' 
      });
    }

    // Generate recovery URL
    if (!abandonedCart.recoveryToken) {
      abandonedCart.generateRecoveryToken();
      await abandonedCart.save();
    }

    const recoveryUrl = cartRecoveryEmail.generateRecoveryUrl(abandonedCart.recoveryToken);

    // Send email
    const emailResult = await cartRecoveryEmail.sendCartRecoveryEmail(
      email,
      reminderType,
      {
        user: abandonedCart.user,
        cartItems: abandonedCart.cartItems,
        totalValue: abandonedCart.totalValue,
        cartSummary: abandonedCart.cartSummary
      },
      recoveryUrl
    );

    if (emailResult.success) {
      // Mark reminder as sent
      await abandonedCart.markReminderSent(reminderType);
      
      res.json({
        message: 'Cart recovery reminder sent successfully',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        message: 'Failed to send reminder email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error sending cart recovery reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get abandoned carts statistics (admin)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Basic stats
    const totalAbandoned = await AbandonedCart.countDocuments({ isRecovered: false });
    const totalRecovered = await AbandonedCart.countDocuments({ isRecovered: true });
    const totalValue = await AbandonedCart.aggregate([
      { $match: { isRecovered: false } },
      { $group: { _id: null, total: { $sum: '$totalValue' } } }
    ]);

    // Recovery rate
    const recoveryRate = totalRecovered / (totalAbandoned + totalRecovered) * 100;

    // Recent abandonments (last 7 days)
    const recentAbandoned = await AbandonedCart.countDocuments({
      isRecovered: false,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Abandoned carts by time period
    const periods = ['first', 'second', 'final'];
    const eligible = {};
    
    for (const period of periods) {
      eligible[period] = await AbandonedCart.findEligibleForReminders(period).countDocuments();
    }

    res.json({
      stats: {
        totalAbandoned,
        totalRecovered,
        totalValue: totalValue[0]?.total || 0,
        recoveryRate: recoveryRate.toFixed(2),
        recentAbandoned,
        eligibleForReminders: eligible
      }
    });

  } catch (error) {
    console.error('Error getting abandoned cart stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get list of abandoned carts
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isRecovered: false };
    
    // Add filters
    if (req.query.email) {
      filter.email = new RegExp(req.query.email, 'i');
    }
    
    if (req.query.minValue) {
      filter.totalValue = { $gte: parseFloat(req.query.minValue) };
    }

    const abandonedCarts = await AbandonedCart.find(filter)
      .populate('user', 'name email')
      .populate('cartItems.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AbandonedCart.countDocuments(filter);

    res.json({
      carts: abandonedCarts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCarts: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error getting abandoned carts list:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;