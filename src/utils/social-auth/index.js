// ******************************************************
// SOCIAL AUTH — verify provider ID tokens
// ******************************************************

const verifyGoogleIdToken = require('./verify-google');
const verifyAppleIdToken = require('./verify-apple');

/**
 * @typedef {object} SocialProfile
 * @property {'google' | 'apple'} provider
 * @property {string} providerId
 * @property {string | undefined} email
 * @property {string} firstName
 * @property {string} lastName
 * @property {boolean} emailVerified
 */

const verifiers = {
  google: verifyGoogleIdToken,
  apple: verifyAppleIdToken,
};

/** @type {((provider: string, idToken: string) => Promise<SocialProfile>) | null} */
let testVerifier = null;

/**
 * Override token verification in tests.
 *
 * @param {((provider: string, idToken: string) => Promise<SocialProfile>) | null} fn
 */
function setSocialTokenVerifierForTests(fn) {
  testVerifier = fn;
}

/**
 * @param {'google' | 'apple'} provider
 * @param {string} idToken
 * @returns {Promise<SocialProfile>}
 */
async function verifySocialToken(provider, idToken) {
  if (testVerifier) {
    return testVerifier(provider, idToken);
  }

  const verify = verifiers[provider];

  if (!verify) {
    const error = new Error('Unsupported social provider');
    error.statusCode = 400;
    throw error;
  }

  return verify(idToken);
}

module.exports = {
  verifySocialToken,
  setSocialTokenVerifierForTests,
};
