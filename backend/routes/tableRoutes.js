const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// 1. Get Live Table Layout Status
router.get('/status', async (req, res) => {
  try {
    const totalTablesCount = 12;
    
    // Fetch active dining orders that are NOT yet COMPLETED or CANCELLED
    const activeOrders = await Order.find({
      orderType: 'DINE_IN',
      status: { $in: ['NEW', 'PREPARING', 'READY', 'SERVED'] },
      tableNo: { $exists: true, $ne: '' }
    }).sort({ createdAt: -1 });

    const tables = [];
    for (let i = 1; i <= totalTablesCount; i++) {
      const tableNumStr = String(i);
      const activeOrder = activeOrders.find((o) => String(o.tableNo) === tableNumStr);

      if (activeOrder) {
        // If served, show as BILLED / SERVED (Yellow), otherwise OCCUPIED (Red)
        const isServed = activeOrder.status === 'SERVED';
        tables.push({
          tableNo: tableNumStr,
          status: isServed ? 'BILLED' : 'OCCUPIED',
          order: activeOrder,
          occupiedSince: activeOrder.createdAt,
          totalAmount: Number(activeOrder.grandTotal || activeOrder.subTotal || activeOrder.totalAmount || 0)
        });
      } else {
        tables.push({
          tableNo: tableNumStr,
          status: 'AVAILABLE',
          order: null,
          occupiedSince: null,
          totalAmount: 0
        });
      }
    }

    return res.json({ success: true, tables });
  } catch (error) {
    console.error('Table status error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Switch Table / Transfer Order
router.post('/switch', async (req, res) => {
  try {
    const { orderId, fromTable, toTable } = req.body;

    const existingOrder = await Order.findOne({ orderId });
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    existingOrder.tableNo = String(toTable);
    await existingOrder.save();

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.emit('table_status_updated');
      io.emit('order_status_updated', existingOrder);
    }

    return res.json({ success: true, message: `Transferred Table #${fromTable} to Table #${toTable}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. 1-Click Vacate Table (Marks order as COMPLETED)
router.post('/vacate', async (req, res) => {
  try {
    const { tableNo, orderId } = req.body;

    let filter = {};
    if (orderId) {
      filter = { orderId };
    } else {
      filter = {
        tableNo: String(tableNo),
        status: { $in: ['NEW', 'PREPARING', 'READY', 'SERVED'] }
      };
    }

    const updatedOrder = await Order.findOneAndUpdate(
      filter,
      { $set: { status: 'COMPLETED', paymentStatus: 'PAID' } },
      { new: true }
    );

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.emit('table_status_updated');
      io.emit('order_status_updated', updatedOrder);
    }

    return res.json({ success: true, message: `Table #${tableNo} has been vacated.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;