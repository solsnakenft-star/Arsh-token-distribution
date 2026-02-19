const { Wallet: EthersWallet } = require('ethers');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const Wallet = require('../models/Wallet');
async function generateWallets(count, chain, walletKeySecret) {
  const wallets = [];
  for (let i = 0; i < count; i += 1) {
    const wallet = EthersWallet.createRandom();
    wallets.push({
      chain,
      address: wallet.address,
      privateKey: wallet.privateKey,
      status: 'UNUSED',
    });
  }
  const inserted = await Wallet.insertMany(wallets, { ordered: false });
  return inserted;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildWalletsCsv(wallets) {
  const header = ['address', 'privateKey', 'status'];
  const rows = wallets.map((w) => [
    escapeCsv(w.address),
    escapeCsv(w.privateKey),
    escapeCsv(w.status),
  ]);
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
}

async function exportWalletsToCsv(wallets) {
  if (!wallets || wallets.length === 0) return;
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(exportDir, `wallets-${stamp}.csv`);
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'address', title: 'address' },
      { id: 'privateKey', title: 'privateKey' },
      { id: 'status', title: 'status' },
    ],
  });

  await csvWriter.writeRecords(wallets.map((w) => ({
    address: w.address,
    privateKey: w.privateKey,
    status: w.status,
  })));
}

module.exports = { generateWallets, exportWalletsToCsv, buildWalletsCsv };
