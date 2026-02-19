const Wallet = require('../models/Wallet');
const { generateWallets, exportWalletsToCsv } = require('../services/walletService');

async function walletPoolJob({ chain, targetCount = 70 }) {
  const unusedCount = await Wallet.countDocuments({ chain, status: 'UNUSED' });
  if (unusedCount >= targetCount) return { created: 0 };

  const needed = targetCount - unusedCount;
  const created = await generateWallets(needed, chain);
  await exportWalletsToCsv(created);
  return { created: created.length };
}

module.exports = { walletPoolJob };
