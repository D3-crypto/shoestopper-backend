const mongoose = require('mongoose');

const abandonedCartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: false // For guest users
  },
  email: {
    type: String,
    required: true
  },
  cartItems: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    },
    size: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: false
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalValue: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  remindersSent: [{
    sentAt: {
      type: Date,
      default: Date.now
    },
    reminderType: {
      type: String,
      enum: ['first', 'second', 'final'],
      required: true
    },
    emailSent: {
      type: Boolean,
      default: false
    }
  }],
  isRecovered: {
    type: Boolean,
    default: false
  },
  recoveredAt: {
    type: Date
  },
  recoveryToken: {
    type: String,
    unique: true,
    sparse: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
abandonedCartSchema.index({ user: 1, createdAt: -1 });
abandonedCartSchema.index({ email: 1, createdAt: -1 });
abandonedCartSchema.index({ recoveryToken: 1 });
abandonedCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
abandonedCartSchema.index({ isRecovered: 1, createdAt: -1 });

// Pre-save middleware to update lastModified
abandonedCartSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

// Generate recovery token
abandonedCartSchema.methods.generateRecoveryToken = function() {
  const crypto = require('crypto');
  this.recoveryToken = crypto.randomBytes(32).toString('hex');
  return this.recoveryToken;
};

// Check if cart is eligible for reminder
abandonedCartSchema.methods.isEligibleForReminder = function(reminderType) {
  const now = new Date();
  const timeSinceCreated = now - this.createdAt;
  const timeSinceModified = now - this.lastModified;
  
  // Don't send reminders if cart is recovered
  if (this.isRecovered) return false;
  
  // Check if this reminder type was already sent
  const alreadySent = this.remindersSent.some(reminder => 
    reminder.reminderType === reminderType && reminder.emailSent
  );
  if (alreadySent) return false;
  
  // Define time thresholds for different reminder types
  const thresholds = {
    first: 2 * 60 * 60 * 1000, // 2 hours
    second: 24 * 60 * 60 * 1000, // 1 day
    final: 3 * 24 * 60 * 60 * 1000 // 3 days
  };
  
  // Check if enough time has passed since creation or last modification
  const timeThreshold = thresholds[reminderType];
  return Math.max(timeSinceCreated, timeSinceModified) >= timeThreshold;
};

// Mark reminder as sent
abandonedCartSchema.methods.markReminderSent = function(reminderType) {
  this.remindersSent.push({
    reminderType,
    emailSent: true,
    sentAt: new Date()
  });
  return this.save();
};

// Mark cart as recovered
abandonedCartSchema.methods.markAsRecovered = function() {
  this.isRecovered = true;
  this.recoveredAt = new Date();
  return this.save();
};

// Static method to find eligible carts for reminders
abandonedCartSchema.statics.findEligibleForReminders = function(reminderType) {
  const now = new Date();
  let timeThreshold;
  
  switch (reminderType) {
    case 'first':
      timeThreshold = new Date(now - 2 * 60 * 60 * 1000); // 2 hours ago
      break;
    case 'second':
      timeThreshold = new Date(now - 24 * 60 * 60 * 1000); // 1 day ago
      break;
    case 'final':
      timeThreshold = new Date(now - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      break;
    default:
      return [];
  }
  
  return this.find({
    isRecovered: false,
    $or: [
      { createdAt: { $lte: timeThreshold } },
      { lastModified: { $lte: timeThreshold } }
    ],
    [`remindersSent.reminderType`]: { $ne: reminderType }
  }).populate('cartItems.product');
};

// Virtual for cart summary
abandonedCartSchema.virtual('cartSummary').get(function() {
  return {
    itemCount: this.cartItems.length,
    totalQuantity: this.cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: this.totalValue,
    timeAbandoned: new Date() - this.lastModified
  };
});

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);