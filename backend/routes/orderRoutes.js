const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const { getRazorpayClient, keyId, keySecret } = require('../config/razorpay');

// 🟢 1. GET all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🟢 2. POST Create Order
const createOrderHandler = async (req, res) => {
  try {
    const {
      orderId,
      source,
      orderType,
      tableNumber,
      customerName,
      customerPhone,
      items,
      subTotal,
      discount,
      grandTotal,
      paymentMethod,
      paymentStatus,
    } = req.body;

    // Preserve item names, prices, and quantities properly
    const formattedItems = (items || []).map((item) => {
      const resolvedName = item.name || item.itemName || item.title || item.item_name || 'Item';
      return {
        name: resolvedName,
        itemName: resolvedName,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      };
    });

    const generatedId = orderId || `POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      orderId: generatedId,
      source: source || 'POS_COUNTER',
      orderType: orderType || 'TAKEAWAY',
      tableNumber: tableNumber || '',
      customerName: customerName || 'Guest',
      customerPhone: customerPhone || '',
      items: formattedItems,
      subTotal: Number(subTotal) || 0,
      discount: Number(discount) || 0,
      grandTotal: Number(grandTotal) || Number(subTotal) || 0,
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: paymentStatus || 'PAID',
    });

    const savedOrder = await newOrder.save();

    // Broadcast new order real-time via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_order_received', savedOrder);
    }

    return res.status(201).json({ success: true, data: savedOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/create', createOrderHandler);
router.post('/', createOrderHandler);

// 🟢 3. PATCH / PUT Update Order
const updateOrderHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId 
      ? { $or: [{ _id: id }, { orderId: id }] } 
      : { orderId: id };

    const updatedOrder = await Order.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.patch('/orders/:id', updateOrderHandler);
router.put('/orders/:id', updateOrderHandler);
router.patch('/:id', updateOrderHandler);
router.put('/:id', updateOrderHandler);

// Create Razorpay order for checkout
router.post('/create-razorpay-order', async (req, res) => {
  try {
    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const razorpay = getRazorpayClient();
    const { amount, orderId } = req.body;
    const amountInPaise = Math.round(Number(amount));

    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid amount (in paise) is required.',
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: orderId || `rcpt_${Date.now()}`,
    });

    if (orderId) {
      const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
      const query = isObjectId
        ? { $or: [{ _id: orderId }, { orderId }] }
        : { orderId };

      await Order.findOneAndUpdate(query, {
        $set: {
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: 'PENDING',
          paymentMethod: 'RAZORPAY',
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...razorpayOrder,
        key_id: keyId,
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Verify Razorpay payment signature and mark order as paid
router.post('/verify-payment', async (req, res) => {
  try {
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured. Set RAZORPAY_KEY_SECRET.',
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (
      expectedSignature.length !== razorpay_signature.length ||
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(razorpay_signature, 'utf8')
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature.',
      });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        $set: {
          paymentStatus: 'PAID',
          razorpayPaymentId: razorpay_payment_id,
          paymentMethod: 'RAZORPAY',
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for the given Razorpay order ID.',
        verified: true,
      });
    }

    const io = req.app.get('socketio');
    if (io) {
      io.emit('order_payment_verified', updatedOrder);
    }

    return res.status(200).json({
      success: true,
      verified: true,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;