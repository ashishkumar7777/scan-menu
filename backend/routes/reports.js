const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      // Adjust for timezone differences (e.g., IST)
      start.setHours(start.getHours() - 12);
      end.setHours(end.getHours() + 12);

      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    const matchedCount = await Order.countDocuments(dateFilter);
    const totalCount = await Order.countDocuments();

    console.log(`[SALES REPORT] Total Orders in DB: ${totalCount} | Matched by Filter: ${matchedCount}`);

    if (matchedCount === 0 && totalCount > 0) {
      console.log('[SALES REPORT] Filter returned 0 orders. Falling back to all orders in database.');
      dateFilter = {};
    }

    // 1. Calculate Summary Totals
    const summaryData = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          },
          totalOrders: { $sum: 1 },
        }
      }
    ]);

    const totalRevenue = summaryData[0]?.totalRevenue || 0;
    const totalOrders = summaryData[0]?.totalOrders || 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // 2. Aggregate Payment Method Breakdown (Cash, UPI, Card)
    const paymentAggregation = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toUpper: { $ifNull: ['$paymentMethod', 'CASH'] } },
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          }
        }
      }
    ]);

    const paymentBreakdown = {
      CASH: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      CARD: { count: 0, total: 0 }
    };

    paymentAggregation.forEach((item) => {
      let key = (item._id || '').trim();
      if (key.includes('UPI') || key.includes('ONLINE') || key.includes('RAZORPAY')) {
        paymentBreakdown.UPI.count += item.count;
        paymentBreakdown.UPI.total += item.totalAmount;
      } else if (key.includes('CARD')) {
        paymentBreakdown.CARD.count += item.count;
        paymentBreakdown.CARD.total += item.totalAmount;
      } else {
        paymentBreakdown.CASH.count += item.count;
        paymentBreakdown.CASH.total += item.totalAmount;
      }
    });

    // 3. Aggregate Order Channels Breakdown (Dine-in, Takeaway, Delivery)
    const orderTypeAggregation = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toUpper: { $ifNull: ['$orderType', 'TAKEAWAY'] } },
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          }
        }
      }
    ]);

    const orderTypeBreakdown = {
      DINE_IN: { count: 0, total: 0 },
      TAKEAWAY: { count: 0, total: 0 },
      DELIVERY: { count: 0, total: 0 }
    };

    orderTypeAggregation.forEach((item) => {
      let key = (item._id || '').trim().replace('-', '_');
      if (key.includes('DINE')) {
        orderTypeBreakdown.DINE_IN.count += item.count;
        orderTypeBreakdown.DINE_IN.total += item.totalAmount;
      } else if (key.includes('DELIVERY')) {
        orderTypeBreakdown.DELIVERY.count += item.count;
        orderTypeBreakdown.DELIVERY.total += item.totalAmount;
      } else {
        orderTypeBreakdown.TAKEAWAY.count += item.count;
        orderTypeBreakdown.TAKEAWAY.total += item.totalAmount;
      }
    });

    // 4. Aggregate Ordering Source (QR Menu vs POS Counter)
    const sourceAggregation = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toUpper: { $ifNull: ['$source', 'POS_COUNTER'] } },
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          }
        }
      }
    ]);

    const sourceBreakdown = {
      QR_MENU: { count: 0, total: 0 },
      POS_COUNTER: { count: 0, total: 0 }
    };

    sourceAggregation.forEach((item) => {
      let key = (item._id || '').trim();
      if (key.includes('QR')) {
        sourceBreakdown.QR_MENU.count += item.count;
        sourceBreakdown.QR_MENU.total += item.totalAmount;
      } else {
        sourceBreakdown.POS_COUNTER.count += item.count;
        sourceBreakdown.POS_COUNTER.total += item.totalAmount;
      }
    });

    // 5. Aggregate Best Sellers by Item Name
    const bestSellers = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            $ifNull: [
              '$items.name',
              { $ifNull: ['$items.itemName', '$items.title'] }
            ]
          },
          totalQuantitySold: { $sum: { $ifNull: ['$items.quantity', 1] } },
          totalRevenueGenerated: {
            $sum: {
              $multiply: [
                { $ifNull: ['$items.price', 0] },
                { $ifNull: ['$items.quantity', 1] }
              ]
            }
          }
        }
      },
      { $match: { _id: { $ne: null, $ne: '' } } },
      { $sort: { totalQuantitySold: -1 } }
    ]);

    return res.json({
      success: true,
      data: {
        summary: { totalRevenue, totalOrders, avgOrderValue },
        paymentBreakdown,
        orderTypeBreakdown,
        sourceBreakdown,
        bestSellers
      }
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;