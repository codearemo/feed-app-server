// ******************************************************
// ISSUE TOKEN PAIR — access JWT + refresh token for login
// ******************************************************
//
// Higher-level helper for a successful authentication (login, 2FA verify, etc.).
// Returns both credentials the client needs after sign-in:
//   - token        → short-lived access JWT (signed via access-jwt.js)
//   - refreshToken → opaque hex string stored hashed in MongoDB
//
// Do not use this for middleware or one-off JWT checks — use access-jwt.js.
//
// Extracted from services/auth.service.js so auth.service and
// services/two-factor.service can share the same logic without circular
// imports or duplication.
//
// Used by: services/auth.service (via completeAuthentication), services/two-factor.service

const { refreshTokens: refreshTokensRepository } = require('./repositories');
const { signAccessToken } = require('./access-jwt');

async function issueAuthTokens(user) {
  const refreshToken = await refreshTokensRepository.createForUser(user.id);

  try {
    return {
      token: signAccessToken(user),
      refreshToken,
    };
  } catch (error) {
    await refreshTokensRepository.revokeByRawToken(refreshToken);
    throw error;
  }
}

module.exports = {
  issueAuthTokens,
};
