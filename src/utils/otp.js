// ******************************************************
// OTP — generation and hashing
// ******************************************************

const crypto = require('crypto');

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashOtp(rawOtp) {
  return crypto
    .createHash('sha256')
    .update(String(rawOtp).trim())
    .digest('hex');
}

module.exports = {
  generateOtp,
  hashOtp,
};
