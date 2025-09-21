const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true, 
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  comment: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  size: String, // Size purchased by the reviewer
  verified: { 
    type: Boolean, 
    default: false // Whether this is a verified purchase
  },
  helpful: { 
    type: Number, 
    default: 0 // Number of users who found this review helpful
  },
  helpfulBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }], // Users who marked this as helpful
  images: [String], // Optional review images
  fit: {
    type: String,
    enum: ['runs_small', 'true_to_size', 'runs_large'],
    default: 'true_to_size'
  }
}, { 
  timestamps: true 
});

// Compound index to ensure one review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ verified: 1 });

module.exports = mongoose.model('Review', reviewSchema);