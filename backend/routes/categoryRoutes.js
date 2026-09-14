const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Item = require('../models/Item');

// 1. Get all categories
router.get('/all', async (req, res) => {
  try {
    let categories = await Category.find().sort({ createdAt: 1 });
    if (categories.length === 0) {
      const defaults = [
        { name: 'Mains', slug: 'mains' },
        { name: 'Breakfast', slug: 'breakfast' },
        { name: 'Drinks', slug: 'drinks' },
        { name: 'Desserts', slug: 'desserts' },
      ];
      categories = await Category.insertMany(defaults);
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Add Category
router.post('/add', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const newCategory = new Category({ name: name.trim(), slug });
    await newCategory.save();

    res.status(201).json({ success: true, category: newCategory });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. Edit / Rename Category (Cascade updates to all items)
router.put('/update/:oldSlug', async (req, res) => {
  try {
    const { oldSlug } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'New category name is required' });
    }

    const newSlug = name.trim().toLowerCase().replace(/\s+/g, '-');

    const updatedCategory = await Category.findOneAndUpdate(
      { slug: oldSlug },
      { name: name.trim(), slug: newSlug },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // ⚡ Cascade: Update all items belonging to old category
    await Item.updateMany({ category: oldSlug }, { category: newSlug });

    res.json({ success: true, category: updatedCategory });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Delete Category
router.delete('/delete/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const deleted = await Category.findOneAndDelete({ slug });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: `Category "${slug}" deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;