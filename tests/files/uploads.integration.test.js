const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/config');
const filesRepository = require('../../src/modules/files/repositories');
const { getAuthToken, validRegisterPayload, VALID_PASSWORD, getLatestOtp } = require('../helpers');
const { OTP_PURPOSES } = require('../../src/constants/otp');

const API = '/api/v1';

// Minimal valid JPEG header bytes for mime detection in tests
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

async function getSecondUserToken() {
  await request(app)
    .post(`${API}/auth/register`)
    .send(
      validRegisterPayload({
        username: 'john',
        email: 'john@example.com',
      }),
    );

  await request(app)
    .post(`${API}/auth/verify-email`)
    .send({
      email: 'john@example.com',
      otp: getLatestOtp('john@example.com', OTP_PURPOSES.VERIFY_EMAIL),
    });

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'john', password: VALID_PASSWORD });

  return loginResponse.body.data.token;
}

describe('POST /uploads', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post(`${API}/uploads`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(response.status).toBe(401);
  });

  it('returns 400 when no files are sent', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('At least one file is required');
  });

  it('uploads multiple files and returns metadata for each', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo-one.jpg')
      .attach('files', JPEG_BYTES, 'photo-two.jpg');

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Files uploaded successfully');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0]).toMatchObject({
      id: expect.stringMatching(/^[a-f0-9]{24}$/),
      originalName: 'photo-one.jpg',
      mimeType: 'image/jpeg',
      encoding: '7bit',
      size: expect.any(Number),
      provider: 'local',
      name: expect.stringMatching(/^[a-f0-9]{32}\.jpg$/),
      url: expect.stringMatching(/\/uploads\/[a-f0-9]{32}\.jpg$/),
    });
    expect(response.body.data[1].originalName).toBe('photo-two.jpg');

    const filePath = path.join(
      config.upload.local.directory,
      response.body.data[0].name,
    );
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('removes stored files when the database write fails', async () => {
    const token = await getAuthToken(app);
    const filesBefore = fs.readdirSync(config.upload.local.directory);
    const createManySpy = vi
      .spyOn(filesRepository, 'createMany')
      .mockRejectedValueOnce(new Error('db failed'));

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    createManySpy.mockRestore();

    expect(response.status).toBe(500);

    const filesAfter = fs.readdirSync(config.upload.local.directory);
    expect(filesAfter).toEqual(filesBefore);
  });

  it('returns 400 for disallowed file types', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', Buffer.from('not an image'), 'notes.txt');

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/File type not allowed/);
  });
});

describe('DELETE /uploads/:fileId', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app).delete(
      `${API}/uploads/a1b2c3d4e5f678901234567890abcd12.jpg`,
    );

    expect(response.status).toBe(401);
  });

  it('archives an uploaded file by name and removes it from active storage', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    expect(uploadResponse.status).toBe(201);

    const { id, name } = uploadResponse.body.data[0];
    const activePath = path.join(config.upload.local.directory, name);
    const archivePath = path.join(config.upload.local.archiveDirectory, name);

    expect(fs.existsSync(activePath)).toBe(true);

    const archiveResponse = await request(app)
      .delete(`${API}/uploads/${name}`)
      .set('Authorization', `Bearer ${token}`);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.message).toBe('File archived successfully');
    expect(archiveResponse.body.data).toEqual({
      id,
      name,
      archivedName: `_archive/${name}`,
      provider: 'local',
    });
    expect(fs.existsSync(activePath)).toBe(false);
    expect(fs.existsSync(archivePath)).toBe(true);

    const publicResponse = await request(app).get(`/uploads/${name}`);
    expect(publicResponse.status).toBe(404);
  });

  it('archives an uploaded file by id', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const { id, name } = uploadResponse.body.data[0];

    const archiveResponse = await request(app)
      .delete(`${API}/uploads/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.data.id).toBe(id);
    expect(fs.existsSync(path.join(config.upload.local.directory, name))).toBe(
      false,
    );
  });

  it('returns 404 when another user tries to archive the file', async () => {
    const ownerToken = await getAuthToken(app);
    const otherToken = await getSecondUserToken();

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const { name } = uploadResponse.body.data[0];

    const response = await request(app)
      .delete(`${API}/uploads/${name}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });

  it('restores active storage when the database update fails', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const { name } = uploadResponse.body.data[0];
    const activePath = path.join(config.upload.local.directory, name);
    const markArchivedSpy = vi
      .spyOn(filesRepository, 'markArchived')
      .mockRejectedValueOnce(new Error('db failed'));

    const response = await request(app)
      .delete(`${API}/uploads/${name}`)
      .set('Authorization', `Bearer ${token}`);

    markArchivedSpy.mockRestore();

    expect(response.status).toBe(500);
    expect(fs.existsSync(activePath)).toBe(true);
    expect(
      fs.existsSync(path.join(config.upload.local.archiveDirectory, name)),
    ).toBe(false);
  });

  it('returns 404 when archiving a file that does not exist', async () => {
    const token = await getAuthToken(app);

    const response = await request(app)
      .delete(`${API}/uploads/a1b2c3d4e5f678901234567890abcd12.jpg`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });
});

describe('protected file access', () => {
  const previousPublicAccess = process.env.UPLOAD_PUBLIC_ACCESS;

  beforeAll(() => {
    process.env.UPLOAD_PUBLIC_ACCESS = 'false';
  });

  afterAll(() => {
    if (previousPublicAccess === undefined) {
      delete process.env.UPLOAD_PUBLIC_ACCESS;
    } else {
      process.env.UPLOAD_PUBLIC_ACCESS = previousPublicAccess;
    }
  });

  it('returns auth-protected download URLs and blocks anonymous access', async () => {
    const token = await getAuthToken(app);

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'protected.jpg');

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.data[0].url).toMatch(
      /\/api\/v1\/uploads\/[a-f0-9]{24}\/download$/,
    );

    const downloadPath = new URL(uploadResponse.body.data[0].url).pathname;
    const fileName = uploadResponse.body.data[0].name;

    const unauthenticated = await request(app).get(downloadPath);
    expect(unauthenticated.status).toBe(401);

    const publicStatic = await request(app).get(`/uploads/${fileName}`);
    expect(publicStatic.status).toBe(404);

    const authenticated = await request(app)
      .get(downloadPath)
      .set('Authorization', `Bearer ${token}`);

    expect(authenticated.status).toBe(200);
    expect(authenticated.headers['content-type']).toMatch(/image\/jpeg/);
  });

  it('returns 404 when another user tries to download the file', async () => {
    const ownerToken = await getAuthToken(app);
    const otherToken = await getSecondUserToken();

    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('files', JPEG_BYTES, 'protected-other.jpg');

    expect(uploadResponse.status).toBe(201);

    const downloadPath = new URL(uploadResponse.body.data[0].url).pathname;

    const response = await request(app)
      .get(downloadPath)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('File not found');
  });
});
