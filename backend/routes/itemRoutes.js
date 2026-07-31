const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// 1. Get menu items for QR Menu (Only available items)
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ isAvailable: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Get ALL items (POS Inventory / Admin View ke liye - includes unavailable items)
router.get('/all', async (req, res) => {
  try {
    const items = await Item.find().sort({ category: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Add new menu item
router.post('/', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 🟢 4. Quick Availability Toggle (In-Stock / Sold-Out)
router.patch('/:id/toggle-availability', async (req, res) => {
  try {
    const item = await Item.findOne({ id: req.params.id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    // Notify POS / Menu via Socket.io if available
    const io = req.app.get('socketio');
    if (io) {
      io.emit('item_status_changed', { id: item.id, isAvailable: item.isAvailable });
    }

    res.json({ success: true, isAvailable: item.isAvailable, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🟢 5. Update Stock Quantity & Track Status
router.patch('/:id/update-stock', async (req, res) => {
  try {
    const { stockQuantity, trackStock, isAvailable } = req.body;
    
    const updateData = {};
    if (stockQuantity !== undefined) updateData.stockQuantity = stockQuantity;
    if (trackStock !== undefined) updateData.trackStock = trackStock;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const updatedItem = await Item.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;