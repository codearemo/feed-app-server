const { z } = require('zod');
const { SUPPORTED_SOCIAL_PROVIDERS } = require('../../constants/social-auth');
const { normalizeEmail } = require('../../utils/normalize-email');

const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .transform(normalizeEmail)
  .refine(
    (value) => z.email().safeParse(value).success,
    'Invalid email address',
  );

const passwordField = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  );

const registerSchema = z.object({
  firstName: z
    .string({ error: 'First name is required' })
    .trim()
    .min(1, 'First name is required'),
  lastName: z
    .string({ error: 'Last name is required' })
    .trim()
    .min(1, 'Last name is required'),
  username: z
    .string({ error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters'),
  email: emailField,
  password: passwordField,
});

const loginSchema = z.object({
  identifier: z
    .string({ error: 'Email or username is required' })
    .trim()
    .min(2, 'Email or username must be at least 2 character'),
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required'),
});

const otpField = z
  .string({ error: 'Verification code is required' })
  .trim()
  .regex(/^\d{6}$/, 'Verification code must be 6 digits');

const forgotPasswordSchema = z.object({
  email: emailField,
});

const resetPasswordSchema = z.object({
  email: emailField,
  otp: otpField,
  password: passwordField,
});

const verifyEmailSchema = z.object({
  email: emailField,
  otp: otpField,
});

const resendVerificationSchema = z.object({
  email: emailField,
});

const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ error: 'Refresh token is required' })
    .trim()
    .min(1, 'Refresh token is required'),
});

const socialLoginSchema = z.object({
  provider: z.enum(SUPPORTED_SOCIAL_PROVIDERS, {
    error: 'Provider must be google or apple',
  }),
  idToken: z
    .string({ error: 'ID token is required' })
    .trim()
    .min(1, 'ID token is required'),
});

const totpCodeField = z
  .string({ error: 'Authenticator code is required' })
  .trim()
  .regex(/^\d{6}$/, 'Authenticator code must be 6 digits');

const twoFactorTokenField = z
  .string({ error: 'Two-factor token is required' })
  .trim()
  .regex(/^[a-f0-9]{64}$/, 'Invalid two-factor token');

const confirmTwoFactorSchema = z.object({
  code: totpCodeField,
});

const verifyTwoFactorLoginSchema = z.object({
  twoFactorToken: twoFactorTokenField,
  code: totpCodeField,
});

const disableTwoFactorSchema = z.object({
  code: totpCodeField,
  password: z.string().trim().optional(),
});

function isEmail(value) {
  return z.email().safeParse(value).success;
}

function formatZodError(zodError) {
  const details = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

  const error = new Error(details[0]?.message || 'Validation failed');
  error.statusCode = 400;
  error.details = details;

  return error;
}

function validateRegister(body) {
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateLogin(body) {
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateForgotPassword(body) {
  const result = forgotPasswordSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateResetPassword(body) {
  const result = resetPasswordSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateVerifyEmail(body) {
  const result = verifyEmailSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateResendVerification(body) {
  const result = resendVerificationSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateRefreshToken(body) {
  const result = refreshTokenSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateSocialLogin(body) {
  const result = socialLoginSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateConfirmTwoFactor(body) {
  const result = confirmTwoFactorSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateVerifyTwoFactorLogin(body) {
  const result = verifyTwoFactorLoginSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

function validateDisableTwoFactor(body) {
  const result = disableTwoFactorSchema.safeParse(body);

  if (!result.success) {
    throw formatZodError(result.error);
  }

  return result.data;
}

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateVerifyEmail,
  validateResendVerification,
  validateRefreshToken,
  validateSocialLogin,
  validateConfirmTwoFactor,
  validateVerifyTwoFactorLogin,
  validateDisableTwoFactor,
  isEmail,
};
