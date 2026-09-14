const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Helper function to build timezone-safe date boundaries
const parseDateBoundary = (dateStr, isEndOfDay = false) => {
  if (!dateStr) return null;
  let year, month, day;

  if (dateStr.includes('-')) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    if (parts[0] > 12) {
      // DD/MM/YYYY
      [day, month, year] = parts;
    } else {
      // MM/DD/YYYY
      [month, day, year] = parts;
    }
  } else {
    const d = new Date(dateStr);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  const result = new Date(year, month - 1, day);
  if (isEndOfDay) {
    result.setHours(23, 59, 59, 999);
  } else {
    result.setHours(0, 0, 0, 0);
  }
  return result;
};

// Unified Analytics Handler (Handles both /sales and /analytics)
const getSalesReport = async (req, res) => {
  try {
    // Support both parameter naming conventions (from/to & startDate/endDate)
    const fromParam = req.query.from || req.query.startDate;
    const toParam = req.query.to || req.query.endDate;

    let start, end;

    if (fromParam && toParam) {
      start = parseDateBoundary(fromParam, false);
      end = parseDateBoundary(toParam, true);
    } else {
      // Default: Today's exact local midnight to end of day
      start = new Date();
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const dateFilter = {
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'CANCELLED' }
    };

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

    // 2. Payment Method Breakdown
    const paymentAggregation = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toUpper: { $ifNull: ['$paymentMethod', 'CASH'] } },
          count: { $sum: 1 },
          amount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          }
        }
      }
    ]);

    const paymentBreakdown = {
      CASH: { count: 0, amount: 0, total: 0 },
      UPI: { count: 0, amount: 0, total: 0 },
      CARD: { count: 0, amount: 0, total: 0 }
    };

    paymentAggregation.forEach((item) => {
      const key = (item._id || '').trim();
      if (key.includes('UPI') || key.includes('ONLINE') || key.includes('RAZORPAY')) {
        paymentBreakdown.UPI.count += item.count;
        paymentBreakdown.UPI.amount += item.amount;
        paymentBreakdown.UPI.total += item.amount;
      } else if (key.includes('CARD')) {
        paymentBreakdown.CARD.count += item.count;
        paymentBreakdown.CARD.amount += item.amount;
        paymentBreakdown.CARD.total += item.amount;
      } else {
        paymentBreakdown.CASH.count += item.count;
        paymentBreakdown.CASH.amount += item.amount;
        paymentBreakdown.CASH.total += item.amount;
      }
    });

    // 3. Order Channels Breakdown
    const orderTypeAggregation = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toUpper: { $ifNull: ['$orderType', 'TAKEAWAY'] } },
          count: { $sum: 1 },
          amount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          }
        }
      }
    ]);

    const channelBreakdown = {
      DINE_IN: { count: 0, amount: 0, total: 0 },
      TAKEAWAY: { count: 0, amount: 0, total: 0 },
      DELIVERY: { count: 0, amount: 0, total: 0 }
    };

    orderTypeAggregation.forEach((item) => {
      const key = (item._id || '').trim().replace('-', '_');
      if (key.includes('DINE')) {
        channelBreakdown.DINE_IN.count += item.count;
        channelBreakdown.DINE_IN.amount += item.amount;
        channelBreakdown.DINE_IN.total += item.amount;
      } else if (key.includes('DELIVERY')) {
        channelBreakdown.DELIVERY.count += item.count;
        channelBreakdown.DELIVERY.amount += item.amount;
        channelBreakdown.DELIVERY.total += item.amount;
      } else {
        channelBreakdown.TAKEAWAY.count += item.count;
        channelBreakdown.TAKEAWAY.amount += item.amount;
        channelBreakdown.TAKEAWAY.total += item.amount;
      }
    });

    // 4. Ordering Source Breakdown
    const sourceAggregation = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $toUpper: { $ifNull: ['$source', 'POS_COUNTER'] } },
          count: { $sum: 1 },
          amount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$subTotal', '$totalAmount'] }]
            }
          }
        }
      }
    ]);

    const sourceBreakdown = {
      QR_MENU: { count: 0, amount: 0, total: 0 },
      POS_COUNTER: { count: 0, amount: 0, total: 0 }
    };

    sourceAggregation.forEach((item) => {
      const key = (item._id || '').trim();
      if (key.includes('QR')) {
        sourceBreakdown.QR_MENU.count += item.count;
        sourceBreakdown.QR_MENU.amount += item.amount;
        sourceBreakdown.QR_MENU.total += item.amount;
      } else {
        sourceBreakdown.POS_COUNTER.count += item.count;
        sourceBreakdown.POS_COUNTER.amount += item.amount;
        sourceBreakdown.POS_COUNTER.total += item.amount;
      }
    });

    // 5. Best Selling Items
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
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 }
    ]);

    const responsePayload = {
      success: true,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      paymentBreakdown,
      channelBreakdown,
      orderTypeBreakdown: channelBreakdown,
      sourceBreakdown,
      topSellingItems: bestSellers,
      bestSellers,
      data: {
        summary: { totalRevenue, totalOrders, avgOrderValue },
        paymentBreakdown,
        orderTypeBreakdown: channelBreakdown,
        sourceBreakdown,
        bestSellers
      }
    };

    return res.json(responsePayload);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Mount route to all possible endpoints
router.get('/sales', getSalesReport);
router.get('/analytics', getSalesReport);
router.get('/', getSalesReport);

module.exports = router;