// ******************************************************
// PRESENCE — track online users across socket connections
// ******************************************************

const { SOCKET_EVENTS } = require('../constants/socket-events');
const { logSocketOut } = require('./logger');

/** @type {Map<string, Set<string>>} */
const onlineSocketsByUser = new Map();

function markOnline(io, userId, socketId) {
  let sockets = onlineSocketsByUser.get(userId);

  if (!sockets) {
    sockets = new Set();
    onlineSocketsByUser.set(userId, sockets);
  }

  const wasOffline = sockets.size === 0;
  sockets.add(socketId);

  if (wasOffline) {
    logSocketOut({
      room: '*',
      event: SOCKET_EVENTS.PRESENCE_ONLINE,
      payload: { userId },
    });
    io.emit(SOCKET_EVENTS.PRESENCE_ONLINE, { userId });
  }
}

function markOffline(io, userId, socketId) {
  const sockets = onlineSocketsByUser.get(userId);

  if (!sockets) {
    return;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineSocketsByUser.delete(userId);
    logSocketOut({
      room: '*',
      event: SOCKET_EVENTS.PRESENCE_OFFLINE,
      payload: { userId },
    });
    io.emit(SOCKET_EVENTS.PRESENCE_OFFLINE, { userId });
  }
}

function getOnlineUserIds() {
  return [...onlineSocketsByUser.keys()];
}

function resetPresence() {
  onlineSocketsByUser.clear();
}

module.exports = {
  markOnline,
  markOffline,
  getOnlineUserIds,
  resetPresence,
};
