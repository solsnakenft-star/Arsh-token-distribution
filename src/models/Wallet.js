const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    chain: { type: String, required: true, index: true },
    address: { type: String, required: true, unique: true, index: true },
    privateKey: { type: String, required: true },
    status: {
      type: String,
      enum: ['UNUSED', 'RESERVED', 'USED'],
      default: 'UNUSED',
      index: true,
    },
    reservedAt: { type: Date },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.model('Wallet', walletSchema);
