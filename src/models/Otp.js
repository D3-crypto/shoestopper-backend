const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  otp: { type: String, required: true }, // plain text per requirement
  otpType: { type: String, required: true }, // VERIFICATION | UNBLOCK_LOGIN | RESET_PASSWORD
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
