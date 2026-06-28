const request = require('supertest');
const app = require('../../src/app');
const {
  setSocialTokenVerifierForTests,
} = require('../../src/utils/social-auth');
const {
  validRegisterPayload,
  verifyRegisteredUser,
  VALID_PASSWORD,
} = require('../helpers');

const API = '/api/v1';

const googleProfile = {
  provider: 'google',
  providerId: 'google-sub-123',
  email: 'social@example.com',
  firstName: 'Social',
  lastName: 'User',
  emailVerified: true,
};

describe('Social login API', () => {
  afterEach(() => {
    setSocialTokenVerifierForTests(null);
  });

  describe('POST /auth/social', () => {
    it('creates a new user and returns tokens', async () => {
      setSocialTokenVerifierForTests(async () => googleProfile);

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Login successful',
        data: {
          user: {
            email: 'social@example.com',
            firstName: 'Social',
            lastName: 'User',
          },
          token: expect.any(String),
          refreshToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      });
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.authProviders).toBeUndefined();
      expect(response.body.data.user.emailVerified).toBe(true);
    });

    it('returns tokens for an existing social user', async () => {
      setSocialTokenVerifierForTests(async () => googleProfile);

      await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('social@example.com');
      expect(response.body.data.token).toEqual(expect.any(String));
    });

    it('links social to an unverified password account and clears the squatter password', async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(
          validRegisterPayload({
            email: 'social@example.com',
            username: 'socialuser',
          }),
        );

      setSocialTokenVerifierForTests(async () => googleProfile);

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('social@example.com');
      expect(response.body.data.user.username).toBe('socialuser');
      expect(response.body.data.user.emailVerified).toBe(true);

      const loginResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'socialuser', password: VALID_PASSWORD });

      expect(loginResponse.status).toBe(400);
      expect(loginResponse.body.message).toBe('This account uses social login');
    });

    it('links social to a verified password account and keeps password login', async () => {
      await request(app)
        .post(`${API}/auth/register`)
        .send(
          validRegisterPayload({
            email: 'verified-link@example.com',
            username: 'verifiedlink',
          }),
        );

      await verifyRegisteredUser(app, 'verified-link@example.com');

      setSocialTokenVerifierForTests(async () => ({
        ...googleProfile,
        email: 'verified-link@example.com',
        providerId: 'google-sub-verified-link',
      }));

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('verified-link@example.com');

      const loginResponse = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'verifiedlink', password: VALID_PASSWORD });

      expect(loginResponse.status).toBe(200);
    });

    it('returns 400 when idToken is missing', async () => {
      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google' });

      expect(response.status).toBe(400);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toBe('ID token is required');
    });

    it('returns 400 for an unsupported provider', async () => {
      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'github', idToken: 'token' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/google or apple/i);
    });

    it('returns 401 for an invalid social token', async () => {
      setSocialTokenVerifierForTests(async () => {
        const error = new Error('Invalid or expired social token');
        error.statusCode = 401;
        throw error;
      });

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'bad-token' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired social token');
    });

    it('returns 400 when the provider does not return an email for a new user', async () => {
      setSocialTokenVerifierForTests(async () => ({
        ...googleProfile,
        email: undefined,
      }));

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Email is required from the social provider',
      );
    });

    it('returns 400 when the provider email is not verified for a new user', async () => {
      setSocialTokenVerifierForTests(async () => ({
        ...googleProfile,
        emailVerified: false,
      }));

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Email not verified with the social provider',
      );
    });

    it('allows returning social users even if emailVerified is false in a later token', async () => {
      setSocialTokenVerifierForTests(async () => ({
        ...googleProfile,
        emailVerified: true,
      }));

      await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      setSocialTokenVerifierForTests(async () => ({
        ...googleProfile,
        emailVerified: false,
      }));

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('social@example.com');
    });

    it('returns 403 when the account is inactive', async () => {
      const UsersModel = require('../../src/modules/users/models/users.model.mongo');

      setSocialTokenVerifierForTests(async () => googleProfile);

      await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      await UsersModel.updateOne(
        { email: 'social@example.com' },
        { status: 'inactive' },
      );

      const response = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Account is inactive');
    });

    it('returns 400 when a passwordless social user tries password login', async () => {
      setSocialTokenVerifierForTests(async () => googleProfile);

      const socialResponse = await request(app)
        .post(`${API}/auth/social`)
        .send({ provider: 'google', idToken: 'valid-google-token' });

      expect(socialResponse.status).toBe(200);

      const response = await request(app)
        .post(`${API}/auth/login`)
        .send({ identifier: 'social@example.com', password: VALID_PASSWORD });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('This account uses social login');
    });
  });
});
