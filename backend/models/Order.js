const mongoose = require('mongoose');

// Schema for items in an order with fallbacks for property keys
const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Item' },
    itemName: { type: String, trim: true },
    title: { type: String, trim: true },
    price: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 }
  },
  { 
    _id: false,
    strict: false 
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true
    },
    source: {
      type: String,
      default: 'POS_COUNTER'
    },
    orderType: {
      type: String,
      default: 'TAKEAWAY'
    },
    tableNumber: {
      type: String,
      default: ''
    },
    customerName: {
      type: String,
      default: 'Guest'
    },
    customerPhone: {
      type: String,
      default: ''
    },
    items: [orderItemSchema],
    subTotal: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      default: 'PAID'
    },
    paymentMethod: {
      type: String,
      default: 'CASH'
    },
    razorpayOrderId: {
      type: String,
      default: ''
    },
    razorpayPaymentId: {
      type: String,
      default: ''
    },
    orderStatus: {
      type: String,
      default: 'NEW'
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema, 'orders');

module.exports = Order;