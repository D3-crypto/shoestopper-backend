const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  color: { type: String, required: true },
  price: { type: Number }, // Optional price override for this color variant
  images: { type: [String], default: [] }, // Images specific to this color variant
  sizes: [{
    size: { type: String, required: true },
    stock: { type: Number, default: 0 },
    price: { type: Number } // Optional size-specific price override
  }]
}, { timestamps: true });

variantSchema.index({ productId: 1, color: 1 }, { unique: true });
variantSchema.index({ productId: 1 });

module.exports = mongoose.model('Variant', variantSchema);
