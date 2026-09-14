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

// 2. Get ALL items (POS Inventory / Admin View)
router.get('/all', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Add new menu item
router.post('/add', async (req, res) => {
  try {
    const { name, price, category, currentStock, lowStockThreshold, isAvailable } = req.body;
    
    // Generate an ID if not provided
    const customId = `p${Date.now().toString().slice(-4)}`;

    const newItem = new Item({
      id: customId,
      name,
      price: Number(price),
      category: category ? category.toLowerCase().trim() : 'mains',
      currentStock: Number(currentStock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
    });

    const savedItem = await newItem.save();

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) io.emit('item_status_changed', savedItem);

    res.status(201).json({ success: true, item: savedItem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 4. Update existing menu item
router.put('/update/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const { name, price, category, currentStock, lowStockThreshold, isAvailable } = req.body;

    const query = itemId.match(/^[0-9a-fA-F]{24}$/) ? { _id: itemId } : { id: itemId };

    const updatedItem = await Item.findOneAndUpdate(
      query,
      {
        name,
        price: Number(price),
        category: category ? category.toLowerCase().trim() : 'mains',
        currentStock: Number(currentStock),
        lowStockThreshold: Number(lowStockThreshold),
        isAvailable,
      },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) io.emit('item_status_changed', updatedItem);

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 5. Quick Availability Toggle (In-Stock / Sold-Out)
router.patch('/:id/toggle-availability', async (req, res) => {
  try {
    const itemId = req.params.id;
    const query = itemId.match(/^[0-9a-fA-F]{24}$/) ? { _id: itemId } : { id: itemId };

    const item = await Item.findOne(query);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.emit('item_status_changed', { id: item.id, _id: item._id, isAvailable: item.isAvailable });
    }

    res.json({ success: true, isAvailable: item.isAvailable, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Update Stock Quantity
router.patch('/:id/stock', async (req, res) => {
  try {
    const itemId = req.params.id;
    const { stockQuantity } = req.body;

    const query = itemId.match(/^[0-9a-fA-F]{24}$/) ? { _id: itemId } : { id: itemId };

    const updatedItem = await Item.findOneAndUpdate(
      query,
      { currentStock: Number(stockQuantity) },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) io.emit('item_status_changed', updatedItem);

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Delete Item
router.delete('/delete/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const query = itemId.match(/^[0-9a-fA-F]{24}$/) ? { _id: itemId } : { id: itemId };

    const deletedItem = await Item.findOneAndDelete(query);
    if (!deletedItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const io = req.app.get('socketio') || req.app.get('io');
    if (io) io.emit('item_status_changed', { deletedId: itemId });

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;