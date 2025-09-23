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

// Get all products (for admin panel) with advanced filtering
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      brand,
      category,
      featured,
      inStock,
      priceMin,
      priceMax,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    let filter = {};

    // Search filter (title, brand, description)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Brand filter
    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    // Category filter
    if (category) {
      filter.categories = { $in: [category] };
    }

    // Featured filter
    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    // Price range filter
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(filter)
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    // Get variants for each product
    const productsWithVariants = await Promise.all(
      products.map(async (product) => {
        const variants = await Variant.find({ productId: product._id }).lean();
        
        // Add calculated fields
        let totalStock = 0;
        let lowestPrice = null;
        let highestPrice = null;
        
        variants.forEach(variant => {
          if (variant.sizes) {
            variant.sizes.forEach(size => {
              totalStock += size.stock || 0;
              const price = size.price || 0;
              if (lowestPrice === null || price < lowestPrice) lowestPrice = price;
              if (highestPrice === null || price > highestPrice) highestPrice = price;
            });
          }
        });

        return { 
          ...product, 
          variants,
          totalStock,
          lowestPrice,
          highestPrice,
          inStock: totalStock > 0
        };
      })
    );

    // Apply stock filter after calculating stock
    let filteredProducts = productsWithVariants;
    if (inStock !== undefined) {
      const stockFilter = inStock === 'true';
      filteredProducts = productsWithVariants.filter(product => 
        stockFilter ? product.inStock : !product.inStock
      );
    }

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limitNum);

    res.json({
      success: true,
      products: filteredProducts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters: {
        search,
        brand,
        category,
        featured,
        inStock,
        priceMin,
        priceMax,
        sortBy,
        sortOrder
      }
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

// Block/Unblock user account
router.put('/users/:userId/block', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isBlocked = !user.isBlocked;
    user.blockedAt = user.isBlocked ? new Date() : null;
    user.blockedBy = user.isBlocked ? req.user.id : null;
    
    await user.save();
    
    res.json({
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify/Unverify user email
router.put('/users/:userId/verify', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isVerified = !user.isVerified;
    user.verifiedAt = user.isVerified ? new Date() : null;
    user.verifiedBy = user.isVerified ? req.user.id : null;
    
    await user.save();
    
    res.json({
      message: `User email ${user.isVerified ? 'verified' : 'unverified'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user details (admin only)
router.put('/users/:userId', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email already exists (if being changed)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    
    user.updatedAt = new Date();
    await user.save();
    
    res.json({
      message: 'User updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isBlocked: user.isBlocked,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user account (admin only - soft delete)
router.delete('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Soft delete - mark as deleted instead of removing
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user.id;
    
    await user.save();
    
    res.json({
      message: 'User account deleted successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isDeleted: user.isDeleted,
        deletedAt: user.deletedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user activity log
router.get('/users/:userId/activity', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get user's orders for activity timeline
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .select('orderId status totalAmount createdAt paymentMethod');
    
    // Get user's reviews
    const reviews = await Review.find({ userId: req.params.userId })
      .populate('productId', 'title')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('rating comment createdAt productId');
    
    // Combine and sort activities
    const activities = [
      ...orders.map(order => ({
        type: 'order',
        date: order.createdAt,
        description: `Order ${order.orderId} - ${order.status}`,
        amount: order.totalAmount,
        data: order
      })),
      ...reviews.map(review => ({
        type: 'review',
        date: review.createdAt,
        description: `Reviewed ${review.productId?.title}`,
        rating: review.rating,
        data: review
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      activities: activities.slice(0, limitNum),
      pagination: {
        currentPage: pageNum,
        totalActivities: activities.length,
        limit: limitNum
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

// Update transaction status
router.put('/transactions/:transactionId/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['pending', 'completed', 'failed', 'refunded', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid transaction status' });
    }
    
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    transaction.status = status;
    transaction.adminNotes = notes || transaction.adminNotes;
    transaction.updatedAt = new Date();
    transaction.updatedBy = req.user.id;
    
    await transaction.save();
    
    res.json({
      message: 'Transaction status updated successfully',
      transaction
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process refund for transaction
router.post('/transactions/:transactionId/refund', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'Can only refund completed transactions' });
    }
    
    const refundAmount = amount || transaction.amount;
    
    if (refundAmount > transaction.amount) {
      return res.status(400).json({ error: 'Refund amount cannot exceed transaction amount' });
    }
    
    // Update transaction
    transaction.status = 'refunded';
    transaction.refundAmount = refundAmount;
    transaction.refundReason = reason;
    transaction.refundedAt = new Date();
    transaction.refundedBy = req.user.id;
    
    await transaction.save();
    
    // Update related order status
    if (transaction.orderId) {
      await Order.findByIdAndUpdate(transaction.orderId, {
        status: 'Refunded',
        refundAmount: refundAmount,
        refundReason: reason,
        refundedAt: new Date()
      });
    }
    
    res.json({
      message: 'Refund processed successfully',
      transaction,
      refundAmount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get transaction statistics
router.get('/transactions/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Set date range based on period
    let dateFilter = {};
    const now = new Date();
    
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
    
    // Transaction statistics
    const transactionStats = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          completedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          refundedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
          },
          totalRefundAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refundAmount', 0] }
          }
        }
      }
    ]);
    
    // Payment method breakdown
    const paymentMethods = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    // Success rate by day
    const dailyStats = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          totalTransactions: 1,
          successfulTransactions: 1,
          successRate: {
            $multiply: [
              { $divide: ['$successfulTransactions', '$totalTransactions'] },
              100
            ]
          },
          totalAmount: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    res.json({
      overview: transactionStats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        refundedTransactions: 0,
        totalRefundAmount: 0
      },
      paymentMethods,
      dailyStats
    });
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

// ============ NEWSLETTER MANAGEMENT ============

// Get all newsletter subscribers
router.get('/newsletter/subscribers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = {};
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const subscribers = await Subscriber.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    const totalSubscribers = await Subscriber.countDocuments(query);
    const totalPages = Math.ceil(totalSubscribers / limitNum);

    res.json({
      success: true,
      subscribers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalSubscribers,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching newsletter subscribers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete newsletter subscriber
router.delete('/newsletter/subscribers/:subscriberId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { subscriberId } = req.params;
    
    const deletedSubscriber = await Subscriber.findByIdAndDelete(subscriberId);
    
    if (!deletedSubscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({
      success: true,
      message: 'Subscriber deleted successfully',
      subscriber: deletedSubscriber
    });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send newsletter to all subscribers
router.post('/newsletter/send', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { subject, content, template = 'newsletter' } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ error: 'Subject and content are required' });
    }

    // Get all subscribers
    const subscribers = await Subscriber.find({});
    
    // Import mailer utility
    const { sendEmail } = require('../utils/mailer');
    
    let successCount = 0;
    let failureCount = 0;

    // Send emails to all subscribers
    for (const subscriber of subscribers) {
      try {
        await sendEmail(
          subscriber.email,
          subject,
          content,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                <h1 style="color: #333;">ShoeStopper Newsletter</h1>
              </div>
              <div style="padding: 20px;">
                <h2 style="color: #333;">${subject}</h2>
                <div style="line-height: 1.6; color: #555;">
                  ${content.replace(/\n/g, '<br>')}
                </div>
              </div>
              <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                <p>You're receiving this email because you subscribed to ShoeStopper newsletter.</p>
                <p>If you no longer wish to receive these emails, please contact us.</p>
              </div>
            </div>
          `
        );
        successCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${subscriber.email}:`, emailError);
        failureCount++;
      }
    }

    res.json({
      success: true,
      message: 'Newsletter sent successfully',
      stats: {
        totalSubscribers: subscribers.length,
        successCount,
        failureCount
      }
    });
  } catch (error) {
    console.error('Error sending newsletter:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Newsletter statistics
router.get('/newsletter/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalSubscribers = await Subscriber.countDocuments();
    
    // Subscribers by month
    const subscribersByMonth = await Subscriber.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Recent subscribers
    const recentSubscribers = await Subscriber.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select('email createdAt');

    res.json({
      success: true,
      stats: {
        totalSubscribers,
        subscribersByMonth,
        recentSubscribers
      }
    });
  } catch (error) {
    console.error('Error fetching newsletter stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// ============ DASHBOARD ANALYTICS ENDPOINTS ============

// Dashboard overview statistics
router.get('/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get current date for time-based queries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total users
    const totalUsers = await User.countDocuments();
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfToday } });
    const newUsersWeek = await User.countDocuments({ createdAt: { $gte: startOfWeek } });

    // Total products and variants
    const totalProducts = await Product.countDocuments();
    const totalVariants = await Variant.countDocuments();

    // Order statistics
    const totalOrders = await Order.countDocuments();
    const ordersToday = await Order.countDocuments({ createdAt: { $gte: startOfToday } });
    const ordersWeek = await Order.countDocuments({ createdAt: { $gte: startOfWeek } });
    const ordersMonth = await Order.countDocuments({ createdAt: { $gte: startOfMonth } });

    // Revenue statistics
    const revenueStats = await Order.aggregate([
      { $match: { status: { $in: ['Approved', 'Shipped', 'Delivered'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const revenueToday = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfToday },
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);

    const revenueWeek = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfWeek },
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
    ]);

    // Order status breakdown
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top selling products (last 30 days)
    const topProducts = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startOfMonth },
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
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
      success: true,
      stats: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersWeek
        },
        products: {
          total: totalProducts,
          totalVariants: totalVariants
        },
        orders: {
          total: totalOrders,
          today: ordersToday,
          thisWeek: ordersWeek,
          thisMonth: ordersMonth
        },
        revenue: {
          total: revenueStats[0]?.totalRevenue || 0,
          averageOrderValue: revenueStats[0]?.averageOrderValue || 0,
          today: revenueToday[0]?.revenue || 0,
          thisWeek: revenueWeek[0]?.revenue || 0
        },
        ordersByStatus,
        topProducts
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sales data for charts
router.get('/dashboard/sales', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter = {};
    let groupBy = {};
    const now = new Date();

    switch (period) {
      case '24h':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case '1y':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
    }

    const salesData = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: { $in: ['Approved', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    res.json({
      success: true,
      period,
      data: salesData
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Top products analytics
router.get('/dashboard/top-products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '1y':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
      default:
        dateFilter = {};
    }

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
          totalRevenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) },
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
      success: true,
      period,
      products: topProducts
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Recent orders for dashboard
router.get('/dashboard/recent-orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const recentOrders = await Order.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('orderId status totalAmount createdAt userId');

    res.json({
      success: true,
      orders: recentOrders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
