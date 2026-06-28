const http = require('http');
const request = require('supertest');
const { io } = require('socket.io-client');
const app = require('../../src/app');
const config = require('../../src/config');
const { SOCKET_EVENTS } = require('../../src/constants/socket-events');
const { initSocket, closeSocket } = require('../../src/socket');
const {
  getAuthToken,
  validRegisterPayload,
  verifyRegisteredUser,
  VALID_PASSWORD,
} = require('../helpers');

const API = '/api/v1';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

function connectClient(port, options = {}) {
  return io(`http://127.0.0.1:${port}`, {
    path: config.socket.path,
    transports: ['websocket'],
    autoConnect: false,
    ...options,
  });
}

function waitForConnect(client) {
  return new Promise((resolve, reject) => {
    client.once('connect_error', reject);
    client.once('connect', resolve);
    client.connect();
  });
}

function waitForEvent(client, event) {
  return new Promise((resolve) => {
    client.once(event, resolve);
  });
}

function emitWithAck(client, event, payload) {
  return new Promise((resolve, reject) => {
    const ack = (response) => {
      if (response?.ok === false) {
        reject(new Error(response.message || 'Socket request failed'));
        return;
      }

      resolve(response);
    };

    if (payload === undefined) {
      client.emit(event, ack);
      return;
    }

    client.emit(event, payload, ack);
  });
}

async function getSecondUserToken() {
  await request(app)
    .post(`${API}/auth/register`)
    .send(
      validRegisterPayload({
        username: 'socket-sam',
        email: 'socket-sam@example.com',
        firstName: 'Sam',
        lastName: 'Rivera',
      }),
    );

  await verifyRegisteredUser(app, 'socket-sam@example.com');

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'socket-sam', password: VALID_PASSWORD });

  return {
    token: loginResponse.body.data.token,
    userId: loginResponse.body.data.user.id,
  };
}

function validPostPayload(overrides = {}) {
  return {
    title: 'Socket test post',
    excerpt: 'Excerpt',
    content: 'Content body',
    tags: ['socket'],
    images: [],
    ...overrides,
  };
}

describe('Socket.IO', () => {
  /** @type {import('http').Server | undefined} */
  let server;
  let port;

  beforeEach(async () => {
    server = http.createServer(app);
    initSocket(server);
    port = await listen(server);
  });

  afterEach(async () => {
    await closeSocket();
    server = undefined;
  });

  it('rejects connections without a token', async () => {
    const client = connectClient(port);

    const error = await new Promise((resolve, reject) => {
      client.on('connect', () => reject(new Error('Expected connection to fail')));
      client.on('connect_error', resolve);
      client.connect();
    });

    expect(error.message).toMatch(/authentication required/i);
    client.close();
  });

  it('accepts a connection with a valid access JWT', async () => {
    const token = await getAuthToken(app);
    const client = connectClient(port, { auth: { token } });

    const payload = await new Promise((resolve, reject) => {
      client.on('connect_error', reject);
      client.on(SOCKET_EVENTS.CONNECTED, resolve);
      client.connect();
    });

    expect(payload).toEqual({ userId: expect.any(String) });
    expect(client.connected).toBe(true);
    client.close();
  });

  it('rejects inactive accounts', async () => {
    const token = await getAuthToken(app);
    const UsersModel = require('../../src/modules/users/models/users.model.mongo');

    await UsersModel.updateOne({ username: 'jane' }, { status: 'inactive' });

    const client = connectClient(port, { auth: { token } });

    const error = await new Promise((resolve, reject) => {
      client.on('connect', () => reject(new Error('Expected connection to fail')));
      client.on('connect_error', resolve);
      client.connect();
    });

    expect(error.message).toBe('Account is inactive');
    client.close();
  });

  it('broadcasts feed:post_created to clients in the feed room', async () => {
    const { token: authorToken } = await getSecondUserToken();
    const viewerToken = await getAuthToken(app);

    const viewer = connectClient(port, { auth: { token: viewerToken } });
    await waitForConnect(viewer);
    await emitWithAck(viewer, SOCKET_EVENTS.FEED_JOIN);

    const feedEvent = waitForEvent(viewer, SOCKET_EVENTS.FEED_POST_CREATED);

    const createResponse = await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send(validPostPayload({ title: 'Live feed post' }));

    const payload = await feedEvent;

    expect(createResponse.status).toBe(201);
    expect(payload.title).toBe('Live feed post');
    viewer.close();
  });

  it('broadcasts comment:created to clients in the post room', async () => {
    const authorToken = await getAuthToken(app);
    const { token: commenterToken } = await getSecondUserToken();

    const postResponse = await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send(validPostPayload());

    const postId = postResponse.body.data.id;

    const viewer = connectClient(port, { auth: { token: authorToken } });
    await waitForConnect(viewer);
    await emitWithAck(viewer, SOCKET_EVENTS.POST_JOIN, { postId });

    const commentEvent = waitForEvent(viewer, SOCKET_EVENTS.COMMENT_CREATED);

    const commentResponse = await request(app)
      .post(`${API}/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${commenterToken}`)
      .send(
        validPostPayload({
          title: 'Live comment',
          content: 'Arrived over the socket',
        }),
      );

    const payload = await commentEvent;

    expect(commentResponse.status).toBe(201);
    expect(payload.title).toBe('Live comment');
    viewer.close();
  });

  it('notifies the post author when someone comments', async () => {
    const authorToken = await getAuthToken(app);
    const { token: commenterToken } = await getSecondUserToken();

    const postResponse = await request(app)
      .post(`${API}/posts`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send(validPostPayload());

    const postId = postResponse.body.data.id;

    const author = connectClient(port, { auth: { token: authorToken } });
    await waitForConnect(author);

    const notification = waitForEvent(author, SOCKET_EVENTS.POST_COMMENTED);

    await request(app)
      .post(`${API}/posts/${postId}/comments`)
      .set('Authorization', `Bearer ${commenterToken}`)
      .send(validPostPayload({ title: 'Ping author' }));

    const payload = await notification;

    expect(payload.postId).toBe(postId);
    expect(payload.comment.title).toBe('Ping author');
    author.close();
  });

  it('emits presence online and offline events', async () => {
    const token = await getAuthToken(app);
    const watcher = connectClient(port, { auth: { token } });
    await waitForConnect(watcher);

    const { token: otherToken, userId: otherUserId } = await getSecondUserToken();
    const other = connectClient(port, { auth: { token: otherToken } });

    const onlinePayload = await new Promise((resolve, reject) => {
      const onOnline = (payload) => {
        if (payload.userId === otherUserId) {
          watcher.off(SOCKET_EVENTS.PRESENCE_ONLINE, onOnline);
          resolve(payload);
        }
      };

      watcher.on(SOCKET_EVENTS.PRESENCE_ONLINE, onOnline);
      waitForConnect(other).catch(reject);
    });

    expect(onlinePayload.userId).toBe(otherUserId);

    const offlinePayload = await new Promise((resolve) => {
      const onOffline = (payload) => {
        if (payload.userId === otherUserId) {
          watcher.off(SOCKET_EVENTS.PRESENCE_OFFLINE, onOffline);
          resolve(payload);
        }
      };

      watcher.on(SOCKET_EVENTS.PRESENCE_OFFLINE, onOffline);
      other.close();
    });

    expect(offlinePayload.userId).toBe(otherUserId);
    watcher.close();
  });

  it('acknowledges presence:heartbeat', async () => {
    const token = await getAuthToken(app);
    const client = connectClient(port, { auth: { token } });
    await waitForConnect(client);

    const response = await emitWithAck(client, SOCKET_EVENTS.PRESENCE_HEARTBEAT);

    expect(response).toMatchObject({
      ok: true,
      userId: expect.any(String),
    });
    client.close();
  });
});
