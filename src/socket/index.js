// ******************************************************
// SOCKET — WebSocket server (Socket.IO on the HTTP server)
// ******************************************************
//
// Initialized from server.js after http.createServer(app).
// Uses the same JWT access tokens and CORS origins as the REST API.
//
// Client example:
//   import { io } from 'socket.io-client';
//   const socket = io('http://localhost:3000', {
//     auth: { token: accessJwt },
//   });
//   socket.on('connected', ({ userId }) => { ... });
//
// Server-side emit to one user (from services later):
//   const { getIo, userRoom } = require('./socket');
//   getIo()?.to(userRoom(userId)).emit('event', payload);

const { Server } = require('socket.io');
const config = require('../config');
const { getCorsOriginOption } = require('../middleware/security.middleware');
const { authenticateSocket } = require('./auth.middleware');
const { registerConnectionHandlers } = require('./connection.handler');

/** @type {import('socket.io').Server | null} */
let io = null;

function initSocket(httpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    path: config.socket.path,
    cors: {
      origin: getCorsOriginOption(config.cors.origins),
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerConnectionHandlers(io, socket);
  });

  return io;
}

function getIo() {
  return io;
}

async function closeSocket() {
  if (!io) {
    return;
  }

  const instance = io;
  io = null;

  // Also closes the attached HTTP server when one was passed to initSocket.
  await new Promise((resolve) => {
    instance.close(() => resolve());
  });
}

module.exports = {
  initSocket,
  getIo,
  closeSocket,
  userRoom: require('./connection.handler').userRoom,
};
