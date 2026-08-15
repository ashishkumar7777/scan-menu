const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  id: {
    type: String
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true, // Stores all categories in lowercase for clean querying
  },
  currentStock: {
    type: Number,
    default: 50,
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);