const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Product = require('../models/Product');
const Variant = require('../models/Variant');
const Order = require('../models/Order');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Coupon = require('../models/Coupon');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    const isAdmin = user.isAdmin || user.email.includes('admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is verified and not blocked
    if (!user.verified) {
      return res.status(401).json({ error: 'Account not verified' });
    }

    if (user.loginBlocked) {
      return res.status(401).json({ error: 'Account temporarily blocked' });
    }

    // Generate token
    const token = jwt.sign({ sub: user._id.toString() }, config.jwt.accessSecret, { expiresIn: '24h' });

    // Return success response
    res.json({
      success: true,
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAdmin: true
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin profile
router.get('/profile', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select('-password -refreshTokenVersion');
    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        isAdmin: true,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    console.error('Admin profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all variants (for admin panel)
router.get('/variants', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const variants = await Variant.find({}).lean();
    res.json({
      success: true,
      variants
    });
  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all products (for admin panel)
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find({}).lean();
    // Get variants for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product) => {
        const variants = await Variant.find({ productId: product._id }).lean();
        return { ...product, variants };
      })
    );
    
    res.json({
      success: true,
      products: productsWithVariants
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify user (for admin panel)
router.patch('/users/:userId/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { verified: true },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'User verified successfully',
      user
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user details with orders (for admin panel)
router.get('/users/:userId/details', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's orders
    const orders = await Order.find({ userId }).lean();
    
    res.json({
      success: true,
      user: {
        ...user,
        orders
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update admin profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { name, email, phone } = req.body;
    
    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updatedAdmin = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, phone },
      { new: true, select: '-password -refreshTokenVersion' }
    );

    res.json({
      success: true,
      admin: {
        id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone,
        isAdmin: true,
        createdAt: updatedAdmin.createdAt,
        updatedAt: updatedAdmin.updatedAt
      }
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change admin password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(req.user._id, { password: hashedNewPassword });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change admin password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/product', async (req, res) => {
  try {
    const { name, title, description, price, categories, images, featured, brand, variants } = req.body;
    
    // Create the product
    const product = new Product({
      title: title || name, // Support both title and name fields
      description,
      price: price || 0,
      categories: categories || [],
      images: images || [],
      featured: featured || false,
      brand: brand || ''
    });
    
    const savedProduct = await product.save();

    // Create variants with new structure (color variants with sizes array)
    const variantDocuments = [];
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const variantDoc = new Variant({
          productId: savedProduct._id,
          color: variant.color,
          price: variant.price || null,
          images: variant.images || [],
          sizes: variant.sizes || [] // Array of {size, stock, price} objects
        });
        variantDocuments.push(variantDoc);
      }
      await Variant.insertMany(variantDocuments);
    }

    res.status(201).json({ 
      success: true, 
      product: savedProduct,
      message: 'Product created successfully'
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update product
router.put('/product/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, title, description, price, categories, images, featured, brand, variants } = req.body;
    
    // Update the product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        title: title || name,
        description,
        price: price || 0,
        categories: categories || [],
        images: images || [],
        featured: featured || false,
        brand: brand || ''
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update variants if provided
    if (variants && variants.length > 0) {
      // Delete existing variants
      await Variant.deleteMany({ productId });
      
      // Create new variants
      const variantDocuments = [];
      for (const variant of variants) {
        const variantDoc = new Variant({
          productId: updatedProduct._id,
          color: variant.color,
          price: variant.price || null,
          images: variant.images || [],
          sizes: variant.sizes || []
        });
        variantDocuments.push(variantDoc);
      }
      await Variant.insertMany(variantDocuments);
    }

    res.json({ 
      success: true, 
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete product
router.delete('/product/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Delete the product
    const deletedProduct = await Product.findByIdAndDelete(productId);
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete associated variants
    await Variant.deleteMany({ productId });

    res.json({ 
      success: true, 
      message: 'Product deleted successfully',
      product: deletedProduct
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Create variant
router.post('/variant', async (req, res) => {
  try {
    const { productId, color, price, images, sizes } = req.body;
    
    // Check if variant with this color already exists for this product
    const existingVariant = await Variant.findOne({ productId, color });
    
    if (existingVariant) {
      return res.status(400).json({ 
        error: 'Variant with this color already exists for this product' 
      });
    }
    
    const variant = new Variant({
      productId,
      color,
      price: price || null,
      images: images || [],
      sizes: sizes || [] // Array of {size, stock, price} objects
    });
    
    const savedVariant = await variant.save();
    res.status(201).json({ 
      success: true, 
      variant: savedVariant,
      message: 'Variant created successfully'
    });
  } catch (err) {
    console.error('Error creating variant:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update order status (approve, ship, deliver, cancel)
router.post('/order/:orderId/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Not found' });
    
    // Validate status transitions
    const validTransitions = {
      'PaymentPending': ['Paid', 'Cancelled'],
      'Paid': ['Approved', 'Cancelled'],
      'Approved': ['Shipped', 'Cancelled'],
      'Shipped': ['Delivered'],
      'Delivered': [],
      'Cancelled': []
    };
    
    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${order.status} to ${status}` });
    }
    
    order.status = status;
    order.statusHistory.push({ status, at: new Date(), note });
    await order.save();
    
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update variant stock
router.put('/variant/:variantId/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    if (typeof stock !== 'number' || stock < 0) return res.status(400).json({ error: 'Invalid stock value' });
    
    const variant = await Variant.findByIdAndUpdate(req.params.variantId, { stock }, { new: true });
    if (!variant) return res.status(404).json({ error: 'Variant not found' });
    
    res.json(variant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update variant
router.put('/variant/:variantId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId } = req.params;
    const { color, price, images, sizes } = req.body;
    
    const updatedVariant = await Variant.findByIdAndUpdate(
      variantId,
      {
        color,
        price: price || null,
        images: images || [],
        sizes: sizes || []
      },
      { new: true }
    );

    if (!updatedVariant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ 
      success: true, 
      variant: updatedVariant,
      message: 'Variant updated successfully'
    });
  } catch (err) {
    console.error('Error updating variant:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete variant
router.delete('/variant/:variantId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId } = req.params;
    
    const deletedVariant = await Variant.findByIdAndDelete(variantId);
    
    if (!deletedVariant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ 
      success: true, 
      message: 'Variant deleted successfully',
      variant: deletedVariant
    });
  } catch (err) {
    console.error('Error deleting variant:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Add size to variant
router.post('/variant/:variantId/size', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId } = req.params;
    const { size, stock, price } = req.body;
    
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Check if size already exists
    const existingSize = variant.sizes.find(s => s.size === size);
    if (existingSize) {
      return res.status(400).json({ error: 'Size already exists in this variant' });
    }

    variant.sizes.push({ size, stock: stock || 0, price: price || 0 });
    await variant.save();

    res.json({ 
      success: true, 
      variant,
      message: 'Size added successfully'
    });
  } catch (err) {
    console.error('Error adding size:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Update specific size in variant
router.put('/variant/:variantId/size/:sizeValue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId, sizeValue } = req.params;
    const { stock, price } = req.body;
    
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const sizeIndex = variant.sizes.findIndex(s => s.size === sizeValue);
    if (sizeIndex === -1) {
      return res.status(404).json({ error: 'Size not found in this variant' });
    }

    variant.sizes[sizeIndex].stock = stock !== undefined ? stock : variant.sizes[sizeIndex].stock;
    variant.sizes[sizeIndex].price = price !== undefined ? price : variant.sizes[sizeIndex].price;
    
    await variant.save();

    res.json({ 
      success: true, 
      variant,
      message: 'Size updated successfully'
    });
  } catch (err) {
    console.error('Error updating size:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Delete specific size from variant
router.delete('/variant/:variantId/size/:sizeValue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { variantId, sizeValue } = req.params;
    
    const variant = await Variant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const sizeIndex = variant.sizes.findIndex(s => s.size === sizeValue);
    if (sizeIndex === -1) {
      return res.status(404).json({ error: 'Size not found in this variant' });
    }

    variant.sizes.splice(sizeIndex, 1);
    await variant.save();

    res.json({ 
      success: true, 
      variant,
      message: 'Size deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting size:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// List all orders for admin with advanced filters
router.get('/orders', async (req, res) => {
  try {
    const { 
      status, 
      userId, 
      paymentMethod, 
      date_from, 
      date_to, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Status filter
    if (status) filter.status = status;
    
    // User filter
    if (userId) filter.userId = userId;
    
    // Payment method filter
    if (paymentMethod) filter['payment.method'] = paymentMethod;
    
    // Date range filter
    if (date_from || date_to) {
      filter.createdAt = {};
      if (date_from) filter.createdAt.$gte = new Date(date_from);
      if (date_to) filter.createdAt.$lte = new Date(date_to);
    }
    
    // Search filter (order ID or user email/name)
    if (search) {
      const User = require('../models/User');
      const matchingUsers = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      const userIds = matchingUsers.map(u => u._id);
      
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .populate('items.productId', 'title images price')
      .populate('items.variantId', 'color size')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);
      
    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);
    
    // Calculate summary statistics
    const orderStats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$totalAmount' },
          averageAmount: { $avg: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      summary: orderStats[0] || { totalAmount: 0, averageAmount: 0, orderCount: 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin User Management Routes

// List all users with filters and search
router.get('/users', async (req, res) => {
  try {
    const { 
      search, 
      verified, 
      loginBlocked,
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Verified filter
    if (verified !== undefined) filter.verified = verified === 'true';
    
    // Login blocked filter
    if (loginBlocked !== undefined) filter.loginBlocked = loginBlocked === 'true';
    
    // Search filter (name or email)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const users = await User.find(filter)
      .select('-password -refreshTokenVersion')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);
      
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limitNum);
    
    res.json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific user details
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -refreshTokenVersion');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's order statistics
    const orderStats = await Order.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
    
    // Get recent orders
    const recentOrders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderId status totalAmount createdAt');
    
    res.json({
      user,
      statistics: orderStats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 },
      recentOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific user's orders
router.get('/users/:userId/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    // Build filter object
    const filter = { userId: req.params.userId };
    if (status) filter.status = status;
    
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
    
    res.json({
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalOrders,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Transaction Management Routes

// List all transactions with filters
router.get('/transactions', async (req, res) => {
  try {
    const { 
      status, 
      method, 
      userId,
      date_from, 
      date_to, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Status filter
    if (status) filter.status = status;
    
    // Method filter
    if (method) filter.method = method;
    
    // User filter
    if (userId) filter.userId = userId;
    
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
    
    const transactions = await Transaction.find(filter)
      .populate('userId', 'name email')
      .populate('orderId', 'orderId totalAmount')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);
      
    // Get total count for pagination
    const totalTransactions = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalTransactions / limitNum);
    
    res.json({
      transactions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalTransactions,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific transaction details
router.get('/transactions/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId })
      .populate('userId', 'name email phone')
      .populate({
        path: 'orderId',
        populate: {
          path: 'items.productId items.variantId',
          select: 'title images price color size'
        }
      });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Analytics Routes

// Sales analytics
router.get('/analytics/sales', async (req, res) => {
  try {
    const { period = 'month', date_from, date_to } = req.query;
    
    // Set date range based on period
    let dateFilter = {};
    const now = new Date();
    
    if (date_from && date_to) {
      dateFilter = {
        createdAt: {
          $gte: new Date(date_from),
          $lte: new Date(date_to)
        }
      };
    } else {
      switch (period) {
        case 'today':
          dateFilter.createdAt = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: monthAgo };
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: yearAgo };
          break;
      }
    }
    
    // Overall sales statistics
    const salesStats = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
    
    // Sales by status
    const salesByStatus = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    // Sales by payment method
    const salesByPayment = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    // Daily sales (for charts)
    const dailySales = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Top selling products
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.qty' },
          totalRevenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);
    
    res.json({
      period,
      dateRange: dateFilter,
      overview: salesStats[0] || { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 },
      salesByStatus,
      salesByPayment,
      dailySales,
      topProducts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Inventory analytics
router.get('/analytics/inventory', async (req, res) => {
  try {
    // Low stock variants (stock <= 5)
    const lowStock = await Variant.find({ stock: { $lte: 5 } })
      .populate('productId', 'title images')
      .sort({ stock: 1 });
    
    // Out of stock variants
    const outOfStock = await Variant.find({ stock: 0 })
      .populate('productId', 'title images');
    
    // Total inventory value
    const inventoryValue = await Variant.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$stock', '$product.price'] } },
          totalItems: { $sum: '$stock' },
          totalVariants: { $sum: 1 }
        }
      }
    ]);
    
    // Inventory by category
    const inventoryByCategory = await Variant.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $unwind: '$product.categories' },
      {
        $group: {
          _id: '$product.categories',
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$product.price'] } },
          variantCount: { $sum: 1 }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
    
    // Top variants by stock
    const topStock = await Variant.find({})
      .populate('productId', 'title images price')
      .sort({ stock: -1 })
      .limit(10);
    
    res.json({
      overview: inventoryValue[0] || { totalValue: 0, totalItems: 0, totalVariants: 0 },
      lowStock,
      outOfStock,
      inventoryByCategory,
      topStock
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer analytics
router.get('/analytics/customers', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Set date range
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter.createdAt = { $gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter.createdAt = { $gte: monthAgo };
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter.createdAt = { $gte: yearAgo };
        break;
    }
    
    // Customer overview
    const customerStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          verifiedCustomers: { $sum: { $cond: ['$verified', 1, 0] } },
          blockedCustomers: { $sum: { $cond: ['$loginBlocked', 1, 0] } }
        }
      }
    ]);
    
    // New customers in period
    const newCustomers = await User.countDocuments(dateFilter);
    
    // Top customers by order value
    const topCustomers = await Order.aggregate([
      { $match: { status: { $in: ['Approved', 'Shipped', 'Delivered'] } } },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);
    
    res.json({
      period,
      overview: customerStats[0] || { totalCustomers: 0, verifiedCustomers: 0, blockedCustomers: 0 },
      newCustomersInPeriod: newCustomers,
      topCustomers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ COUPON MANAGEMENT ============

// Get all coupons with pagination and search
router.get('/coupons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    
    let query = {};
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
        query.validUntil = { $gte: new Date() };
      } else if (status === 'inactive') {
        query.$or = [
          { isActive: false },
          { validUntil: { $lt: new Date() } }
        ];
      }
    }

    const coupons = await Coupon.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCoupons = await Coupon.countDocuments(query);

    res.json({
      coupons,
      totalCoupons,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCoupons / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new coupon
router.post('/coupons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      type,
      value,
      minimumAmount,
      maximumDiscount,
      usageLimit,
      userLimit,
      validFrom,
      validUntil,
      applicableCategories,
      applicableProducts
    } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      title,
      description,
      type,
      value,
      minimumAmount,
      maximumDiscount,
      usageLimit,
      userLimit,
      validFrom: validFrom || new Date(),
      validUntil,
      applicableCategories,
      applicableProducts,
      createdBy: req.user.id
    });

    await coupon.save();
    await coupon.populate('createdBy', 'name email');
    
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update coupon
router.put('/coupons/:couponId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    const updateData = { ...req.body };
    
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
      
      // Check if new code conflicts with existing coupons
      const existingCoupon = await Coupon.findOne({ 
        code: updateData.code, 
        _id: { $ne: couponId } 
      });
      if (existingCoupon) {
        return res.status(400).json({ error: 'Coupon code already exists' });
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle coupon active status
router.patch('/coupons/:couponId/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    await coupon.populate('createdBy', 'name email');

    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete coupon
router.delete('/coupons/:couponId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get coupon usage statistics
router.get('/coupons/:couponId/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { couponId } = req.params;
    
    const coupon = await Coupon.findById(couponId).populate('usedBy.userId', 'name email');
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    const stats = {
      totalUsage: coupon.usageCount,
      usageLimit: coupon.usageLimit,
      remainingUsage: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : 'Unlimited',
      uniqueUsers: coupon.usedBy.length,
      recentUsage: coupon.usedBy.slice(-10).reverse(), // Last 10 usages
      isValid: coupon.isValid(),
      daysRemaining: Math.ceil((coupon.validUntil - new Date()) / (1000 * 60 * 60 * 24))
    };

    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
