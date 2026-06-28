const request = require('supertest');
const app = require('../../src/app');
const {
  getAuthToken,
  validRegisterPayload,
  verifyRegisteredUser,
  VALID_PASSWORD,
} = require('../helpers');

const API = '/api/v1';

const JPEG_BYTES = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

function validPostPayload(overrides = {}) {
  return {
    title: 'Why I still write long-form posts',
    excerpt: 'Short updates are easy to consume.',
    content: 'There is a difference between reacting and reflecting.',
    tags: ['writing'],
    images: [],
    ...overrides,
  };
}

async function getSecondUserToken(app) {
  await request(app)
    .post(`${API}/auth/register`)
    .send(
      validRegisterPayload({
        username: 'sam',
        email: 'sam@example.com',
        firstName: 'Sam',
        lastName: 'Rivera',
      }),
    );

  await verifyRegisteredUser(app, 'sam@example.com');

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'sam', password: VALID_PASSWORD });

  return loginResponse.body.data.token;
}

describe('Posts and feed API', () => {
  it('creates, reads, updates, and deletes a post', async () => {
    const token = await getAuthToken(app);
    const uploadResponse = await request(app)
      .post(`${API}/uploads`)
      .set('Authorization', `Bearer ${token}`)
      .attach('files', JPEG_BYTES, 'photo.jpg');

    const uploadedFile = uploadResponse.body.data[0];

    const createResponse = await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validPostPayload({ images: [uploadedFile] }));

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data).toMatchObject({
      title: 'Why I still write long-form posts',
      tags: ['writing'],
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
    });
    expect(createResponse.body.data.author).toMatchObject({
      name: 'Jane Doe',
      avatar: 'JD',
      profilePicture: null,
    });
    expect(createResponse.body.data.images).toHaveLength(1);
    expect(createResponse.body.data.images[0]).toMatchObject({
      id: uploadedFile.id,
      mimeType: 'image/jpeg',
      provider: 'local',
    });

    const postId = createResponse.body.data.id;

    const getResponse = await request(app)
      .get(`${API}/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe(postId);

    const updateResponse = await request(app)
      .patch(`${API}/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated title' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe('Updated title');

    const deleteResponse = await request(app)
      .delete(`${API}/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);

    const missingResponse = await request(app)
      .get(`${API}/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(missingResponse.status).toBe(404);
  });

  it('lists posts in the feed with pagination', async () => {
    const token = await getAuthToken(app);

    await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validPostPayload({ title: 'First post' }));

    await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${token}`)
      .send(validPostPayload({ title: 'Second post' }));

    const feedResponse = await request(app)
      .get(`${API}/feed?page=1&limit=10`)
      .set('Authorization', `Bearer ${token}`);

    expect(feedResponse.status).toBe(200);
    expect(feedResponse.body.data.length).toBeGreaterThanOrEqual(2);
    expect(feedResponse.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      hasPrevPage: false,
    });
  });

  it('supports comments and likes on posts and comments', async () => {
    const authorToken = await getAuthToken(app);
    const readerToken = await getSecondUserToken(app);

    const postResponse = await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send(validPostPayload());

    const postId = postResponse.body.data.id;

    const commentResponse = await request(app)
      .post(`${API}/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${readerToken}`)
      .send(
        validPostPayload({
          title: 'Great point',
          content: 'I agree with this take.',
        }),
      );

    expect(commentResponse.status).toBe(201);
    expect(commentResponse.body.data.author.name).toBe('Sam Rivera');
    expect(commentResponse.body.data.commentCount).toBeUndefined();

    const commentId = commentResponse.body.data.id;

    const likePostResponse = await request(app)
      .post(`${API}/posts/${postId}/likes`)
      .set('Authorization', `Bearer ${readerToken}`);

    expect(likePostResponse.status).toBe(200);
    expect(likePostResponse.body.data).toMatchObject({
      likeCount: 1,
      likedByMe: true,
      commentCount: 1,
    });

    const likeCommentResponse = await request(app)
      .post(`${API}/posts/${postId}/comments/${commentId}/likes`)
      .set('Authorization', `Bearer ${authorToken}`);

    expect(likeCommentResponse.status).toBe(200);
    expect(likeCommentResponse.body.data).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });

    const commentsResponse = await request(app)
      .get(`${API}/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${readerToken}`);

    expect(commentsResponse.status).toBe(200);
    expect(commentsResponse.body.data).toHaveLength(1);
    expect(commentsResponse.body.data[0].likeCount).toBe(1);

    const unlikePostResponse = await request(app)
      .delete(`${API}/posts/${postId}/likes`)
      .set('Authorization', `Bearer ${readerToken}`);

    expect(unlikePostResponse.status).toBe(200);
    expect(unlikePostResponse.body.data).toMatchObject({
      likeCount: 0,
      likedByMe: false,
    });
  });

  it('returns 403 when a non-author updates a post', async () => {
    const authorToken = await getAuthToken(app);
    const otherToken = await getSecondUserToken(app);

    const postResponse = await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send(validPostPayload());

    const response = await request(app)
      .patch(`${API}/posts/${postResponse.body.data.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hijacked' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You can only modify your own content');
  });
});
