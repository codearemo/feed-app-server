const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const { OTP_PURPOSES } = require('../../src/constants/otp');
const { sentOtps } = require('../../src/utils/mail');
const {
  validRegisterPayload,
  VALID_PASSWORD,
  getLatestOtp,
  verifyRegisteredUser,
} = require('../helpers');

const API = '/api/v1';

async function registerJane() {
  sentOtps.length = 0;

  const response = await request(app)
    .post(`${API}/auth/register`)
    .send(validRegisterPayload());

  expect(response.status).toBe(201);

  return response;
}

describe('Email verification API', () => {
  describe('POST /auth/register', () => {
    it('sends a verification OTP and returns an unverified user', async () => {
      const response = await registerJane();

      expect(response.body.message).toMatch(/verification code has been sent/i);
      expect(response.body.data.emailVerified).toBe(false);
      expect(sentOtps).toHaveLength(1);
      expect(sentOtps[0]).toMatchObject({
        to: 'jane@example.com',
        purpose: OTP_PURPOSES.VERIFY_EMAIL,
        otp: expect.stringMatching(/^\d{6}$/),
      });
    });
  });

  describe('POST /auth/verify-email', () => {
    beforeEach(async () => {
      await registerJane();
    });

    it('verifies the email with a valid OTP', async () => {
      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.VERIFY_EMAIL);

      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email verified successfully');
      expect(response.body.data.emailVerified).toBe(true);
    });

    it('returns 400 for an invalid OTP', async () => {
      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp: '999999' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification code');
    });

    it('locks out after too many invalid OTP attempts', async () => {
      const { maxAttempts } = config.otp;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await request(app)
          .post(`${API}/auth/verify-email`)
          .send({ email: 'jane@example.com', otp: '999999' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
          'Invalid or expired verification code',
        );
      }

      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.VERIFY_EMAIL);
      expect(otp).toBeDefined();

      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification code');
    });

    it('returns 400 when email is already verified', async () => {
      await verifyRegisteredUser(app);

      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.VERIFY_EMAIL);

      const response = await request(app)
        .post(`${API}/auth/verify-email`)
        .send({ email: 'jane@example.com', otp: otp || '123456' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email is already verified');
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('sends another verification OTP for an unverified user', async () => {
      await registerJane();

      sentOtps.length = 0;

      const response = await request(app)
        .post(`${API}/auth/resend-verification`)
        .send({ email: 'jane@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/verification code has been sent/i);
      expect(sentOtps).toHaveLength(1);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 403 when email is not verified', async () => {
      await registerJane();

      const response = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Email not verified');
    });

    it('allows login after email verification', async () => {
      await registerJane();
      await verifyRegisteredUser(app);

      const response = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toEqual(expect.any(String));
    });
  });
});
