require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const env = require('./src/config');
const { connectDb } = require('./src/db');
const { ensureAdmin } = require('./src/services/adminBootstrap');
const { ensureSettings, getSettings } = require('./src/services/settingsService');
const { walletPoolJob } = require('./src/jobs/walletPoolJob');
const { distributionSchedulerJob } = require('./src/jobs/distributionSchedulerJob');
const { startWorker } = require('./src/workers/distributionWorker');
const authRoutes = require('./src/routes/auth');
const walletRoutes = require('./src/routes/wallets');
const distributionRoutes = require('./src/routes/distributions');
const adminRoutes = require('./src/routes/admin');
const authMiddleware = require('./src/middleware/auth');

const app = express();

const parseTrustProxy = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === false) return value;
  const normalized = String(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) return numeric;
  return value;
};

const trustProxy = parseTrustProxy(env.TRUST_PROXY);
if (trustProxy !== undefined) {
  app.set('trust proxy', trustProxy);
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
});

app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/wallets', authMiddleware, walletRoutes);
app.use('/api/distributions', authMiddleware, distributionRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

async function start() {
  await connectDb(env.MONGO_URI);
  await ensureAdmin({
    userId: env.ADMIN_USER_ID,
    password: env.ADMIN_PASSWORD,
    role: env.ADMIN_ROLE,
  });
  await ensureSettings();

  const runtime = (() => {
    let walletCron;
    let distributionCron;
    let worker;
    let running = false;

    const ensureTasks = () => {
      if (!walletCron) {
        walletCron = cron.schedule(
          env.WALLET_POOL_CRON,
          async () => {
            await walletPoolJob({
              chain: 'bnb',
              targetCount: env.WALLET_POOL_TARGET,
            });
          },
          { scheduled: false }
        );
      }

      if (!distributionCron) {
        distributionCron = cron.schedule(
          env.DISTRIBUTION_CRON,
          async () => {
            const settings = await getSettings();
            await distributionSchedulerJob({
              chain: 'bnb',
              tokenContract: settings.tokenContract,
              amount: settings.distributionAmount,
              dailyTarget: settings.dailyDistributionTarget,
              totalTarget: settings.totalDistributionTarget,
            });
          },
          { scheduled: false }
        );
      }
    };

    const startRuntime = () => {
      ensureTasks();
      if (running) return;
      walletCron.start();
      distributionCron.start();
      worker = startWorker({
        ...env,
        getSettings,
        onTotalTarget: () => {
          if (env.STOP_ON_TOTAL_TARGET) {
            stopRuntime();
          }
        },
      });
      running = true;
      // Kick off scheduling once when runtime starts so missed cron doesn't block queues.
      (async () => {
        try {
          await walletPoolJob({
            chain: 'bnb',
            targetCount: env.WALLET_POOL_TARGET,
          });
          const settings = await getSettings();
          await distributionSchedulerJob({
            chain: 'bnb',
            tokenContract: settings.tokenContract,
            amount: settings.distributionAmount,
            dailyTarget: settings.dailyDistributionTarget,
            totalTarget: settings.totalDistributionTarget,
          });
        } catch (err) {
          console.error('Runtime bootstrap jobs failed:', err.message);
        }
      })();
    };

    const stopRuntime = () => {
      if (!running) return;
      walletCron.stop();
      distributionCron.stop();
      if (worker && worker.stop) {
        worker.stop();
      }
      worker = undefined;
      running = false;
    };

    const status = () => ({ running });

    return {
      start: startRuntime,
      stop: stopRuntime,
      status,
    };
  })();

  app.locals.runtime = runtime;
  runtime.start();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
