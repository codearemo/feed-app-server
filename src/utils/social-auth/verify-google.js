const { OAuth2Client } = require('google-auth-library');
const config = require('../../config');

/**
 * Verify a Google ID token and return a normalized social profile.
 *
 * @param {string} idToken
 * @returns {Promise<import('./index').SocialProfile>}
 */
async function verifyGoogleIdToken(idToken) {
  const clientId = config.social.google.clientId;

  if (!clientId) {
    const error = new Error('Google sign-in is not configured');
    error.statusCode = 503;
    throw error;
  }

  const client = new OAuth2Client(clientId);

  let payload;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    payload = ticket.getPayload();
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
    provider: 'google',
    providerId: payload.sub,
    email: payload.email?.toLowerCase(),
    firstName: payload.given_name || 'User',
    lastName: payload.family_name || '',
    emailVerified: payload.email_verified === true,
  };
}

module.exports = verifyGoogleIdToken;
