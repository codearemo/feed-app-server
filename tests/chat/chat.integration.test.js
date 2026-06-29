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

async function waitForConnect(client) {
  return new Promise((resolve, reject) => {
    client.once('connect_error', reject);
    client.once('connect', resolve);
    client.connect();
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

async function getSecondUser() {
  await request(app)
    .post(`${API}/auth/register`)
    .send(
      validRegisterPayload({
        username: 'chat-sam',
        email: 'chat-sam@example.com',
        firstName: 'Sam',
        lastName: 'Rivera',
      }),
    );

  await verifyRegisteredUser(app, 'chat-sam@example.com');

  const loginResponse = await request(app)
    .post(`${API}/auth/login`)
    .send({ identifier: 'chat-sam', password: VALID_PASSWORD });

  return {
    token: loginResponse.body.data.token,
    userId: loginResponse.body.data.user.id,
  };
}

describe('Chat API', () => {
  it('starts a conversation, sends messages, and tracks unread counts', async () => {
    const janeToken = await getAuthToken(app);
    const { token: samToken, userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.participant).toMatchObject({
      username: 'chat-sam',
      firstName: 'Sam',
      lastName: 'Rivera',
    });
    expect(createResponse.body.data.unreadCount).toBe(0);

    const conversationId = createResponse.body.data.id;

    const duplicateResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    expect(duplicateResponse.status).toBe(201);
    expect(duplicateResponse.body.data.id).toBe(conversationId);

    const sendResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ content: 'Hey Sam!' });

    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body.data).toMatchObject({
      conversationId,
      content: 'Hey Sam!',
      sender: { name: 'Jane Doe' },
      deliveredToRecipient: false,
      readByRecipient: false,
    });

    const samListResponse = await request(app)
      .get(`${API}/conversations`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(samListResponse.status).toBe(200);
    expect(samListResponse.body.data[0]).toMatchObject({
      id: conversationId,
      unreadCount: 1,
      lastMessage: { content: 'Hey Sam!' },
    });

    const messagesResponse = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.data).toHaveLength(1);
    expect(messagesResponse.body.data[0].content).toBe('Hey Sam!');

    const readResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.data.unreadCount).toBe(0);
  });

  it('tracks read receipts on sent messages', async () => {
    const janeToken = await getAuthToken(app);
    const { token: samToken, userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    const conversationId = createResponse.body.data.id;

    await request(app)
      .post(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ content: 'Did you get this?' });

    const beforeReadResponse = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`);

    expect(beforeReadResponse.status).toBe(200);
    expect(beforeReadResponse.body.data[0]).toMatchObject({
      content: 'Did you get this?',
      deliveredToRecipient: false,
      readByRecipient: false,
    });

    const readResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.data.unreadCount).toBe(0);

    const afterReadResponse = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`);

    expect(afterReadResponse.status).toBe(200);
    expect(afterReadResponse.body.data[0]).toMatchObject({
      deliveredToRecipient: true,
      readByRecipient: true,
    });

    const janeSummaryResponse = await request(app)
      .get(`${API}/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${janeToken}`);

    expect(janeSummaryResponse.status).toBe(200);
    expect(janeSummaryResponse.body.data.participantLastReadAt).toBeTruthy();
    expect(janeSummaryResponse.body.data.lastMessage.readByRecipient).toBe(
      true,
    );

    const samMessagesResponse = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(samMessagesResponse.body.data[0].readByRecipient).toBeUndefined();
    expect(samMessagesResponse.body.data[0].deliveredToRecipient).toBeUndefined();
  });

  it('tracks delivery receipts on sent messages', async () => {
    const janeToken = await getAuthToken(app);
    const { token: samToken, userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    const conversationId = createResponse.body.data.id;

    const sendResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ content: 'Delivery test' });

    const messageId = sendResponse.body.data.id;

    const beforeDeliveredResponse = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`);

    expect(beforeDeliveredResponse.body.data[0]).toMatchObject({
      deliveredToRecipient: false,
      readByRecipient: false,
    });

    const deliveredResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/messages/${messageId}/delivered`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(deliveredResponse.status).toBe(200);
    expect(deliveredResponse.body.data).toMatchObject({
      conversationId,
      messageId,
    });
    expect(deliveredResponse.body.data.deliveredAt).toBeTruthy();
    expect(deliveredResponse.body.data.message.deliveredToRecipient).toBe(true);

    const afterDeliveredResponse = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`);

    expect(afterDeliveredResponse.body.data[0].deliveredToRecipient).toBe(true);
    expect(afterDeliveredResponse.body.data[0].readByRecipient).toBe(false);
  });

  it('rejects messaging yourself', async () => {
    const token = await getAuthToken(app);
    const meResponse = await request(app)
      .get(`${API}/users/me`)
      .set('Authorization', `Bearer ${token}`);

    const response = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: meResponse.body.data.id });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'You cannot start a conversation with yourself',
    );
  });

  it('returns 404 when a non-participant accesses a conversation', async () => {
    const janeToken = await getAuthToken(app);
    const { userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    const conversationId = createResponse.body.data.id;

    await request(app)
      .post(`${API}/auth/register`)
      .send(
        validRegisterPayload({
          username: 'chat-other',
          email: 'chat-other@example.com',
        }),
      );

    await verifyRegisteredUser(app, 'chat-other@example.com');

    const otherLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ identifier: 'chat-other', password: VALID_PASSWORD });

    const response = await request(app)
      .get(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${otherLogin.body.data.token}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Conversation not found');
  });
});

describe('Chat sockets', () => {
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

  it('delivers message:created and message:received over sockets', async () => {
    const janeToken = await getAuthToken(app);
    const { token: samToken, userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    const conversationId = createResponse.body.data.id;

    const samSocket = connectClient(port, { auth: { token: samToken } });
    await waitForConnect(samSocket);
    await emitWithAck(samSocket, SOCKET_EVENTS.CONVERSATION_JOIN, {
      conversationId,
    });

    const roomMessage = new Promise((resolve) => {
      samSocket.on(SOCKET_EVENTS.MESSAGE_CREATED, resolve);
    });
    const notification = new Promise((resolve) => {
      samSocket.on(SOCKET_EVENTS.MESSAGE_RECEIVED, resolve);
    });

    await request(app)
      .post(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ content: 'Realtime hello' });

    const roomPayload = await roomMessage;
    const notifyPayload = await notification;

    expect(roomPayload.content).toBe('Realtime hello');
    expect(notifyPayload.conversationId).toBe(conversationId);
    expect(notifyPayload.message.content).toBe('Realtime hello');

    samSocket.close();
  });

  it('emits message:sent and message:delivered for check marks', async () => {
    const janeToken = await getAuthToken(app);
    const { token: samToken, userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    const conversationId = createResponse.body.data.id;

    const janeSocket = connectClient(port, { auth: { token: janeToken } });
    await waitForConnect(janeSocket);

    const sentEvent = new Promise((resolve) => {
      janeSocket.on(SOCKET_EVENTS.MESSAGE_SENT, resolve);
    });
    const deliveredEvent = new Promise((resolve) => {
      janeSocket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, resolve);
    });

    const sendResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ content: 'Check marks' });

    const messageId = sendResponse.body.data.id;
    const sentPayload = await sentEvent;

    expect(sentPayload).toMatchObject({
      id: messageId,
      content: 'Check marks',
      deliveredToRecipient: false,
    });

    const samSocket = connectClient(port, { auth: { token: samToken } });
    await waitForConnect(samSocket);

    await emitWithAck(samSocket, SOCKET_EVENTS.MESSAGE_DELIVERED, {
      conversationId,
      messageId,
    });

    const deliveredPayload = await deliveredEvent;

    expect(deliveredPayload).toMatchObject({
      conversationId,
      messageId,
    });
    expect(deliveredPayload.deliveredAt).toBeTruthy();
    expect(deliveredPayload.message.deliveredToRecipient).toBe(true);

    janeSocket.close();
    samSocket.close();
  });

  it('emits conversation:read when the other participant marks read', async () => {
    const janeToken = await getAuthToken(app);
    const { token: samToken, userId: samUserId } = await getSecondUser();

    const createResponse = await request(app)
      .post(`${API}/conversations`)
      .set('Authorization', `Bearer ${janeToken}`)
      .send({ participantId: samUserId });

    const conversationId = createResponse.body.data.id;

    const janeSocket = connectClient(port, { auth: { token: janeToken } });
    await waitForConnect(janeSocket);
    await emitWithAck(janeSocket, SOCKET_EVENTS.CONVERSATION_JOIN, {
      conversationId,
    });

    const readEvent = new Promise((resolve) => {
      janeSocket.on(SOCKET_EVENTS.CONVERSATION_READ, resolve);
    });

    const readResponse = await request(app)
      .post(`${API}/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${samToken}`);

    expect(readResponse.status).toBe(200);

    const payload = await readEvent;

    expect(payload).toMatchObject({
      conversationId,
      userId: samUserId,
    });
    expect(payload.readAt).toBeTruthy();

    janeSocket.close();
  });
});
