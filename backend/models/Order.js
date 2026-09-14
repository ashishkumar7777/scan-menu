const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    tokenNumber: {
      type: Number,
    },
    source: {
      type: String,
      enum: ['POS_COUNTER', 'QR_MENU', 'ONLINE', 'POS'],
      default: 'POS_COUNTER',
    },
    orderType: {
      type: String,
      enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
      default: 'TAKEAWAY',
    },
    tableNo: {
      type: String,
      default: '',
    },
    customerName: {
      type: String,
      default: 'Guest',
    },
    whatsappNumber: {
      type: String,
      default: '',
    },
    items: [
      {
        itemId: { type: String },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, default: 1 },
      },
    ],
    subTotal: {
      type: Number,
      required: true,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'ONLINE'],
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED'],
      default: 'PAID',
    },
    status: {
      type: String,
      enum: ['NEW', 'RECEIVED', 'PREPARING', 'READY', 'COMPLETED', 'SERVED', 'CANCELLED', 'PAID'],
      default: 'NEW',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);