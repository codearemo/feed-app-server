const authService = require('./services/auth.service');
const twoFactorService = require('./services/two-factor.service');
const { sendSuccess } = require('../../utils/api-response');

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, {
      statusCode: 201,
      message:
        'Registration successful. A verification code has been sent to your email.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const user = await authService.verifyEmail(req.body);
    sendSuccess(res, {
      message: 'Email verified successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

async function resendVerification(req, res, next) {
  try {
    const result = await authService.resendVerification(req.body);
    sendSuccess(res, {
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, {
      message: result.requiresTwoFactor
        ? 'Two-factor authentication required'
        : 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function socialLogin(req, res, next) {
  try {
    const result = await authService.socialLogin(req.body);
    sendSuccess(res, {
      message: result.requiresTwoFactor
        ? 'Two-factor authentication required'
        : 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const tokens = await authService.refresh(req.body);
    sendSuccess(res, {
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.body);
    sendSuccess(res, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    sendSuccess(res, {
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body);
    sendSuccess(res, {
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function setupTwoFactor(req, res, next) {
  try {
    const result = await twoFactorService.setupTwoFactor(req.user.id);
    sendSuccess(res, {
      message: 'Scan the secret or otpauth URL with your authenticator app',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function confirmTwoFactor(req, res, next) {
  try {
    const result = await twoFactorService.confirmTwoFactor(
      req.user.id,
      req.body,
    );
    sendSuccess(res, {
      message: 'Two-factor authentication enabled',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyTwoFactorLogin(req, res, next) {
  try {
    const result = await twoFactorService.verifyTwoFactorLogin(req.body);
    sendSuccess(res, {
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function disableTwoFactor(req, res, next) {
  try {
    const result = await twoFactorService.disableTwoFactor(
      req.user.id,
      req.body,
    );
    sendSuccess(res, {
      message: 'Two-factor authentication disabled',
      data: result,
    });
  } catch (error) {
    next(error);
  }
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
  setupTwoFactor,
  confirmTwoFactor,
  verifyTwoFactorLogin,
  disableTwoFactor,
};
