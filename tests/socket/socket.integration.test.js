const http = require('http');
const { io } = require('socket.io-client');
const app = require('../../src/app');
const config = require('../../src/config');
const { initSocket, closeSocket } = require('../../src/socket');
const { getAuthToken } = require('../helpers');

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
      client.on('connected', resolve);
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
});
