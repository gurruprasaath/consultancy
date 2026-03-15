/**
 * Analytics Model
 * Stores daily aggregated analytics for dashboard
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
  },
  revenue: {
    total: {
      type: Number,
      default: 0,
    },
    cash: {
      type: Number,
      default: 0,
    },
    card: {
      type: Number,
      default: 0,
    },
    upi: {
      type: Number,
      default: 0,
    },
    online: {
      type: Number,
      default: 0,
    },
  },
  orders: {
    total: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Number,
      default: 0,
    },
    cancelled: {
      type: Number,
      default: 0,
    },
    averageValue: {
      type: Number,
      default: 0,
    },
  },
  topItems: [{
    name: String,
    quantity: Number,
    revenue: Number,
  }],
  peakHours: [{
    hour: Number,
    orders: Number,
    revenue: Number,
  }],
  complaints: {
    total: {
      type: Number,
      default: 0,
    },
    resolved: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
  },
  inventory: {
    lowStockItems: {
      type: Number,
      default: 0,
    },
    totalWaste: {
      type: Number,
      default: 0,
    },
  },
  aiInsights: {
    salesTrend: String,
    recommendations: [String],
    predictions: String,
  },
}, {
  timestamps: true,
});

// Index for date queries
analyticsSchema.index({ date: -1 });

// Static method to get or create today's analytics
analyticsSchema.statics.getToday = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await this.findOne({ date: today });
  
  if (!analytics) {
    analytics = await this.create({ date: today });
  }
  
  return analytics;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
