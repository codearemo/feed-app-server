// ******************************************************
// TWO-FACTOR CRYPTO — encrypt TOTP secrets at rest
// ******************************************************

const crypto = require('crypto');
const config = require('../config');

function getEncryptionKey() {
  const source = config.twoFactor.encryptionKey || config.JWT_SECRET;

  if (!source) {
    throw new Error(
      'TWO_FACTOR_ENCRYPTION_KEY or JWT_SECRET is required for 2FA.',
    );
  }

  return crypto.createHash('sha256').update(source).digest();
}

function encryptSecret(plainSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainSecret), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    tag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

function decryptSecret(payload) {
  const [ivHex, tagHex, encryptedHex] = String(payload).split(':');

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted 2FA secret payload');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  encryptSecret,
  decryptSecret,
};
