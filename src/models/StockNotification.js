const mongoose = require('mongoose');

const stockNotificationSchema = new mongoose.Schema({
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
  variantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Variant', 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  size: { 
    type: String, 
    required: true 
  },
  color: { 
    type: String, 
    required: true 
  },
  isNotified: { 
    type: Boolean, 
    default: false 
  },
  notifiedAt: Date,
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Compound index to prevent duplicate notifications
stockNotificationSchema.index({ 
  userId: 1, 
  variantId: 1 
}, { unique: true });

stockNotificationSchema.index({ isActive: 1, isNotified: 1 });
stockNotificationSchema.index({ productId: 1, isActive: 1 });

module.exports = mongoose.model('StockNotification', stockNotificationSchema);