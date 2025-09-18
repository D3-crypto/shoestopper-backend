const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  size: { type: String },
  color: { type: String }
}, { _id: false });

const deliveryAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const statusEntrySchema = new mongoose.Schema({ status: String, at: Date, note: String }, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: deliveryAddressSchema, required: true },
  payment: {
    method: String,
    transactionId: String,
    status: String
  },
  status: { type: String, required: true },
  statusHistory: { type: [statusEntrySchema], default: [] }
}, { timestamps: true });

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
