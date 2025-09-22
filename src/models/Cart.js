const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
  qty: { type: Number, required: true }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  // Either userId (for authenticated users) or sessionId (for anonymous users)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
  sessionId: { type: String, sparse: true },
  items: { type: [cartItemSchema], default: [] },
  // Track when cart was last updated for abandoned cart emails
  lastActivity: { type: Date, default: Date.now },
  // User email for abandoned cart (only if user is logged in)
  userEmail: { type: String },
  // Track if abandoned cart email has been sent
  abandonedEmailSent: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure either userId or sessionId is present, but not both
cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

// Update lastActivity on save
cartSchema.pre('save', function() {
  this.lastActivity = new Date();
});

module.exports = mongoose.model('Cart', cartSchema);
