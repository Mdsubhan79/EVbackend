// backend/models/Bill.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  chassisNumber: String,
  motorNumber: String,
  battery: String,
  unitPrice: {
  type: String,
  required: true,
},
  gstAmount: Number,
  priceWithoutGst: Number,
  totalPrice: Number,
});

const billSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  customerDetails: {
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: String,
    aadharNumber: String,
  },
  products: [productSchema],
  subTotal: Number,
  gstTotal: Number,
  grandTotal: {
    type: Number,
    required: true,
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer'],
    required: true,
  },
  specialInstructions: {
    motorWarranty: String,
    batteryWarranty: String,
    otherComments: String,
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'sent'],
    default: 'draft',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Bill', billSchema);