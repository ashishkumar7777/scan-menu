const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// 1. Create Order (POS / Scan Menu)
router.post('/create', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData.orderId) {
      orderData.orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    }

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    // Trigger Socket.io event for real-time notification on POS
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_order_received', savedOrder);
    }

    res.status(201).json({ success: true, order: savedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Fetch All Orders (NEW - Live Orders Dashboard ke liye)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Calendar / Date-Range Sales Analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { paymentStatus: 'PAID' };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59))
      };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const cashRevenue = orders.filter(o => o.paymentMethod === 'CASH').reduce((sum, o) => sum + o.grandTotal, 0);
    const upiRevenue = orders.filter(o => o.paymentMethod === 'UPI').reduce((sum, o) => sum + o.grandTotal, 0);

    res.json({
      success: true,
      summary: {
        totalOrders: orders.length,
        totalRevenue,
        cashRevenue,
        upiRevenue
      },
      orders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;