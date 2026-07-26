const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ isAvailable: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new menu item
router.post('/', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;