const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: String,
  price: { type: Number, required: true },
  categories: { type: [String], default: [] },
  images: { type: [String], default: [] },
  featured: { type: Boolean, default: false }
}, { timestamps: true });

productSchema.index({ categories: 1 });
productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
