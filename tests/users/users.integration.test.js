const request = require('supertest');
const app = require('../../src/app');
const { getAuthToken, validRegisterPayload, verifyRegisteredUser, VALID_PASSWORD } = require('../helpers');

const API = '/api/v1';

const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

const PDF_BYTES = Buffer.from('%PDF-1.4\n');

describe('Users profile API', () => {
  describe('GET /users/me', () => {
    it('returns profilePicture as null by default', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profilePicture).toBeNull();
    });
  });

  describe('PATCH /users/me', () => {
    it('returns 401 without a token', async () => {
      const response = await request(app)
        .patch(`${API}/users/me`)
        .send({ firstName: 'Janet' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });

    it('returns 403 when email is not verified', async () => {
      const { signAccessToken } = require('../../src/modules/auth/access-jwt');

      const registerResponse = await request(app)
        .post(`${API}/auth/register`)
        .send(
          validRegisterPayload({
            username: 'patchunverified',
            email: 'patch-unverified@example.com',
          }),
        );

      const token = signAccessToken({ id: registerResponse.body.data.id });

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Janet' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Email not verified');
    });

    it('returns 400 when no updatable fields are sent', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('At least one profile field is required');
    });

    it('updates profile fields and returns the updated user', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Janet',
          lastName: 'Smith',
          username: 'janet',
          bio: 'Building cool things.',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        message: 'Profile updated successfully',
        data: {
          firstName: 'Janet',
          lastName: 'Smith',
          username: 'janet',
          bio: 'Building cool things.',
          email: 'jane@example.com',
        },
      });
      expect(response.body.data.password).toBeUndefined();

      const profileResponse = await request(app)
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data).toMatchObject({
        firstName: 'Janet',
        lastName: 'Smith',
        username: 'janet',
        bio: 'Building cool things.',
      });
    });

    it('returns 409 when the username is already taken', async () => {
      const token = await getAuthToken(app);

      await request(app)
        .post(`${API}/auth/register`)
        .send(
          validRegisterPayload({
            username: 'john',
            email: 'john@example.com',
          }),
        );

      await verifyRegisteredUser(app, 'john@example.com');

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'john' });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Username already in use');
    });

    it('returns 400 when validation fails', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'ab' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Username must be at least 3 characters',
      );
    });

    it('sets profilePicture from an uploaded image and returns the hydrated file', async () => {
      const token = await getAuthToken(app);

      const uploadResponse = await request(app)
        .post(`${API}/uploads`)
        .set('Authorization', `Bearer ${token}`)
        .attach('files', JPEG_BYTES, 'avatar.jpg');

      expect(uploadResponse.status).toBe(201);

      const fileId = uploadResponse.body.data[0].id;

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ profilePicture: fileId });

      expect(response.status).toBe(200);
      expect(response.body.data.profilePicture).toMatchObject({
        id: fileId,
        originalName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        provider: 'local',
      });
      expect(response.body.data.profilePicture.url).toEqual(expect.any(String));

      const profileResponse = await request(app)
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.body.data.profilePicture.id).toBe(fileId);
    });

    it('clears profilePicture when null is sent', async () => {
      const token = await getAuthToken(app);

      const uploadResponse = await request(app)
        .post(`${API}/uploads`)
        .set('Authorization', `Bearer ${token}`)
        .attach('files', JPEG_BYTES, 'avatar.jpg');

      const fileId = uploadResponse.body.data[0].id;

      await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ profilePicture: fileId });

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ profilePicture: null });

      expect(response.status).toBe(200);
      expect(response.body.data.profilePicture).toBeNull();
    });

    it('returns 400 when profilePicture is another users file', async () => {
      const ownerToken = await getAuthToken(app);
      const otherToken = await getSecondUserToken(app);

      const uploadResponse = await request(app)
        .post(`${API}/uploads`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('files', JPEG_BYTES, 'avatar.jpg');

      const fileId = uploadResponse.body.data[0].id;

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ profilePicture: fileId });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid profile picture');
    });

    it('returns 400 when profilePicture is not an image', async () => {
      const token = await getAuthToken(app);

      const uploadResponse = await request(app)
        .post(`${API}/uploads`)
        .set('Authorization', `Bearer ${token}`)
        .attach('files', PDF_BYTES, 'notes.pdf');

      const fileId = uploadResponse.body.data[0].id;

      const response = await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({ profilePicture: fileId });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Profile picture must be an image');
    });
  });

  describe('GET /users/:userId', () => {
    it('returns a public profile without private account fields', async () => {
      const viewerToken = await getAuthToken(app);
      const subjectToken = await getSecondUserToken(app);

      const meResponse = await request(app)
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${subjectToken}`)
        .send();

      const userId = meResponse.body.data.id;

      await request(app)
        .patch(`${API}/users/me`)
        .set('Authorization', `Bearer ${subjectToken}`)
        .send({ bio: 'Building in public', firstName: 'John', lastName: 'Smith' });

      const response = await request(app)
        .get(`${API}/users/${userId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: userId,
        firstName: 'John',
        lastName: 'Smith',
        username: 'john',
        bio: 'Building in public',
        avatar: 'JS',
        profilePicture: null,
      });
      expect(response.body.data.email).toBeUndefined();
      expect(response.body.data.emailVerified).toBeUndefined();
      expect(response.body.data.twoFactorEnabled).toBeUndefined();
      expect(response.body.data.status).toBeUndefined();
    });

    it('returns 404 for an unknown user id', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .get(`${API}/users/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('returns 404 for inactive users', async () => {
      const viewerToken = await getAuthToken(app);
      const subjectToken = await getSecondUserToken(app);

      const meResponse = await request(app)
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${subjectToken}`);

      const userId = meResponse.body.data.id;
      const UsersModel = require('../../src/modules/users/models/users.model.mongo');

      await UsersModel.updateOne({ _id: userId }, { status: 'inactive' });

      const response = await request(app)
        .get(`${API}/users/${userId}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('returns 400 for an invalid user id', async () => {
      const token = await getAuthToken(app);

      const response = await request(app)
        .get(`${API}/users/not-an-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid user id');
    });
  });
});

async function getSecondUserToken(app) {
  await request(app)
    .post(`${API}/auth/register`)
    .send(
      validRegisterPayload({
        username: 'john',
        email: 'john@example.com',
      }),
    );

  await verifyRegisteredUser(app, 'john@example.com');

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'john', password: VALID_PASSWORD });

  return loginResponse.body.data.token;
}
