const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: String,
  price: { type: Number, required: true },
  categories: { type: [String], default: [] },
  images: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  brand: { type: String, index: true },
  material: { type: String },
  gender: { type: String, enum: ['men', 'women', 'unisex', 'kids'], index: true },
  type: { type: String }, // sneakers, boots, sandals, etc.
  tags: { type: [String], default: [] },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  sizeGuide: {
    chart: String, // URL to size chart image
    fitAdvice: String, // General fit advice
    measurements: [{
      size: String,
      length: Number, // in cm
      width: Number   // in cm
    }]
  }
}, { timestamps: true });

productSchema.index({ categories: 1 });
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ brand: 1 });
productSchema.index({ gender: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ viewCount: -1 });
productSchema.index({ isActive: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);
