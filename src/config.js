const required = (name, value) => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const env = {
  PORT: process.env.PORT || 3000,
  MONGO_URI: required('MONGO_URI', process.env.MONGO_URI),
  TRUST_PROXY:
    process.env.TRUST_PROXY ||
    (process.env.NODE_ENV !== 'production' ? '1' : ''),

  WALLET_POOL_CRON: process.env.WALLET_POOL_CRON || '0 0 * * *',
  DISTRIBUTION_CRON: process.env.DISTRIBUTION_CRON || '5 0 * * *',
  WORKER_INTERVAL_MS: Number(process.env.WORKER_INTERVAL_MS || 30000),
  WALLET_POOL_TARGET: Number(process.env.WALLET_POOL_TARGET || 70),
  DAILY_DISTRIBUTION_TARGET: Number(process.env.DAILY_DISTRIBUTION_TARGET || 60),
  TOTAL_DISTRIBUTION_TARGET: Number(process.env.TOTAL_DISTRIBUTION_TARGET || 0),
  STOP_ON_TOTAL_TARGET: (process.env.STOP_ON_TOTAL_TARGET || 'true') !== 'false',

  BSC_RPC_URL: required('BSC_RPC_URL', process.env.BSC_RPC_URL),
  CHAIN_ID: Number(process.env.CHAIN_ID || 56),
  TOKEN_CONTRACT: process.env.TOKEN_CONTRACT || '',
  TOKEN_DECIMALS: Number(process.env.TOKEN_DECIMALS || 18),
  DISTRIBUTION_AMOUNT: process.env.DISTRIBUTION_AMOUNT || '',
  TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY || '',
  MIN_CONFIRMATIONS: Number(process.env.MIN_CONFIRMATIONS || 3),

  ADMIN_USER_ID: required('ADMIN_USER_ID', process.env.ADMIN_USER_ID),
  ADMIN_PASSWORD: required('ADMIN_PASSWORD', process.env.ADMIN_PASSWORD),
  ADMIN_ROLE: process.env.ADMIN_ROLE || 'admin',

  JWT_SECRET: required('JWT_SECRET', process.env.JWT_SECRET),
};

module.exports = env;
