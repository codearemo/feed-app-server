// ******************************************************
// OTP SERVICE — issue and verify email OTP codes
// ******************************************************
//
// Shared by auth.service for email verification and password reset.
// Persists hashed codes via email-otps repository; sends via mail util.

const config = require('../../../config');
const { generateOtp, hashOtp } = require('../../../utils/otp');
const { sendOtpEmail } = require('../../../utils/mail');
const { emailOtps: emailOtpsRepository } = require('../repositories');

async function issueOtp(email, purpose) {
  const rawOtp = generateOtp();
  const otpHash = hashOtp(rawOtp);
  const expiresAt = new Date(
    Date.now() + config.otp.expiresMinutes * 60 * 1000,
  );

  await emailOtpsRepository.upsert(email, purpose, otpHash, expiresAt);

  try {
    await sendOtpEmail({ to: email, purpose, otp: rawOtp });
  } catch (error) {
    await emailOtpsRepository.deleteByEmailAndPurpose(email, purpose);
    throw error;
  }

  return rawOtp;
}

async function verifyOtp(email, purpose, rawOtp) {
  const record = await emailOtpsRepository.findValid(email, purpose);

  if (!record) {
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  if (record.attempts >= config.otp.maxAttempts) {
    await emailOtpsRepository.deleteByEmailAndPurpose(email, purpose);
    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  if (hashOtp(rawOtp) !== record.otpHash) {
    const updated = await emailOtpsRepository.incrementAttempts(record.id);

    if (updated.attempts >= config.otp.maxAttempts) {
      await emailOtpsRepository.deleteByEmailAndPurpose(email, purpose);
    }

    const error = new Error('Invalid or expired verification code');
    error.statusCode = 400;
    throw error;
  }

  await emailOtpsRepository.deleteByEmailAndPurpose(email, purpose);
}

module.exports = {
  issueOtp,
  verifyOtp,
};
