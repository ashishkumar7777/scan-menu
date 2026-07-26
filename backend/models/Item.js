const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., 'p1', 'p2'
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }, // 'mains', 'breakfast', 'drinks', 'desserts'
  img: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);