const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    tokenContract: { type: String, default: '' },
    distributionAmount: { type: String, default: '' },
    treasuryPrivateKey: { type: String, default: '' },
    dailyDistributionTarget: { type: Number, default: 60 },
    totalDistributionTarget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
