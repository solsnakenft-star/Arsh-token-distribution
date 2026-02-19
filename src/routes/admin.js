const express = require('express');
const env = require('../config');
const Wallet = require('../models/Wallet');
const Distribution = require('../models/Distribution');
const { generateWallets, buildWalletsCsv } = require('../services/walletService');
const { getSettings, updateSettings } = require('../services/settingsService');

const router = express.Router();

function ensureAdmin(req, res, next) {
  if (!req.user || req.user.role !== env.ADMIN_ROLE) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

function maskPrivateKey(key) {
  if (!key) return '';
  const trimmed = String(key);
  if (trimmed.length <= 10) return '********';
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

router.use(ensureAdmin);

router.get('/config', (req, res) => {
  getSettings().then((settings) => {
    res.json({
      tokenContract: settings.tokenContract,
      distributionAmount: settings.distributionAmount,
      tokenDecimals: env.TOKEN_DECIMALS,
      chainId: env.CHAIN_ID,
      walletTarget: env.WALLET_POOL_TARGET,
      dailyTarget: settings.dailyDistributionTarget,
      totalTarget: settings.totalDistributionTarget,
      senderPrivateKeyMasked: maskPrivateKey(settings.treasuryPrivateKey),
    });
  }).catch((error) => {
    res.status(500).json({ error: error.message });
  });
});

router.post('/config', async (req, res) => {
  const payload = req.body || {};
  const next = {
    tokenContract: payload.tokenContract,
    distributionAmount: payload.distributionAmount,
    treasuryPrivateKey: payload.treasuryPrivateKey,
    dailyDistributionTarget: Number(payload.dailyDistributionTarget),
    totalDistributionTarget: Number(payload.totalDistributionTarget),
  };

  const maxAmount = Number(next.distributionAmount);
  if (!next.tokenContract || !Number.isFinite(maxAmount) || maxAmount <= 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!payload.treasuryPrivateKey) {
    delete next.treasuryPrivateKey;
  }

  if (!Number.isFinite(next.dailyDistributionTarget) || next.dailyDistributionTarget < 0) {
    return res.status(400).json({ error: 'Invalid daily target' });
  }

  if (!Number.isFinite(next.totalDistributionTarget) || next.totalDistributionTarget < 0) {
    return res.status(400).json({ error: 'Invalid total target' });
  }

  const updated = await updateSettings(next);
  return res.json({
    tokenContract: updated.tokenContract,
    distributionAmount: updated.distributionAmount,
    dailyTarget: updated.dailyDistributionTarget,
    totalTarget: updated.totalDistributionTarget,
    senderPrivateKeyMasked: maskPrivateKey(updated.treasuryPrivateKey),
  });
});

router.get('/status', async (req, res) => {
  const runtime = req.app.locals.runtime;
  if (!runtime) {
    return res.status(500).json({ error: 'Runtime unavailable' });
  }
  const [nextQueued, totalConfirmed] = await Promise.all([
    Distribution.findOne({ status: 'QUEUED' }).sort({ scheduledFor: 1 }).lean(),
    Distribution.countDocuments({ status: 'CONFIRMED' }),
  ]);
  return res.json({
    ...runtime.status(),
    nextSendAt: nextQueued ? nextQueued.scheduledFor : null,
    totalConfirmed,
  });
});

router.post('/start', (req, res) => {
  const runtime = req.app.locals.runtime;
  if (!runtime) {
    return res.status(500).json({ error: 'Runtime unavailable' });
  }
  runtime.start();
  return res.json(runtime.status());
});

router.post('/stop', (req, res) => {
  const runtime = req.app.locals.runtime;
  if (!runtime) {
    return res.status(500).json({ error: 'Runtime unavailable' });
  }
  runtime.stop();
  return res.json(runtime.status());
});

router.post('/reset', async (req, res) => {
  const runtime = req.app.locals.runtime;
  if (!runtime) {
    return res.status(500).json({ error: 'Runtime unavailable' });
  }

  const wasRunning = runtime.status().running;
  if (wasRunning) {
    runtime.stop();
  }

  await Distribution.deleteMany({});
  await Wallet.deleteMany({});

  const created = await generateWallets(env.WALLET_POOL_TARGET, 'bnb');

  if (wasRunning) {
    runtime.start();
  }

  return res.json({ reset: true, created: created.length });
});

router.get('/wallets/export', async (req, res) => {
  const wallets = await Wallet.find({}).sort({ createdAt: 1 }).lean();
  const csv = buildWalletsCsv(wallets);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `wallets-${stamp}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  return res.send(csv);
});

module.exports = router;
