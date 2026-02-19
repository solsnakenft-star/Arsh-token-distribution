const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function ensureAdmin({ userId, password, role }) {
  const exists = await User.findOne({ userId });
  if (exists) return false;

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ userId, passwordHash, role });
  return true;
}

module.exports = { ensureAdmin };
