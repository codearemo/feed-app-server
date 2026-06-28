const express = require('express');
const authController = require('./auth.controller');
const authenticate = require('../../middleware/authenticate.middleware');
const {
  registerLimiter,
  loginLimiter,
  socialLoginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  refreshLimiter,
  logoutLimiter,
  twoFactorSetupLimiter,
  twoFactorConfirmLimiter,
  twoFactorVerifyLimiter,
  twoFactorDisableLimiter,
} = require('../../middleware/rate-limit.middleware');

const router = express.Router();

router.post('/register', registerLimiter, authController.register);

router.post('/verify-email', verifyEmailLimiter, authController.verifyEmail);

router.post(
  '/resend-verification',
  resendVerificationLimiter,
  authController.resendVerification,
);

router.post('/login', loginLimiter, authController.login);

router.post('/social', socialLoginLimiter, authController.socialLogin);

router.post('/refresh', refreshLimiter, authController.refresh);

router.post('/logout', logoutLimiter, authController.logout);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  authController.resetPassword,
);

router.post(
  '/2fa/setup',
  twoFactorSetupLimiter,
  authenticate,
  authController.setupTwoFactor,
);

router.post(
  '/2fa/confirm',
  twoFactorConfirmLimiter,
  authenticate,
  authController.confirmTwoFactor,
);

router.post(
  '/2fa/verify',
  twoFactorVerifyLimiter,
  authController.verifyTwoFactorLogin,
);

router.post(
  '/2fa/disable',
  twoFactorDisableLimiter,
  authenticate,
  authController.disableTwoFactor,
);

module.exports = router;
