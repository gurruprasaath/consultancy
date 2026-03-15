/**
 * CustomerProfile Model
 * Tracks visit count per customer (identified by phone number)
 * Used to trigger loyalty coupon rewards
 */

const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  visitCount: {
    type: Number,
    default: 1,
  },
  // Track which milestones have already been rewarded so we don't double-send
  rewardedMilestones: {
    type: [Number],
    default: [],
  },
  lastVisit: {
    type: Date,
    default: Date.now,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

customerProfileSchema.index({ phone: 1 });

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
