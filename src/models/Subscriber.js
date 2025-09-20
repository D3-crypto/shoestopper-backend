const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unsubscribeToken: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate unsubscribe token before saving
subscriberSchema.pre('save', function(next) {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = require('crypto').randomBytes(32).toString('hex');
  }
  next();
});

// Instance method to unsubscribe
subscriberSchema.methods.unsubscribe = function() {
  this.isActive = false;
  return this.save();
};

// Static method to find active subscribers
subscriberSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

module.exports = mongoose.model('Subscriber', subscriberSchema);