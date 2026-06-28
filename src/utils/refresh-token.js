// ******************************************************
// REFRESH TOKEN — generation and hashing
// ******************************************************

const crypto = require('crypto');
const config = require('../config');

const DURATION_MULTIPLIERS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function parseDurationToMs(value) {
  const match = /^(\d+)([smhd])$/i.exec(String(value).trim());

  if (!match) {
    throw new Error(`Invalid JWT_REFRESH_EXPIRES_IN: "${value}"`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  return amount * DURATION_MULTIPLIERS[unit];
}

function getRefreshTokenExpiresAt() {
  return new Date(
    Date.now() + parseDurationToMs(config.JWT_REFRESH_EXPIRES_IN),
  );
}

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiresAt,
};
