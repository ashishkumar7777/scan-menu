const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');

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

module.exports = router;