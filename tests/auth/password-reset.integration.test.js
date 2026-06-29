const request = require('supertest');
const app = require('../../src/app');
const { OTP_PURPOSES } = require('../../src/constants/otp');
const { sentOtps } = require('../../src/utils/mail');
const {
  validRegisterPayload,
  VALID_PASSWORD,
  VALID_NEW_PASSWORD,
  getLatestOtp,
  verifyRegisteredUser,
} = require('../helpers');

const API = '/api/v1';
const FORGOT_PASSWORD_MESSAGE =
  'If that email is registered, a verification code has been sent.';

describe('Password reset API', () => {
  beforeEach(() => {
    sentOtps.length = 0;
  });

  describe('POST /auth/forgot-password', () => {
    it('returns the same success message and sends an OTP when email exists', async () => {
      const registerResponse = await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      expect(registerResponse.status).toBe(201);

      await verifyRegisteredUser(app);

      sentOtps.length = 0;

      const response = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'jane@example.com' });

      expect(response.status, JSON.stringify(response.body)).toBe(200);
      expect(response.body).toMatchObject({
        data: null,
        message: FORGOT_PASSWORD_MESSAGE,
      });
      expect(sentOtps).toHaveLength(1);
      expect(sentOtps[0]).toMatchObject({
        to: 'jane@example.com',
        purpose: OTP_PURPOSES.RESET_PASSWORD,
        otp: expect.stringMatching(/^\d{6}$/),
      });
    });

    it('returns the same success message without sending email for unknown email', async () => {
      const response = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'unknown@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(FORGOT_PASSWORD_MESSAGE);
      expect(sentOtps).toHaveLength(0);
    });

    it('returns 400 when validation fails', async () => {
      const response = await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body.data).toBeNull();
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      );
    });

    it('returns 200 when SMTP fails for a registered email', async () => {
      const mail = require('../../src/utils/mail');
      const sendSpy = vi
        .spyOn(mail, 'sendOtpEmail')
        .mockRejectedValue(new Error('SMTP down'));

      try {
        await request(app)
          .post(`${API}/auth/register`)
          .send(validRegisterPayload());

        await verifyRegisteredUser(app);

        const response = await request(app)
          .post(`${API}/auth/forgot-password`)
          .send({ email: 'jane@example.com' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe(FORGOT_PASSWORD_MESSAGE);
      } finally {
        sendSpy.mockRestore();
      }
    });
  });

  describe('POST /auth/reset-password', () => {
    beforeEach(async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      await verifyRegisteredUser(app);

      sentOtps.length = 0;

      await request(app)
        .post(`${API}/auth/forgot-password`)
        .send({ email: 'jane@example.com' });
    });

    it('updates the password so the user can log in with the new one', async () => {
      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.RESET_PASSWORD);

      const resetResponse = await request(app)
        .post(`${API}/auth/reset-password`)
        .send({
          email: 'jane@example.com',
          otp,
          password: VALID_NEW_PASSWORD,
        });

      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body).toMatchObject({
        data: null,
        message: 'Password updated successfully',
      });

      const oldPasswordLogin = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(oldPasswordLogin.status).toBe(400);

      const newPasswordLogin = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_NEW_PASSWORD });

      expect(newPasswordLogin.status).toBe(200);
    });

    it('returns 400 for an invalid OTP', async () => {
      const response = await request(app)
        .post(`${API}/auth/reset-password`)
        .send({
          email: 'jane@example.com',
          otp: '000000',
          password: VALID_NEW_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        data: null,
        message: 'Invalid or expired verification code',
      });
    });

    it('returns 400 when the OTP has expired', async () => {
      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.RESET_PASSWORD);
      const EmailOtpsModel = require('../../src/modules/auth/models/email-otps.model.mongo');

      await EmailOtpsModel.updateOne(
        { email: 'jane@example.com', purpose: OTP_PURPOSES.RESET_PASSWORD },
        { $set: { expiresAt: new Date(Date.now() - 1000) } },
      );

      const response = await request(app)
        .post(`${API}/auth/reset-password`)
        .send({
          email: 'jane@example.com',
          otp,
          password: VALID_NEW_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification code');
    });

    it('returns 400 when the same OTP is used twice', async () => {
      const otp = getLatestOtp('jane@example.com', OTP_PURPOSES.RESET_PASSWORD);

      await request(app)
        .post(`${API}/auth/reset-password`)
        .send({
          email: 'jane@example.com',
          otp,
          password: VALID_NEW_PASSWORD,
        })
        .expect(200);

      const response = await request(app)
        .post(`${API}/auth/reset-password`)
        .send({
          email: 'jane@example.com',
          otp,
          password: VALID_NEW_PASSWORD,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification code');
    });
  });
});
