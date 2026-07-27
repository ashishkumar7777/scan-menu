const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // e.g., "Cheese Margherita Pizza"
  },
  price: {
    type: Number,
    required: true,
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0, // e.g., 50
  },
  lowStockThreshold: {
    type: Number,
    default: 5, // Jab stock 5 ya usse kam bacha ho toh warning alert do
  },
  isAvailable: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);