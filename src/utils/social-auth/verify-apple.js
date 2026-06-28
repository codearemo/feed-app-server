const appleSignin = require('apple-signin-auth');
const config = require('../../config');

/**
 * Verify an Apple ID token and return a normalized social profile.
 *
 * @param {string} idToken
 * @returns {Promise<import('./index').SocialProfile>}
 */
async function verifyAppleIdToken(idToken) {
  const clientId = config.social.apple.clientId;

  if (!clientId) {
    const error = new Error('Apple sign-in is not configured');
    error.statusCode = 503;
    throw error;
  }

  let payload;

  try {
    payload = await appleSignin.verifyIdToken(idToken, {
      audience: clientId,
      ignoreExpiration: false,
    });
  } catch {
    const error = new Error('Invalid or expired social token');
    error.statusCode = 401;
    throw error;
  }

  if (!payload?.sub) {
    const error = new Error('Invalid or expired social token');
    error.statusCode = 401;
    throw error;
  }

  return {
    provider: 'apple',
    providerId: payload.sub,
    email: payload.email?.toLowerCase(),
    firstName: 'User',
    lastName: '',
    emailVerified:
      payload.email_verified === 'true' || payload.email_verified === true,
  };
}

module.exports = verifyAppleIdToken;
