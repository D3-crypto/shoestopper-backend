const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const Cart = require('../models/Cart');
const Variant = require('../models/Variant');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Otp = require('../models/Otp');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

// Get all orders (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin && !req.user.email.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const orders = await Order.find({})
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's orders
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    console.log('📋 [USER ORDERS] Fetching orders for user:', req.user.email);
    
    const orders = await Order.find({ userId: req.user._id })
      .populate('items.productId', 'title images')
      .sort({ createdAt: -1 });
    
    console.log('📋 [USER ORDERS] Found', orders.length, 'orders');
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ [USER ORDERS ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order directly (for checkout)
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🛒 [ORDER CREATE] Creating order for user:', req.user.email);
    console.log('🛒 [ORDER CREATE] Request body:', JSON.stringify(req.body, null, 2));
    
    const { items, deliveryAddress, paymentMethod, total } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('❌ [ORDER CREATE] Missing or empty items');
      return res.status(400).json({ error: 'Items are required' });
    }
    
    if (!deliveryAddress) {
      console.log('❌ [ORDER CREATE] Missing delivery address');
      return res.status(400).json({ error: 'Delivery address is required' });
    }
    
    if (!paymentMethod) {
      console.log('❌ [ORDER CREATE] Missing payment method');
      return res.status(400).json({ error: 'Payment method is required' });
    }
    
    // Validate and calculate total
    let calculatedTotal = 0;
    const validatedItems = [];
    
    for (const item of items) {
      if (!item.productId || !item.quantity || (!item.price && item.price !== 0)) {
        console.log('❌ [ORDER CREATE] Invalid item data:', item);
        return res.status(400).json({ error: 'Invalid item data - missing productId, quantity, or price' });
      }
      
      calculatedTotal += item.price * item.quantity;
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        price: item.price,
        size: item.size || '',
        color: item.color || ''
      });
    }
    
    console.log('💰 [ORDER CREATE] Calculated total:', calculatedTotal);
    console.log('💰 [ORDER CREATE] Frontend total:', total);
    
    const orderId = uuidv4();
    const orderData = {
      orderId,
      userId: req.user._id,
      items: validatedItems,
      totalAmount: calculatedTotal,
      deliveryAddress: {
        name: deliveryAddress.name,
        phone: deliveryAddress.phone || '',
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state || '',
        pincode: deliveryAddress.pincode,
        isDefault: deliveryAddress.isDefault || false
      },
      payment: { 
        method: paymentMethod, 
        transactionId: null, 
        status: paymentMethod === 'cod' ? 'PendingCOD' : 'PaymentPending' 
      },
      status: paymentMethod === 'cod' ? 'Confirmed' : 'PaymentPending',
      statusHistory: [{ 
        status: paymentMethod === 'cod' ? 'Confirmed' : 'PaymentPending', 
        at: new Date() 
      }]
    };
    
    console.log('📦 [ORDER CREATE] Creating order with data:', JSON.stringify(orderData, null, 2));
    
    const order = new Order(orderData);
    await order.save();
    
    console.log('✅ [ORDER CREATE] Order created successfully:', order.orderId);
    
    // Create different messages based on payment method
    let message = 'Order placed successfully';
    let needsPayment = false;
    
    if (paymentMethod.toLowerCase() === 'cod') {
      message = 'Order placed successfully! You will pay cash on delivery.';
    } else {
      message = 'Order created! Please complete your payment to confirm the order.';
      needsPayment = true;
    }
    
    res.status(201).json({ 
      success: true, 
      order: {
        _id: order._id,
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        items: order.items,
        deliveryAddress: order.deliveryAddress
      },
      message,
      needsPayment
    });
    
  } catch (error) {
    console.error('❌ [ORDER CREATE ERROR]', error);
    console.error('❌ [ORDER CREATE ERROR STACK]', error.stack);
    res.status(500).json({ error: 'Failed to create order: ' + error.message });
  }
});

// Create order from cart (userId passed in body). Performs atomic stock decrement.
router.post('/create', async (req, res) => {
  const { userId, paymentMethod } = req.body;
  if (!userId || !paymentMethod) return res.status(400).json({ error: 'Missing fields' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Cart empty' });
    }

    // validate stock and decrement
    for (const it of cart.items) {
      const v = await Variant.findOneAndUpdate({ _id: it.variantId, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } }, { session, new: true });
      if (!v) throw new Error('Out of stock for variant ' + it.variantId);
    }

    const items = [];
    let total = 0;
    for (const it of cart.items) {
      const v = await Variant.findById(it.variantId).populate('productId').lean();
      if (!v || !v.productId) throw new Error('Product not found for variant ' + it.variantId);
      const price = v.productId.price;
      items.push({ productId: v.productId._id, variantId: it.variantId, qty: it.qty, price });
      total += (price * it.qty);
    }

    const orderId = uuidv4();
    const order = await Order.create([{
      orderId,
      userId,
      items,
      totalAmount: total,
      payment: { method: paymentMethod, transactionId: null, status: paymentMethod === 'COD' ? 'PendingCOD' : 'PaymentPending' },
      status: paymentMethod === 'COD' ? 'Approved' : 'PaymentPending',
      statusHistory: [{ status: paymentMethod === 'COD' ? 'Approved' : 'PaymentPending', at: new Date() }]
    }], { session });

    // create transaction record only for non-COD attempts
    let tx = null;
    if (paymentMethod !== 'COD') {
      const txId = uuidv4();
  tx = await Transaction.create([{ transactionId: txId, orderId: order[0]._id, userId, method: paymentMethod, status: 'Created' }], { session });
      // attach transactionId to order
      await Order.findByIdAndUpdate(order[0]._id, { 'payment.transactionId': txId }, { session });
    }

    // clear cart
    await Cart.findOneAndDelete({ userId }, { session });

    await session.commitTransaction();
    session.endSession();

    // Send order confirmation email
    const user = await User.findById(userId);
    if (user) {
      await sendMail({
        to: user.email,
        subject: 'Order Confirmation',
        text: `Your order ${order[0].orderId} has been ${paymentMethod === 'COD' ? 'approved' : 'created'}. Total: $${total}`
      });
    }

    res.json({ ok: true, orderId: order[0].orderId, transactionId: tx ? tx[0].transactionId : null });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Initiate payment: generate transaction attempt and send OTP to user's email for confirmation
router.post('/pay/initiate', async (req, res) => {
  try {
    const { orderId, method } = req.body;
    if (!orderId || !method) return res.status(400).json({ error: 'Missing fields' });
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment.method === 'COD') return res.status(400).json({ error: 'COD order does not require payment' });

    const txId = uuidv4();
    const tx = await Transaction.create({ transactionId: txId, orderId: order._id, userId: order.userId, method, status: 'Created' });

    // create OTP for payment confirmation
    const user = await User.findById(order.userId);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.create({ email: user.email, otp, otpType: 'PAYMENT_CONFIRM', expiresAt });
    await sendMail({ to: user.email, subject: 'Confirm Payment OTP', text: `Enter this OTP to confirm payment: ${otp}` });

    res.json({ ok: true, transactionId: txId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Confirm payment: verify OTP and mark transaction as Paid and order as Paid
router.post('/pay/confirm', async (req, res) => {
  try {
    const { orderId, transactionId, otp } = req.body;
    if (!orderId || !transactionId || !otp) return res.status(400).json({ error: 'Missing fields' });
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const tx = await Transaction.findOne({ transactionId });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const user = await User.findById(order.userId);
    const valid = await Otp.findOne({ email: user.email, otp, otpType: 'PAYMENT_CONFIRM' });
    if (!valid) return res.status(400).json({ error: 'Invalid OTP' });
    await Otp.deleteMany({ email: user.email, otpType: 'PAYMENT_CONFIRM' });

    tx.status = 'Paid';
    await tx.save();
    order.payment.status = 'Paid';
    order.status = 'Paid';
    order.statusHistory.push({ status: 'Paid', at: new Date() });
    await order.save();

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin or user view order
router.get('/:orderId', async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId }).lean();
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

// Cancel order (only allowed until Approved)
router.post('/:orderId/cancel', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId.toString() !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (['Approved', 'Shipped', 'Delivered'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot cancel order after approval' });
    }
    
    // Restore stock for cancelled order
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      for (const item of order.items) {
        await Variant.findByIdAndUpdate(item.variantId, { $inc: { stock: item.qty } }, { session });
      }
      
      order.status = 'Cancelled';
      order.statusHistory.push({ status: 'Cancelled', at: new Date(), note: reason });
      await order.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      res.json(order);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete payment and finalize order
router.put('/:orderId/complete', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, paymentMethod } = req.body;
    
    console.log('💳 [COMPLETE ORDER] Completing order:', orderId, 'with payment method:', paymentMethod);
    
    // Find the order
    const order = await Order.findOne({ orderId, userId: req.user._id });
    
    if (!order) {
      console.log('❌ [COMPLETE ORDER] Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Update order status
    order.status = 'confirmed';
    order.paymentStatus = paymentStatus || 'completed';
    order.paymentMethod = paymentMethod;
    order.updatedAt = new Date();
    
    await order.save();
    
    console.log('✅ [COMPLETE ORDER] Order completed successfully:', orderId);
    
    res.json({
      success: true,
      message: 'Order completed successfully',
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus
      }
    });
    
  } catch (error) {
    console.error('❌ [COMPLETE ORDER] Error:', error);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

module.exports = router;
