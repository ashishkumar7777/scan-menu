const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};

    if (startDate && endDate) {
      // Parse ISO boundaries
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      // Extend window slightly for timezone differences (e.g. IST)
      start.setHours(start.getHours() - 12);
      end.setHours(end.getHours() + 12);

      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }

    // Check how many documents match the filter
    let matchedCount = await Order.countDocuments(dateFilter);
    const totalCount = await Order.countDocuments();

    console.log(`[SALES REPORT] Total Orders in DB: ${totalCount} | Matched by Filter: ${matchedCount}`);

    // If date filter yields 0 results but orders exist in DB, fallback to query ALL orders
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

    // 2. Aggregate Best Sellers by Item Name
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
        bestSellers
      }
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;