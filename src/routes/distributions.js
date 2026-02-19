const express = require('express');
const Distribution = require('../models/Distribution');

const router = express.Router();

router.get('/recent', async (req, res) => {
  const recent = await Distribution.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json(recent);
});

module.exports = router;
