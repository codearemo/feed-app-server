// ******************************************************
// TWO-FACTOR SERVICE — TOTP setup, login verification, disable
// ******************************************************
//
// Business logic for authenticator-app 2FA. Called from auth.controller
// (setup/confirm/disable routes) and auth.service (login/social via
// completeAuthentication).

const bcrypt = require('bcrypt');
const usersRepository = require('../../users/repositories');
const {
  refreshTokens: refreshTokensRepository,
  twoFactorChallenges: twoFactorChallengesRepository,
  twoFactorSetups: twoFactorSetupsRepository,
} = require('../repositories');
const { toPublicUser } = require('../../users/users.utils');
const { issueAuthTokens } = require('../issue-token-pair');
const { assertUserIsActive, assertEmailVerified } = require('../auth.utils');
const {
  validateConfirmTwoFactor,
  validateDisableTwoFactor,
  validateVerifyTwoFactorLogin,
} = require('../auth.validation');
const {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotpCode,
} = require('../../../utils/totp');
const {
  encryptSecret,
  decryptSecret,
} = require('../../../utils/two-factor-crypto');
const {
  TWO_FACTOR_CHALLENGE_PURPOSES,
} = require('../../../constants/two-factor');

async function completeAuthentication(user) {
  assertUserIsActive(user);
  assertEmailVerified(user);

  const latestUser = await usersRepository.findById(user.id);

  if (latestUser?.twoFactorEnabled) {
    const twoFactorToken = await twoFactorChallengesRepository.createForUser(
      user.id,
      TWO_FACTOR_CHALLENGE_PURPOSES.LOGIN,
    );

    return {
      requiresTwoFactor: true,
      twoFactorToken,
    };
  }

  const tokens = await issueAuthTokens(user);

  return {
    requiresTwoFactor: false,
    user: toPublicUser(user),
    ...tokens,
  };
}

async function setupTwoFactor(userId) {
  const user = await usersRepository.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.twoFactorEnabled) {
    const error = new Error('Two-factor authentication is already enabled');
    error.statusCode = 400;
    throw error;
  }

  const secret = generateTotpSecret();
  const encryptedSecret = encryptSecret(secret);

  await twoFactorSetupsRepository.upsert(userId, encryptedSecret);

  return {
    secret,
    otpauthUrl: buildOtpauthUrl(user.email, secret),
  };
}

async function confirmTwoFactor(userId, body) {
  const { code } = validateConfirmTwoFactor(body);
  const setup = await twoFactorSetupsRepository.findValidByUserId(userId);

  if (!setup) {
    const error = new Error('Invalid or expired two-factor setup');
    error.statusCode = 400;
    throw error;
  }

  const secret = decryptSecret(setup.encryptedSecret);

  if (!verifyTotpCode(code, secret)) {
    const error = new Error('Invalid authenticator code');
    error.statusCode = 400;
    throw error;
  }

  await usersRepository.enableTwoFactor(userId, setup.encryptedSecret);
  await twoFactorSetupsRepository.deleteByUserId(userId);

  return { twoFactorEnabled: true };
}

async function verifyTwoFactorLogin(body) {
  const { twoFactorToken, code } = validateVerifyTwoFactorLogin(body);
  const challenge = await twoFactorChallengesRepository.consumeValidByRawToken(
    twoFactorToken,
    TWO_FACTOR_CHALLENGE_PURPOSES.LOGIN,
  );

  if (!challenge) {
    const error = new Error('Invalid or expired two-factor token');
    error.statusCode = 401;
    throw error;
  }

  const user = await usersRepository.findByIdWithTwoFactorSecret(
    challenge.userId,
  );

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    const error = new Error('Invalid or expired two-factor token');
    error.statusCode = 401;
    throw error;
  }

  const secret = decryptSecret(user.twoFactorSecret);

  if (!verifyTotpCode(code, secret)) {
    const error = new Error('Invalid authenticator code');
    error.statusCode = 400;
    throw error;
  }

  assertUserIsActive(user);
  assertEmailVerified(user);

  const tokens = await issueAuthTokens(user);

  return {
    requiresTwoFactor: false,
    user: toPublicUser(user),
    ...tokens,
  };
}

async function disableTwoFactor(userId, body) {
  const { code, password } = validateDisableTwoFactor(body);
  const user =
    await usersRepository.findByIdWithPasswordAndTwoFactorSecret(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    const error = new Error('Two-factor authentication is not enabled');
    error.statusCode = 400;
    throw error;
  }

  if (user.password) {
    if (!password) {
      const error = new Error('Password is required');
      error.statusCode = 400;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      const error = new Error('Invalid credentials');
      error.statusCode = 400;
      throw error;
    }
  }

  const secret = decryptSecret(user.twoFactorSecret);

  if (!verifyTotpCode(code, secret)) {
    const error = new Error('Invalid authenticator code');
    error.statusCode = 400;
    throw error;
  }

  await usersRepository.disableTwoFactor(userId);
  await refreshTokensRepository.revokeAllForUser(userId);

  return { twoFactorEnabled: false };
}

module.exports = {
  completeAuthentication,
  setupTwoFactor,
  confirmTwoFactor,
  verifyTwoFactorLogin,
  disableTwoFactor,
};
