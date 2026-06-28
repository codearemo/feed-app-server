// ******************************************************
// TWO-FACTOR CHALLENGE — pending login tokens
// ******************************************************

const crypto = require('crypto');
const config = require('../config');

function generateTwoFactorChallengeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashTwoFactorChallengeToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function getTwoFactorChallengeExpiresAt() {
  return new Date(
    Date.now() + config.twoFactor.challengeExpiresMinutes * 60 * 1000,
  );
}

function getTwoFactorSetupExpiresAt() {
  return new Date(
    Date.now() + config.twoFactor.setupExpiresMinutes * 60 * 1000,
  );
}

module.exports = {
  generateTwoFactorChallengeToken,
  hashTwoFactorChallengeToken,
  getTwoFactorChallengeExpiresAt,
  getTwoFactorSetupExpiresAt,
};
