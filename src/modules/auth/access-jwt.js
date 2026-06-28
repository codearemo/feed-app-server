// ******************************************************
// ACCESS JWT — sign and verify short-lived access tokens
// ******************************************************
//
// Low-level JWT helpers only. No database, no refresh tokens, no HTTP.
//
// Use this file when you need to:
//   - mint a single access JWT (signAccessToken)
//   - validate a Bearer token from a request (verifyToken)
//
// For a full login response ({ token, refreshToken }), use issue-token-pair.js
// instead — it calls signAccessToken here and also persists a refresh token.
//
// Used by: authenticate.middleware, issue-token-pair.js, tests

const jwt = require('jsonwebtoken');
const config = require('../../config');
const { getEntityId } = require('../../utils/entity-id');

/**
 * Build a signed access JWT for an authenticated user.
 *
 * Payload keeps only `sub` (subject) = the user's id.
 * Do not put email, password, or other PII in the token.
 *
 * @param {object} user - User record from the repository (must have `id`)
 * @returns {string} Signed JWT string for the Authorization header
 */
function signAccessToken(user) {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const userId = getEntityId(user);

  if (!userId) {
    throw new Error('User id is required to sign an access token');
  }

  return jwt.sign({ sub: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT and return its decoded payload.
 *
 * @param {string} token - Raw JWT from `Authorization: Bearer <token>`
 * @returns {{ sub: string }} Decoded payload (`sub` is the user id)
 * @throws {Error} Error with statusCode 401 when token is missing, invalid, or expired
 */
function verifyToken(token) {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch {
    const error = new Error('Invalid or expired token');
    error.statusCode = 401;
    throw error;
  }
}

module.exports = {
  signAccessToken,
  signToken: signAccessToken,
  verifyToken,
};
