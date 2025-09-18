const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');

// Get current user profile (for authenticated user)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    console.log(`[USER PROFILE] Fetching profile for user: ${req.user.email}`);
    
    const user = await User.findById(req.user._id).select('-password -refreshTokenVersion');
    if (!user) {
      console.log(`[USER PROFILE] User not found in database: ${req.user._id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`[USER PROFILE] Profile data retrieved for: ${user.email}`);
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        verified: user.verified,
        addresses: user.addresses || [],
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(`[USER PROFILE ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user addresses
router.get('/addresses', authenticateToken, async (req, res) => {
  try {
    console.log(`[USER ADDRESSES] Fetching addresses for user: ${req.user.email}`);
    
    const user = await User.findById(req.user._id).select('addresses');
    if (!user) {
      console.log(`[USER ADDRESSES] User not found: ${req.user._id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`[USER ADDRESSES] Retrieved ${user.addresses ? user.addresses.length : 0} addresses`);
    res.json({ 
      success: true, 
      addresses: user.addresses || [] 
    });
  } catch (err) {
    console.error(`[USER ADDRESSES ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new address
router.post('/addresses', authenticateToken, async (req, res) => {
  try {
    const { name, phone, street, city, state, pincode, isDefault } = req.body;
    console.log(`[ADD ADDRESS] Request from user: ${req.user.email}`);
    
    if (!name || !street || !city || !pincode) {
      console.log(`[ADD ADDRESS] Missing required fields`);
      return res.status(400).json({ error: 'Missing required fields: name, street, city, pincode' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log(`[ADD ADDRESS] User not found: ${req.user._id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If this is set as default, unset other defaults
    if (isDefault && user.addresses) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    
    const newAddress = {
      name,
      phone: phone || '',
      street,
      city,
      state: state || '',
      pincode,
      isDefault: isDefault || false
    };
    
    if (!user.addresses) {
      user.addresses = [];
    }
    
    user.addresses.push(newAddress);
    await user.save();
    
    console.log(`[ADD ADDRESS] Address added successfully for user: ${req.user.email}`);
    res.json({ 
      success: true, 
      addresses: user.addresses,
      message: 'Address added successfully'
    });
  } catch (err) {
    console.error(`[ADD ADDRESS ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update address
router.put('/addresses/:addressId', authenticateToken, async (req, res) => {
  try {
    const { name, phone, street, city, state, pincode, isDefault } = req.body;
    console.log(`[UPDATE ADDRESS] Request from user: ${req.user.email}, Address ID: ${req.params.addressId}`);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log(`[UPDATE ADDRESS] User not found: ${req.user._id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      console.log(`[UPDATE ADDRESS] Address not found: ${req.params.addressId}`);
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // If this is set as default, unset other defaults
    if (isDefault && user.addresses) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    
    // Update address fields
    if (name) address.name = name;
    if (phone !== undefined) address.phone = phone;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode) address.pincode = pincode;
    if (isDefault !== undefined) address.isDefault = isDefault;
    
    await user.save();
    
    console.log(`[UPDATE ADDRESS] Address updated successfully for user: ${req.user.email}`);
    res.json({ 
      success: true, 
      addresses: user.addresses,
      message: 'Address updated successfully'
    });
  } catch (err) {
    console.error(`[UPDATE ADDRESS ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete address
router.delete('/addresses/:addressId', authenticateToken, async (req, res) => {
  try {
    console.log(`[DELETE ADDRESS] Request from user: ${req.user.email}, Address ID: ${req.params.addressId}`);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log(`[DELETE ADDRESS] User not found: ${req.user._id}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      console.log(`[DELETE ADDRESS] Address not found: ${req.params.addressId}`);
      return res.status(404).json({ error: 'Address not found' });
    }
    
    address.deleteOne();
    await user.save();
    
    console.log(`[DELETE ADDRESS] Address deleted successfully for user: ${req.user.email}`);
    res.json({ 
      success: true, 
      addresses: user.addresses,
      message: 'Address deleted successfully'
    });
  } catch (err) {
    console.error(`[DELETE ADDRESS ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log(`[ADMIN] User list requested by: ${req.user.email}`);
    
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      console.log(`[ADMIN] Access denied for non-admin user: ${req.user.email}`);
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const users = await User.find({}).select('-password -refreshTokenVersion').sort({ createdAt: -1 });
    console.log(`[ADMIN] Retrieved ${users.length} users`);
    res.json({ success: true, users });
  } catch (err) {
    console.error(`[ADMIN ERROR] ${err.message}`);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to validate ObjectId format
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ 
      error: 'Invalid user ID format',
      message: {
        type: 'invalid_user_id',
        title: 'Invalid User ID',
        description: 'The provided user ID is not in a valid format. Please check your account details.',
        actions: [
          'Login again to get a valid session',
          'Register for a new account',
          'Contact support for assistance'
        ]
      }
    });
  }
  next();
};

// Get user profile
router.get('/:userId', validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -refreshTokenVersion');
    if (!user) return res.status(404).json({ 
      error: 'User not found',
      message: {
        type: 'user_not_found',
        title: 'Account Not Found',
        description: 'This user account does not exist. Please register or login with a valid account.',
        actions: [
          'Register for a new account',
          'Login with existing credentials',
          'Contact support if you believe this is an error'
        ]
      }
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add address (max 5 enforced)
router.post('/:userId/addresses', validateObjectId, async (req, res) => {
  try {
    const { label, line1, line2, city, state, postalCode, country } = req.body;
    if (!line1 || !city || !postalCode) return res.status(400).json({ error: 'Missing required address fields' });
    
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.addresses.length >= 5) return res.status(400).json({ error: 'Maximum 5 addresses allowed' });
    
    user.addresses.push({ label, line1, line2, city, state, postalCode, country });
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update address
router.put('/:userId/addresses/:addressId', validateObjectId, async (req, res) => {
  try {
    const { label, line1, line2, city, state, postalCode, country } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ error: 'Address not found' });
    
    if (label !== undefined) address.label = label;
    if (line1) address.line1 = line1;
    if (line2 !== undefined) address.line2 = line2;
    if (city) address.city = city;
    if (state !== undefined) address.state = state;
    if (postalCode) address.postalCode = postalCode;
    if (country !== undefined) address.country = country;
    
    await user.save();
    res.json(address);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete address
router.delete('/:userId/addresses/:addressId', validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.addresses.id(req.params.addressId).remove();
    // If deleted address was default, clear defaultAddressId
    if (user.defaultAddressId && user.defaultAddressId.toString() === req.params.addressId) {
      user.defaultAddressId = null;
    }
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Set default address
router.post('/:userId/addresses/:addressId/default', validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ error: 'Address not found' });
    
    user.defaultAddressId = req.params.addressId;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search user orders by order ID or product name
router.get('/:userId/orders/search', validateObjectId, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    // First, validate that the user exists
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: {
          type: 'user_not_found',
          title: 'Account Not Found',
          description: 'This user account does not exist. Please register or login with a valid account.',
          actions: [
            'Register for a new account',
            'Login with existing credentials',
            'Contact support if you believe this is an error'
          ]
        }
      });
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Search by order ID first
    let orders = await Order.find({ 
      userId: req.params.userId,
      orderId: { $regex: q, $options: 'i' }
    })
    .populate('items.productId', 'title images price')
    .populate('items.variantId', 'color size')
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .skip(skip);
    
    // If no results by order ID, search by product title
    if (orders.length === 0) {
      // Get products that match the search query
      const Product = require('../models/Product');
      const matchingProducts = await Product.find({
        $text: { $search: q }
      }).select('_id');
      
      const productIds = matchingProducts.map(p => p._id);
      
      if (productIds.length > 0) {
        orders = await Order.find({
          userId: req.params.userId,
          'items.productId': { $in: productIds }
        })
        .populate('items.productId', 'title images price')
        .populate('items.variantId', 'color size')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skip);
      }
    }
    
    res.json({
      orders,
      searchQuery: q,
      totalResults: orders.length,
      message: orders.length === 0 ? {
        type: 'no_search_results',
        title: 'No Orders Found',
        description: `No orders found matching "${q}". Try searching with a different order ID or product name.`,
        suggestions: [
          'Check your order confirmation email for the correct Order ID',
          'Try searching with partial product names',
          'Browse your complete order history instead'
        ]
      } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user order history with filters
router.get('/:userId/orders', validateObjectId, async (req, res) => {
  try {
    const { status, date_from, date_to, page = 1, limit = 10 } = req.query;
    
    // First, validate that the user exists
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: {
          type: 'user_not_found',
          title: 'Account Not Found',
          description: 'This user account does not exist. Please register or login with a valid account.',
          actions: [
            'Register for a new account',
            'Login with existing credentials',
            'Contact support if you believe this is an error'
          ]
        }
      });
    }
    
    // Build filter object
    const filter = { userId: req.params.userId };
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Date range filter
    if (date_from || date_to) {
      filter.createdAt = {};
      if (date_from) filter.createdAt.$gte = new Date(date_from);
      if (date_to) filter.createdAt.$lte = new Date(date_to);
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const orders = await Order.find(filter)
      .populate('items.productId', 'title images price')
      .populate('items.variantId', 'color size')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);
      
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);
    
    // Enhanced response for better UX
    const response = {
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };
    
    // Add helpful message for new users with no orders
    if (totalOrders === 0) {
      response.message = {
        type: 'no_orders',
        title: 'No Orders Yet',
        description: 'You haven\'t placed any orders yet. Start shopping to see your order history here!',
        suggestions: [
          'Browse our latest shoe collections',
          'Check out trending products',
          'Add items to your wishlist'
        ]
      };
    }
    
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      { name: name.trim(), phone },
      { new: true }
    ).select('-password -refreshTokenVersion');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    await User.findByIdAndUpdate(userId, { 
      password: hashedNewPassword,
      refreshTokenVersion: user.refreshTokenVersion + 1 // Invalidate all refresh tokens
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
