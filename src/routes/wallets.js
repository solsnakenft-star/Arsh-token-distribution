const express = require('express');
const Wallet = require('../models/Wallet');

const router = express.Router();

router.get('/summary', async (req, res) => {
  const [unused, reserved, used, total] = await Promise.all([
    Wallet.countDocuments({ status: 'UNUSED' }),
    Wallet.countDocuments({ status: 'RESERVED' }),
    Wallet.countDocuments({ status: 'USED' }),
    Wallet.countDocuments({}),
  ]);

  res.json({ total, unused, reserved, used });
});

module.exports = router;
