// ******************************************************
// AUTH SERVICE — sign-up, sign-in, tokens (no HTTP, no Mongoose)
// ******************************************************
//
// Business logic for registration, login, social auth, password reset,
// and token refresh. Lives under services/ alongside otp.service and
// two-factor.service — controller and routes stay one level up.

const usersRepository = require('../../users/repositories');
const { refreshTokens: refreshTokensRepository } = require('../repositories');
const { toPublicUser } = require('../../users/users.utils');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
  validateRefreshToken,
  validateSocialLogin,
  isEmail,
} = require('../auth.validation');
const { issueAuthTokens } = require('../issue-token-pair');
const { completeAuthentication } = require('./two-factor.service');
const { assertUserIsActive, assertEmailVerified } = require('../auth.utils');
const { issueOtp, verifyOtp } = require('./otp.service');
const { OTP_PURPOSES } = require('../../../constants/otp');
const { mapMongoDuplicateKeyError } = require('../../../utils/mongo-errors');
const { verifySocialToken } = require('../../../utils/social-auth');
const { generateSocialUsername } = require('../../../utils/social-username');
const { normalizeEmail } = require('../../../utils/normalize-email');
const bcrypt = require('bcrypt');

const FORGOT_PASSWORD_MESSAGE =
  'If that email is registered, a verification code has been sent.';
const RESEND_VERIFICATION_MESSAGE =
  'If that email is registered and not yet verified, a verification code has been sent.';

async function register(body) {
  const payload = validateRegister(body);

  const existingByEmail = await usersRepository.findByEmail(payload.email);
  if (existingByEmail) {
    const error = new Error('Email already in use');
    error.statusCode = 409;
    throw error;
  }

  const existingByUsername = await usersRepository.findByUsername(
    payload.username,
  );
  if (existingByUsername) {
    const error = new Error('Username already in use');
    error.statusCode = 409;
    throw error;
  }

  let user;

  try {
    user = await usersRepository.create({
      ...payload,
      password: await bcrypt.hash(payload.password, 10),
      emailVerified: false,
    });
  } catch (error) {
    throw mapMongoDuplicateKeyError(error);
  }

  try {
    await issueOtp(payload.email, OTP_PURPOSES.VERIFY_EMAIL);
  } catch (error) {
    console.error('[auth] Failed to send verification email:', error.message);
  }

  return toPublicUser(user);
}

async function verifyEmail(body) {
  const { email, otp } = validateVerifyEmail(body);
  const user = await usersRepository.findByEmail(email);

  if (!user) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  if (user.emailVerified) {
    const error = new Error('Email is already verified');
    error.statusCode = 400;
    throw error;
  }

  await verifyOtp(email, OTP_PURPOSES.VERIFY_EMAIL, otp);
  await usersRepository.markEmailVerified(user.id);

  return toPublicUser(await usersRepository.findById(user.id));
}

async function resendVerification(body) {
  const { email } = validateResendVerification(body);
  const user = await usersRepository.findByEmail(email);

  if (user && !user.emailVerified) {
    try {
      await issueOtp(email, OTP_PURPOSES.VERIFY_EMAIL);
    } catch (error) {
      console.error(
        '[auth] Failed to resend verification email:',
        error.message,
      );
    }
  }

  return { message: RESEND_VERIFICATION_MESSAGE };
}

async function login(body) {
  const { identifier, password } = validateLogin(body);
  const normalizedIdentifier = isEmail(identifier)
    ? normalizeEmail(identifier)
    : identifier.trim();

  const user = isEmail(identifier)
    ? await usersRepository.findByEmailWithPassword(normalizedIdentifier)
    : await usersRepository.findByUsernameWithPassword(normalizedIdentifier);

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 400;
    throw error;
  }

  if (!user.password) {
    const error = new Error('This account uses social login');
    error.statusCode = 400;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 400;
    throw error;
  }

  assertUserIsActive(user);
  assertEmailVerified(user);

  return completeAuthentication(user);
}

async function refresh(body) {
  const { refreshToken } = validateRefreshToken(body);
  const storedToken =
    await refreshTokensRepository.consumeValidByRawToken(refreshToken);

  if (!storedToken) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await usersRepository.findById(storedToken.userId);

  if (!user) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  assertUserIsActive(user);
  assertEmailVerified(user);

  return issueAuthTokens(user);
}

async function logout(body) {
  const { refreshToken } = validateRefreshToken(body);
  await refreshTokensRepository.revokeByRawToken(refreshToken);
}

async function createSocialUser(profile) {
  let username = generateSocialUsername();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await usersRepository.findByUsername(username);

    if (!taken) {
      break;
    }

    username = generateSocialUsername();
  }

  try {
    return await usersRepository.create({
      firstName: profile.firstName,
      lastName: profile.lastName || 'User',
      email: profile.email,
      username,
      emailVerified: true,
      authProviders: [
        { provider: profile.provider, providerId: profile.providerId },
      ],
    });
  } catch (error) {
    throw mapMongoDuplicateKeyError(error);
  }
}

async function socialLogin(body) {
  const { provider, idToken } = validateSocialLogin(body);
  const profile = await verifySocialToken(provider, idToken);

  if (!profile.email) {
    const error = new Error('Email is required from the social provider');
    error.statusCode = 400;
    throw error;
  }

  let user = await usersRepository.findByAuthProvider(
    profile.provider,
    profile.providerId,
  );

  if (!user) {
    if (!profile.emailVerified) {
      const error = new Error('Email not verified with the social provider');
      error.statusCode = 400;
      throw error;
    }

    const existingByEmail = await usersRepository.findByEmail(profile.email);

    if (existingByEmail) {
      // Email owner proved via the social provider. Link the account, verify
      // email, and clear any squatter password from an unverified registration.
      await usersRepository.addAuthProvider(
        existingByEmail.id,
        profile.provider,
        profile.providerId,
      );

      if (!existingByEmail.emailVerified) {
        await usersRepository.markEmailVerified(existingByEmail.id);
        await usersRepository.clearPassword(existingByEmail.id);
      }

      user = await usersRepository.findById(existingByEmail.id);
    } else {
      user = await createSocialUser(profile);
    }
  }

  assertUserIsActive(user);

  return completeAuthentication(user);
}

async function forgotPassword(body) {
  const { email } = validateForgotPassword(body);
  const user = await usersRepository.findByEmailWithPassword(email);

  if (user?.password) {
    try {
      await issueOtp(email, OTP_PURPOSES.RESET_PASSWORD);
    } catch (error) {
      console.error(
        '[auth] Failed to send password reset email:',
        error.message,
      );
    }
  }

  return { message: FORGOT_PASSWORD_MESSAGE };
}

async function resetPassword(body) {
  const { email, otp, password } = validateResetPassword(body);
  const user = await usersRepository.findByEmailWithPassword(email);

  if (!user?.password) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  await verifyOtp(email, OTP_PURPOSES.RESET_PASSWORD, otp);

  await usersRepository.updatePassword(
    user.id,
    await bcrypt.hash(password, 10),
  );

  await refreshTokensRepository.revokeAllForUser(user.id);
}

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  socialLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
