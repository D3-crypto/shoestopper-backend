const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  color: { type: String, required: true },
  size: { type: String, required: true },
  price: { type: Number, required: true }, // Individual pricing per variant
  stock: { type: Number, default: 0 },
  images: { type: [String], default: [] }
}, { timestamps: true });

variantSchema.index({ productId: 1, color: 1, size: 1 }, { unique: true });

module.exports = mongoose.model('Variant', variantSchema);
