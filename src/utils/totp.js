// ******************************************************
// TOTP — authenticator app codes (RFC 6238)
// ******************************************************

const {
  generateSecret,
  generateURI,
  verifySync,
  generateSync,
} = require('otplib');
const config = require('../config');

const TOTP_PERIOD_SECONDS = 30;

function generateTotpSecret() {
  return generateSecret();
}

function buildOtpauthUrl(email, secret) {
  return generateURI({
    issuer: config.twoFactor.issuer,
    label: email,
    secret,
  });
}

function verifyTotpCode(code, secret) {
  const result = verifySync({
    token: String(code).trim(),
    secret,
    epochTolerance: TOTP_PERIOD_SECONDS,
  });

  return result.valid;
}

function generateTotpCode(secret) {
  return generateSync({ secret });
}

module.exports = {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotpCode,
  generateTotpCode,
};
