const mongoose = require('mongoose');

const recentlyViewedSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  viewedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true 
});

// Compound index for user and product
recentlyViewedSchema.index({ userId: 1, productId: 1 }, { unique: true });
recentlyViewedSchema.index({ userId: 1, viewedAt: -1 });

// Auto-remove old entries (keep only last 50 per user)
recentlyViewedSchema.statics.cleanupOldViews = async function(userId) {
  const recentViews = await this.find({ userId }).sort({ viewedAt: -1 }).limit(50);
  if (recentViews.length === 50) {
    const oldestDate = recentViews[49].viewedAt;
    await this.deleteMany({ userId, viewedAt: { $lt: oldestDate } });
  }
};

module.exports = mongoose.model('RecentlyViewed', recentlyViewedSchema);