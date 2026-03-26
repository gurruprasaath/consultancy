/**
 * Inventory Model
 * Manages stock, tracks usage, and supports AI predictions
 */

const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    unique: true,
  },
  category: {
    type: String,
    enum: ['vegetables', 'meat', 'dairy', 'spices', 'beverages', 'other'],
    default: 'other',
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'l', 'ml', 'pieces', 'packets'],
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0,
  },
  supplier: {
    type: String,
    trim: true,
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  },
  // Daily usage tracking for AI predictions
  dailyUsage: [{
    date: {
      type: Date,
      default: Date.now,
    },
    used: {
      type: Number,
      default: 0,
    },
    wasted: {
      type: Number,
      default: 0,
    },
  }],
  // AI prediction data
  predictedDemand: {
    type: Number,
    default: 0,
  },
  lastPredictionDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Virtual for low stock status
inventorySchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.reorderLevel;
});

// Virtual for expiry status
inventorySchema.virtual('expiryStatus').get(function() {
  if (!this.expiryDate) return 'no_date';
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.ceil((this.expiryDate - now) / msPerDay);
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 7) return 'expiring_soon';
  return 'ok';
});

// Method to add daily usage
inventorySchema.methods.addUsage = function(used, wasted = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingEntry = this.dailyUsage.find(
    entry => entry.date.toDateString() === today.toDateString()
  );
  
  if (existingEntry) {
    existingEntry.used += used;
    existingEntry.wasted += wasted;
  } else {
    this.dailyUsage.push({ date: today, used, wasted });
  }
  
  // Keep only last 30 days
  if (this.dailyUsage.length > 30) {
    this.dailyUsage = this.dailyUsage.slice(-30);
  }
  
  this.quantity -= (used + wasted);
};

// Ensure virtuals are included in JSON
inventorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Inventory', inventorySchema);
