const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  
  // ⚡ FIX: 'QR_SCAN' ko enum array mein include kar do
  source: { 
    type: String, 
    enum: ['POS_COUNTER', 'QR_SCAN', 'ONLINE'], 
    default: 'POS_COUNTER' 
  },
  
  orderType: { 
    type: String, 
    enum: ['TAKEAWAY', 'DINE_IN', 'DELIVERY'], 
    default: 'DINE_IN' 
  },
  
  tableNumber: { type: String, default: '' },
  
  items: [
    {
      id: { type: String },
      itemId: { type: String },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  
  subTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  
  paymentMethod: { type: String, default: 'CASH' },
  paymentStatus: { type: String, default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);