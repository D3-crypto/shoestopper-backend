const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true,
    trim: true,
    index: true
  },
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  type: { 
    type: String, 
    enum: ['percentage', 'fixed'], 
    required: true 
  },
  value: { 
    type: Number, 
    required: true,
    min: 0
  },
  minimumAmount: { 
    type: Number, 
    default: 0 
  },
  maximumDiscount: { 
    type: Number // Max discount for percentage coupons
  },
  usageLimit: { 
    type: Number,
    default: null // null means unlimited
  },
  usageCount: { 
    type: Number, 
    default: 0 
  },
  userLimit: { 
    type: Number,
    default: 1 // How many times one user can use this coupon
  },
  usedBy: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedCount: { type: Number, default: 1 },
    usedAt: { type: Date, default: Date.now }
  }],
  validFrom: { 
    type: Date, 
    default: Date.now 
  },
  validUntil: { 
    type: Date, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  applicableCategories: [String], // If empty, applies to all
  applicableProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true 
});

couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ applicableCategories: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil &&
         (this.usageLimit === null || this.usageCount < this.usageLimit);
};

// Method to check if user can use this coupon
couponSchema.methods.canUserUse = function(userId) {
  const userUsage = this.usedBy.find(usage => usage.userId.toString() === userId.toString());
  const userUsageCount = userUsage ? userUsage.usedCount : 0;
  return userUsageCount < this.userLimit;
};

module.exports = mongoose.model('Coupon', couponSchema);