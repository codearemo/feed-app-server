// ******************************************************
// RATE LIMIT — global baseline + stricter auth endpoint limits
// ******************************************************

const { rateLimit } = require('express-rate-limit');
const config = require('../config');

function shouldSkipRateLimit() {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    typeof globalThis.vi !== 'undefined'
  );
}

/**
 * Build a rate limiter with the project's uniform error envelope on 429.
 *
 * Disabled during Vitest so integration tests are not throttled.
 * Override `skip` when unit-testing the limiter itself.
 */
function createRateLimiter({ limit, windowMs, message, skip }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: skip ?? shouldSkipRateLimit,
    handler: (_req, res) => {
      res.status(429).json({
        data: null,
        message,
      });
    },
  });
}

const {
  global: globalConfig,
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
  socialLogin,
  twoFactorSetup,
  twoFactorConfirm,
  twoFactorVerify,
  twoFactorDisable,
  upload,
  post,
  chat,
} = config.rateLimit;

const globalLimiter = createRateLimiter({
  limit: globalConfig.max,
  windowMs: globalConfig.windowMs,
  message: 'Too many requests, please try again later',
});

const registerLimiter = createRateLimiter({
  limit: register.max,
  windowMs: register.windowMs,
  message: 'Too many registration attempts, please try again later',
});

const loginLimiter = createRateLimiter({
  limit: login.max,
  windowMs: login.windowMs,
  message: 'Too many login attempts, please try again later',
});

const forgotPasswordLimiter = createRateLimiter({
  limit: forgotPassword.max,
  windowMs: forgotPassword.windowMs,
  message: 'Too many password reset requests, please try again later',
});

const resetPasswordLimiter = createRateLimiter({
  limit: resetPassword.max,
  windowMs: resetPassword.windowMs,
  message: 'Too many reset attempts, please try again later',
});

const verifyEmailLimiter = createRateLimiter({
  limit: verifyEmail.max,
  windowMs: verifyEmail.windowMs,
  message: 'Too many verification attempts, please try again later',
});

const resendVerificationLimiter = createRateLimiter({
  limit: resendVerification.max,
  windowMs: resendVerification.windowMs,
  message: 'Too many verification resend attempts, please try again later',
});

const refreshLimiter = createRateLimiter({
  limit: refresh.max,
  windowMs: refresh.windowMs,
  message: 'Too many refresh attempts, please try again later',
});

const logoutLimiter = createRateLimiter({
  limit: logout.max,
  windowMs: logout.windowMs,
  message: 'Too many logout attempts, please try again later',
});

const socialLoginLimiter = createRateLimiter({
  limit: socialLogin.max,
  windowMs: socialLogin.windowMs,
  message: 'Too many social login attempts, please try again later',
});

const twoFactorSetupLimiter = createRateLimiter({
  limit: twoFactorSetup.max,
  windowMs: twoFactorSetup.windowMs,
  message: 'Too many two-factor setup attempts, please try again later',
});

const twoFactorConfirmLimiter = createRateLimiter({
  limit: twoFactorConfirm.max,
  windowMs: twoFactorConfirm.windowMs,
  message: 'Too many two-factor confirmation attempts, please try again later',
});

const twoFactorVerifyLimiter = createRateLimiter({
  limit: twoFactorVerify.max,
  windowMs: twoFactorVerify.windowMs,
  message: 'Too many two-factor verification attempts, please try again later',
});

const twoFactorDisableLimiter = createRateLimiter({
  limit: twoFactorDisable.max,
  windowMs: twoFactorDisable.windowMs,
  message: 'Too many two-factor disable attempts, please try again later',
});

const uploadLimiter = createRateLimiter({
  limit: upload.max,
  windowMs: upload.windowMs,
  message: 'Too many upload requests, please try again later',
});

const postLimiter = createRateLimiter({
  limit: post.max,
  windowMs: post.windowMs,
  message: 'Too many post requests, please try again later',
});

const chatLimiter = createRateLimiter({
  limit: chat.max,
  windowMs: chat.windowMs,
  message: 'Too many chat requests, please try again later',
});

module.exports = {
  createRateLimiter,
  shouldSkipRateLimit,
  globalLimiter,
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  refreshLimiter,
  logoutLimiter,
  socialLoginLimiter,
  twoFactorSetupLimiter,
  twoFactorConfirmLimiter,
  twoFactorVerifyLimiter,
  twoFactorDisableLimiter,
  uploadLimiter,
  postLimiter,
  chatLimiter,
};
