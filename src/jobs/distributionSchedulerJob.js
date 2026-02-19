const Wallet = require('../models/Wallet');
const Distribution = require('../models/Distribution');
const { randomDateBetween } = require('../utils/time');

async function distributionSchedulerJob({
  chain,
  tokenContract,
  amount,
  dailyTarget = 60,
  totalTarget = 0,
}) {
  const maxAmount = Number(amount);
  if (!tokenContract || !Number.isFinite(maxAmount) || maxAmount <= 0) {
    return { scheduled: 0, reason: 'missing-settings' };
  }
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [alreadyScheduled, totalScheduled] = await Promise.all([
    Distribution.countDocuments({
      scheduledFor: { $gte: now, $lte: windowEnd },
    }),
    Distribution.countDocuments({}),
  ]);

  if (totalTarget > 0 && totalScheduled >= totalTarget) {
    return { scheduled: 0, reason: 'total-target-reached' };
  }

  const remainingDaily = dailyTarget - alreadyScheduled;
  if (remainingDaily <= 0) return { scheduled: 0 };

  const remainingTotal =
    totalTarget > 0 ? Math.max(totalTarget - totalScheduled, 0) : remainingDaily;

  const remaining = Math.min(remainingDaily, remainingTotal);
  if (remaining <= 0) return { scheduled: 0 };

  const wallets = await Wallet.find({ chain, status: 'UNUSED' })
    .limit(remaining)
    .lean();
  if (wallets.length === 0) return { scheduled: 0 };

  const walletIds = wallets.map((w) => w._id);
  await Wallet.updateMany(
    { _id: { $in: walletIds } },
    { $set: { status: 'RESERVED', reservedAt: new Date() } }
  );

  const records = wallets.map((w) => {
    const randomAmount = Math.floor(Math.random() * maxAmount) + 1;
    return {
      walletId: w._id,
      tokenContract,
      amount: String(randomAmount),
      status: 'QUEUED',
      scheduledFor: randomDateBetween(now, windowEnd),
    };
  });

  await Distribution.insertMany(records, { ordered: false });
  return { scheduled: records.length };
}

module.exports = { distributionSchedulerJob };
