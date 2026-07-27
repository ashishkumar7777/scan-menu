const mongoose = require('mongoose');
const Order = require('../models/Order');

// 🟢 1. Create New Order Controller
const createOrder = async (req, res) => {
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

    // Map items explicitly so name, price, and quantity are never lost
    const formattedItems = (items || []).map((item) => {
      const resolvedName = item.name || item.itemName || item.title || item.item_name || 'Item';
      const resolvedPrice = Number(item.price) || 0;
      const resolvedQty = Number(item.quantity) || 1;

      return {
        name: resolvedName,
        itemName: resolvedName,
        price: resolvedPrice,
        quantity: resolvedQty,
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

    // Broadcast new order via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_order_received', savedOrder);
    }

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: savedOrder,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
};

// 🟢 2. Update Order Controller
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId 
      ? { $or: [{ _id: id }, { orderId: id }] } 
      : { orderId: id };

    if (updateData.subTotal !== undefined || updateData.discount !== undefined) {
      const existingOrder = await Order.findOne(query);

      if (!existingOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const subTotal = updateData.subTotal ?? existingOrder.subTotal;
      const discount = updateData.discount ?? existingOrder.discount;
      updateData.grandTotal = Math.max(0, subTotal - discount);
    }

    const updatedOrder = await Order.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    });
  }
};

module.exports = { createOrder, updateOrder };