const { ethers } = require('ethers');

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
];

function getProvider(rpcUrl) {
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getTreasurySigner(rpcUrl, privateKey) {
  const provider = getProvider(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

async function sendToken({
  rpcUrl,
  treasuryPrivateKey,
  tokenContract,
  toAddress,
  amount,
  tokenDecimals,
}) {
  const signer = getTreasurySigner(rpcUrl, treasuryPrivateKey);
  const token = new ethers.Contract(tokenContract, ERC20_ABI, signer);
  const value = ethers.parseUnits(String(amount), tokenDecimals);
  const tx = await token.transfer(toAddress, value);
  return tx.hash;
}

module.exports = { sendToken, getProvider };
