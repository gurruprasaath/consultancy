/**
 * Marketing Model
 * Stores AI-generated marketing campaigns and performance metrics
 */

const mongoose = require('mongoose');

const marketingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['instagram', 'sms', 'whatsapp', 'email', 'offer', 'festival', 'combo'],
    required: true,
  },
  platform: {
    type: String,
    enum: ['instagram', 'facebook', 'whatsapp', 'sms', 'email', 'all'],
    default: 'all',
  },
  targetAudience: {
    type: String,
    trim: true,
  },
  isAIGenerated: {
    type: Boolean,
    default: true,
  },
  prompt: {
    type: String, // Original prompt used for AI generation
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft',
  },
  scheduledDate: {
    type: Date,
  },
  publishedDate: {
    type: Date,
  },
  // Performance metrics
  performance: {
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    conversions: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
  // Context used for generation
  context: {
    weather: String,
    season: String,
    salesTrend: String,
    topItems: [String],
  },
  tags: [{
    type: String,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for faster queries
marketingSchema.index({ type: 1, status: 1 });
marketingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Marketing', marketingSchema);
