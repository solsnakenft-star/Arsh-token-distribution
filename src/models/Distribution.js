const mongoose = require('mongoose');

const distributionSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    tokenContract: { type: String, required: true },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ['QUEUED', 'SUBMITTED', 'CONFIRMED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    scheduledFor: { type: Date, required: true, index: true },
    txHash: { type: String },
    failureReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Distribution', distributionSchema);
