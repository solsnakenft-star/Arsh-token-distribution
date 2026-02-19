const Settings = require('../models/Settings');
const env = require('../config');

function buildDefaults() {
  return {
    key: 'default',
    tokenContract: env.TOKEN_CONTRACT,
    distributionAmount: env.DISTRIBUTION_AMOUNT,
    treasuryPrivateKey: env.TREASURY_PRIVATE_KEY,
    dailyDistributionTarget: env.DAILY_DISTRIBUTION_TARGET,
    totalDistributionTarget: env.TOTAL_DISTRIBUTION_TARGET,
  };
}

async function ensureSettings() {
  const existing = await Settings.findOne({ key: 'default' });
  if (existing) return existing;
  const defaults = buildDefaults();
  return Settings.create(defaults);
}

async function getSettings() {
  const settings = await Settings.findOne({ key: 'default' }).lean();
  if (settings) return settings;
  return buildDefaults();
}

async function updateSettings(payload) {
  const update = {};
  if (payload.tokenContract) update.tokenContract = payload.tokenContract;
  if (payload.distributionAmount) update.distributionAmount = payload.distributionAmount;
  if (payload.treasuryPrivateKey) update.treasuryPrivateKey = payload.treasuryPrivateKey;
  if (Number.isFinite(payload.dailyDistributionTarget)) {
    update.dailyDistributionTarget = payload.dailyDistributionTarget;
  }
  if (Number.isFinite(payload.totalDistributionTarget)) {
    update.totalDistributionTarget = payload.totalDistributionTarget;
  }

  const doc = await Settings.findOneAndUpdate(
    { key: 'default' },
    { $set: update },
    { new: true, upsert: true }
  ).lean();

  return doc;
}

module.exports = { ensureSettings, getSettings, updateSettings };
