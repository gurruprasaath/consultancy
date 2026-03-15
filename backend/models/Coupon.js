/**
 * Coupon Model
 * One-time-use loyalty discount coupons tied to a customer phone number
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  // Tied to a specific customer by phone
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  customerName: {
    type: String,
    trim: true,
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  // One-time use
  used: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
  },
  usedInOrder: {
    type: String, // orderNumber
  },
  // Expiry — coupons are valid for 30 days by default
  expiresAt: {
    type: Date,
    required: true,
  },
  // Which visit milestone triggered this coupon
  visitMilestone: {
    type: Number,
  },
}, {
  timestamps: true,
});

// Index for fast lookup by phone
couponSchema.index({ phone: 1 });
couponSchema.index({ code: 1 });

// Virtual: is the coupon still valid?
couponSchema.virtual('isValid').get(function () {
  return !this.used && new Date() < this.expiresAt;
});

module.exports = mongoose.model('Coupon', couponSchema);
