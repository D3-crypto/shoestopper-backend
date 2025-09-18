const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String },
  password: { type: String, required: true }, // bcrypt hash
  addresses: { type: [addressSchema], default: [] }, // max 5 enforced at API
  defaultAddressId: { type: mongoose.Schema.Types.ObjectId, default: null },
  verified: { type: Boolean, default: false },
  autoDeleteAt: { type: Date, index: true }, // TTL to delete unverified users
  failedLoginCount: { type: Number, default: 0 },
  loginBlocked: { type: Boolean, default: false },
  refreshTokenVersion: { type: Number, default: 0 },
  isAdmin: { type: Boolean, default: false } // Admin flag
}, { timestamps: true });

// TTL index: remove user when autoDeleteAt reached (0 seconds)
userSchema.index({ autoDeleteAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('User', userSchema);
