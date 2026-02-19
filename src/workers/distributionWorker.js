const Distribution = require('../models/Distribution');
const Wallet = require('../models/Wallet');
const { sendToken, getProvider } = require('../services/bnbService');

async function processQueued(env) {
  const now = new Date();
  const queued = await Distribution.find({
    status: 'QUEUED',
    scheduledFor: { $lte: now },
  }).limit(10);

  for (const dist of queued) {
    try {
      const settings = env.getSettings ? await env.getSettings() : null;
      const treasuryPrivateKey = settings?.treasuryPrivateKey || env.TREASURY_PRIVATE_KEY;
      if (!treasuryPrivateKey) {
        await Distribution.updateOne(
          { _id: dist._id },
          { $set: { status: 'FAILED', failureReason: 'Missing treasury private key' } }
        );
        continue;
      }
      const wallet = await Wallet.findById(dist.walletId);
      if (!wallet) {
        await Distribution.updateOne(
          { _id: dist._id },
          { $set: { status: 'FAILED', failureReason: 'Wallet not found' } }
        );
        continue;
      }

      const txHash = await sendToken({
        rpcUrl: env.BSC_RPC_URL,
        treasuryPrivateKey,
        tokenContract: dist.tokenContract,
        toAddress: wallet.address,
        amount: dist.amount,
        tokenDecimals: env.TOKEN_DECIMALS,
      });

      await Distribution.updateOne(
        { _id: dist._id },
        { $set: { status: 'SUBMITTED', txHash } }
      );
    } catch (error) {
      await Distribution.updateOne(
        { _id: dist._id },
        { $set: { status: 'FAILED', failureReason: error.message } }
      );
      await Wallet.updateOne(
        { _id: dist.walletId },
        { $set: { status: 'USED', usedAt: new Date() } }
      );
    }
  }
}

async function processConfirmations(env) {
  const submitted = await Distribution.find({ status: 'SUBMITTED' }).limit(50);
  if (submitted.length === 0) return;

  const provider = getProvider(env.BSC_RPC_URL);

  for (const dist of submitted) {
    if (!dist.txHash) continue;
    try {
      const receipt = await provider.getTransactionReceipt(dist.txHash);
      if (!receipt) continue;

      if (receipt.confirmations < env.MIN_CONFIRMATIONS) continue;

      const status = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';
      const failureReason = receipt.status === 1 ? undefined : 'Transaction reverted';

      await Distribution.updateOne(
        { _id: dist._id },
        { $set: { status, failureReason } }
      );

      await Wallet.updateOne(
        { _id: dist.walletId },
        { $set: { status: 'USED', usedAt: new Date() } }
      );

      if (status === 'CONFIRMED' && env.STOP_ON_TOTAL_TARGET && env.TOTAL_DISTRIBUTION_TARGET > 0) {
        const totalConfirmed = await Distribution.countDocuments({ status: 'CONFIRMED' });
        if (totalConfirmed >= env.TOTAL_DISTRIBUTION_TARGET && env.onTotalTarget) {
          env.onTotalTarget({ totalConfirmed });
        }
      }
    } catch (error) {
      await Distribution.updateOne(
        { _id: dist._id },
        { $set: { status: 'FAILED', failureReason: error.message } }
      );

      await Wallet.updateOne(
        { _id: dist.walletId },
        { $set: { status: 'USED', usedAt: new Date() } }
      );
    }
  }
}

function startWorker(env) {
  const interval = setInterval(async () => {
    await processQueued(env);
    await processConfirmations(env);
  }, env.WORKER_INTERVAL_MS);

  interval.unref();
  return {
    stop: () => clearInterval(interval),
  };
}

module.exports = { startWorker };
