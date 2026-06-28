const request = require('supertest');
const app = require('../../src/app');
const { generateTotpCode } = require('../../src/utils/totp');
const {
  setSocialTokenVerifierForTests,
} = require('../../src/utils/social-auth');
const {
  validRegisterPayload,
  verifyRegisteredUser,
  getAuthToken,
  VALID_PASSWORD,
} = require('../helpers');

const API = '/api/v1';

const googleProfile = {
  provider: 'google',
  providerId: 'google-2fa-sub',
  email: '2fa-social@example.com',
  firstName: 'Two',
  lastName: 'Factor',
  emailVerified: true,
};

async function enableTwoFactor(app, token) {
  const setupResponse = await request(app)
    .post(`${API}/auth/2fa/setup`)
    .set('Authorization', `Bearer ${token}`)
    .send();

  expect(setupResponse.status).toBe(200);

  const { secret, otpauthUrl } = setupResponse.body.data;

  expect(secret).toEqual(expect.any(String));
  expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);

  const confirmResponse = await request(app)
    .post(`${API}/auth/2fa/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .send({ code: generateTotpCode(secret) });

  expect(confirmResponse.status).toBe(200);
  expect(confirmResponse.body.data).toEqual({ twoFactorEnabled: true });

  return secret;
}

describe('Two-factor authentication API', () => {
  afterEach(() => {
    setSocialTokenVerifierForTests(null);
  });

  describe('POST /auth/2fa/setup', () => {
    it('returns 401 without a token', async () => {
      const response = await request(app).post(`${API}/auth/2fa/setup`).send();

      expect(response.status).toBe(401);
    });

    it('returns a secret and otpauth URL for an authenticated user', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .post(`${API}/auth/2fa/setup`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.data.secret).toEqual(expect.any(String));
      expect(response.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    });
  });

  describe('POST /auth/2fa/confirm', () => {
    it('enables two-factor authentication with a valid code', async () => {
      const token = await getAuthToken(app);
      const secret = await enableTwoFactor(app, token);

      expect(secret).toEqual(expect.any(String));
    });
  });

  describe('Password login with 2FA', () => {
    beforeEach(async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(validRegisterPayload());

      await verifyRegisteredUser(app);
    });

    it('returns a challenge instead of tokens when 2FA is enabled', async () => {
      const loginResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      const token = loginResponse.body.data.token;
      await enableTwoFactor(app, token);

      const challengeResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(challengeResponse.status).toBe(200);
      expect(challengeResponse.body.message).toMatch(/two-factor authentication required/i);
      expect(challengeResponse.body.data).toEqual({
        requiresTwoFactor: true,
        twoFactorToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(challengeResponse.body.data.token).toBeUndefined();
    });

    it('issues tokens after a valid authenticator code', async () => {
      const loginResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      const token = loginResponse.body.data.token;
      const secret = await enableTwoFactor(app, token);

      const challengeResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      const verifyResponse = await request(app)
        .post(`${API}/auth/2fa/verify`)
        .send({
          twoFactorToken: challengeResponse.body.data.twoFactorToken,
          code: generateTotpCode(secret),
        });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.data).toMatchObject({
        requiresTwoFactor: false,
        user: {
          username: 'jane',
          email: 'jane@example.com',
          twoFactorEnabled: true,
        },
        token: expect.any(String),
        refreshToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });

    it('returns 400 for an invalid authenticator code', async () => {
      const loginResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      await enableTwoFactor(app, loginResponse.body.data.token);

      const challengeResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      const verifyResponse = await request(app)
        .post(`${API}/auth/2fa/verify`)
        .send({
          twoFactorToken: challengeResponse.body.data.twoFactorToken,
          code: '000000',
        });

      expect(verifyResponse.status).toBe(400);
      expect(verifyResponse.body.message).toBe('Invalid authenticator code');
    });
  });

  describe('Social login with 2FA', () => {
    it('returns a challenge instead of tokens when 2FA is enabled', async () => {
      setSocialTokenVerifierForTests(async () => googleProfile);

      const firstLogin = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      await enableTwoFactor(app, firstLogin.body.data.token);

      const challengeResponse = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(challengeResponse.status).toBe(200);
      expect(challengeResponse.body.data).toEqual({
        requiresTwoFactor: true,
        twoFactorToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
    });
  });

  describe('POST /auth/2fa/disable', () => {
    it('disables 2FA with a valid code and password', async () => {
      const token = await getAuthToken(app);
      const secret = await enableTwoFactor(app, token);

      const response = await request(app)
        .post(`${API}/auth/2fa/disable`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: generateTotpCode(secret),
          password: VALID_PASSWORD,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ twoFactorEnabled: false });

      const loginResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'jane', password: VALID_PASSWORD });

      expect(loginResponse.body.data.requiresTwoFactor).toBe(false);
      expect(loginResponse.body.data.token).toEqual(expect.any(String));
    });
  });
});
