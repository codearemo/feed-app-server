// ******************************************************
// REFRESH TOKENS REPOSITORY — MongoDB implementation
// ******************************************************

const RefreshTokensModel = require('../models/refresh-tokens.model.mongo');
const {
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  hashRefreshToken,
} = require('../../../utils/refresh-token');

async function createForUser(userId) {
  const rawToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = getRefreshTokenExpiresAt();

  await RefreshTokensModel.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

async function findValidByRawToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);

  return RefreshTokensModel.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
}

/**
 * Atomically validate and delete a refresh token (single-use consumption).
 * Returns the deleted record, or null if the token is invalid or expired.
 */
async function consumeValidByRawToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);

  return RefreshTokensModel.findOneAndDelete({
    tokenHash,
    expiresAt: { $gt: new Date() },
  }).lean();
}

async function revokeByRawToken(rawToken) {
  const tokenHash = hashRefreshToken(rawToken);

  await RefreshTokensModel.deleteOne({ tokenHash });
}

async function revokeAllForUser(userId) {
  await RefreshTokensModel.deleteMany({ userId });
}

module.exports = {
  createForUser,
  findValidByRawToken,
  consumeValidByRawToken,
  revokeByRawToken,
  revokeAllForUser,
};
