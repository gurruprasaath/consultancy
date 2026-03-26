const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['starters', 'mains', 'breads', 'rice', 'desserts', 'beverages', 'sides'],
    default: 'mains',
  },
  price: { type: Number, required: true, min: 0 },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  image: { type: String },
  spiceLevel: { type: String, enum: ['mild', 'medium', 'hot', 'extra-hot'], default: 'medium' },
  // Recipe ingredients linking menu items to inventory
  ingredients: [{
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
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
  }],
}, { timestamps: true });

menuItemSchema.index({ category: 1, isAvailable: 1 });
module.exports = mongoose.model('MenuItem', menuItemSchema);
