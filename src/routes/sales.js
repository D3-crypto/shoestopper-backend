const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get total counts
    const totalUsers = await User.countDocuments({ isAdmin: { $ne: true } });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments({ status: 'confirmed' });
    
    // Get current month sales from completed orders
    const currentMonthSales = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: currentMonthStart,
            $lte: currentMonthEnd
          },
          status: 'confirmed',
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' },
          totalQuantity: { 
            $sum: { 
              $sum: '$items.quantity' 
            }
          }
        }
      }
    ]);

    // Get total sales amount from all completed orders
    const totalSalesResult = await Order.aggregate([
      {
        $match: { 
          status: 'confirmed',
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    const stats = {
      totalUsers,
      totalProducts,
      totalOrders,
      currentMonthSales: currentMonthSales[0]?.totalAmount || 0,
      currentMonthQuantity: currentMonthSales[0]?.totalQuantity || 0,
      totalSales: totalSalesResult[0]?.totalAmount || 0
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent sales
router.get('/recent-sales', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Get recent completed orders as sales data
    const recentOrders = await Order.find({ 
      status: 'confirmed',
      paymentStatus: 'completed'
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('userId', 'name email')
      .populate('items.productId', 'title images');

    // Transform order data to match sales format
    const recentSales = recentOrders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      customerName: order.userId?.name || order.deliveryAddress?.fullName || 'Unknown',
      customerEmail: order.userId?.email || 'Unknown',
      totalAmount: order.total,
      saleDate: order.updatedAt,
      paymentMethod: order.paymentMethod,
      items: order.items.map(item => ({
        productName: item.productId?.title || 'Unknown Product',
        productImage: item.productId?.images?.[0] || null,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color
      }))
    }));

    res.json({ success: true, sales: recentSales });
  } catch (error) {
    console.error('Error fetching recent sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new sale (optional - for manual sales tracking)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const {
      productId,
      productName,
      productColor,
      productSize,
      price,
      quantity,
      orderId,
      customerName,
      customerEmail
    } = req.body;

    const totalAmount = price * quantity;

    const sale = new Sale({
      productId,
      productName,
      productColor,
      productSize,
      price,
      quantity,
      totalAmount,
      userId: req.user._id,
      customerName,
      customerEmail,
      orderId,
      status: 'completed'
    });

    await sale.save();

    res.status(201).json({ success: true, sale });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
