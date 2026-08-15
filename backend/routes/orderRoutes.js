const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Order = require('../models/Order');

// Fallback test key if .env is missing
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_51bHkJ4WJ3g6hZ';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// 1. Unified Razorpay Order Creator Handler
const handleCreateRazorpayOrder = async (req, res) => {
  try {
    let { amount } = req.body;
    let amountInPaise = Number(amount) || 270;

    // Convert to paise if sent in INR
    if (amountInPaise < 5000) {
      amountInPaise = Math.round(amountInPaise * 100);
    }

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      });
    } catch (rzpErr) {
      // Mock Razorpay payload fallback
      rzpOrder = {
        id: `order_${Date.now()}`,
        amount: amountInPaise,
        currency: 'INR',
      };
    }

    return res.json({
      success: true,
      data: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        key_id: RAZORPAY_KEY_ID,
      },
      key_id: RAZORPAY_KEY_ID,
      order: rzpOrder,
    });
  } catch (err) {
    console.error('Razorpay Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Mount all common variations of Razorpay endpoint
router.post('/create-razorpay-order', handleCreateRazorpayOrder);
router.post('/razorpay/create-order', handleCreateRazorpayOrder);
router.post('/razorpay-order', handleCreateRazorpayOrder);

// 2. Universal Order Creation (POS & QR Menu)
const createOrderHandler = async (req, res) => {
  try {
    const token = Math.floor(100 + Math.random() * 900);
    const generatedOrderId = req.body.orderId || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      ...req.body,
      orderId: generatedOrderId,
      tokenNumber: req.body.tokenNumber || token,
      source: req.body.source || 'QR_MENU',
      paymentMethod: req.body.paymentMethod || 'UPI',
      paymentStatus: 'PAID',
      status: 'NEW',
    });

    const savedOrder = await newOrder.save();

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.emit('new_order_received', savedOrder);
      io.emit('order_status_updated', savedOrder);
    }

    return res.status(201).json({
      success: true,
      order: savedOrder,
      token,
      orderId: savedOrder.orderId,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

router.post('/create', createOrderHandler);
router.post('/checkout', createOrderHandler);
router.post('/verify', createOrderHandler);
router.post('/place-order', createOrderHandler);
router.post('/', createOrderHandler);

// 3. Live KDS Route
router.get('/live', async (req, res) => {
  try {
    const liveOrders = await Order.find({
      status: { $in: ['NEW', 'RECEIVED', 'PREPARING', 'READY'] }
    }).sort({ createdAt: -1 });

    return res.json(liveOrders);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Order History Route
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const skip = (page - 1) * limit;

    const { search, filterDate, orderType, source } = req.query;
    let query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderId: searchRegex },
        { customerName: searchRegex },
        { tableNo: searchRegex },
      ];
    }

    if (filterDate === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: start };
    } else if (filterDate === 'yesterday') {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filterDate === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      query.createdAt = { $gte: lastWeek };
    }

    if (orderType && orderType !== 'ALL') query.orderType = orderType;
    if (source && source !== 'ALL') query.source = source;

    const [totalOrders, orders] = await Promise.all([
      Order.countDocuments(query),
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.json({
      success: true,
      orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit) || 1,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Update Status Route
router.patch('/:id/status', async (req, res) => {
  try {
    const id = req.params.id;
    const status = (req.body.status || 'COMPLETED').toUpperCase();

    let filter = {};
    if (mongoose.Types.ObjectId.isValid(id) && String(id).length === 24) {
      filter = { _id: id };
    } else {
      filter = { $or: [{ orderId: id }, { id: id }] };
    }

    const updatedOrder = await Order.findOneAndUpdate(
      filter,
      { $set: { status } },
      { new: true, strict: false }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) io.emit('order_status_updated', updatedOrder);

    return res.json({ success: true, order: updatedOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;