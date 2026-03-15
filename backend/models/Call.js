/**
 * Call Model
 * Stores call recordings, transcripts, and AI analysis
 */

const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  audioFilePath: {
    type: String,
  },
  fileName: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  duration: {
    type: Number, // in seconds
  },
  transcript: {
    type: String,
    default: '',
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'unknown'],
    default: 'unknown',
  },
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    default: 0,
  },
  isComplaint: {
    type: Boolean,
    default: false,
  },
  complaintCategory: {
    type: String,
    enum: ['delivery', 'quality', 'service', 'pricing', 'other', 'none'],
    default: 'none',
  },
  suggestedAction: {
    type: String,
    default: '',
  },
  keywords: [{
    type: String,
  }],
  customerPhone: {
    type: String,
    trim: true,
  },
  customerName: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'analyzed', 'resolved', 'escalated'],
    default: 'pending',
  },
  analyzedAt: {
    type: Date,
  },
  resolvedAt: {
    type: Date,
  },
  notes: {
    type: String,
  },
  // Twilio Integration Fields
  callSid: {
    type: String,
    sparse: true,
    index: true,
  },
  recordingSid: {
    type: String,
  },
  recordingUrl: {
    type: String,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for faster queries
callSchema.index({ sentiment: 1, isComplaint: 1 });
callSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);
