// ******************************************************
// SOCKET CONNECTION — per-client setup after auth
// ******************************************************

const { SOCKET_EVENTS } = require('../constants/socket-events');
const { isMongoObjectId } = require('../modules/files/files.validation');
const postsRepository = require('../modules/posts/repositories');
const { feedRoom, postRoom, userRoom } = require('./rooms');
const { markOnline, markOffline } = require('./presence');
const {
  logSocketConnect,
  logSocketDisconnect,
  logSocketIn,
  logSocketOut,
} = require('./logger');

function registerConnectionHandlers(io, socket) {
  const { id: userId } = socket.user;

  socket.join(userRoom(userId));
  markOnline(io, userId, socket.id);

  logSocketConnect({ userId, socketId: socket.id });
  logSocketOut({
    room: `socket:${socket.id}`,
    event: SOCKET_EVENTS.CONNECTED,
    payload: { userId },
  });
  socket.emit(SOCKET_EVENTS.CONNECTED, { userId });

  socket.on(SOCKET_EVENTS.FEED_JOIN, (callback) => {
    socket.join(feedRoom());
    const result = { ok: true };
    logSocketIn({
      userId,
      event: SOCKET_EVENTS.FEED_JOIN,
      result,
    });
    callback?.(result);
  });

  socket.on(SOCKET_EVENTS.FEED_LEAVE, (callback) => {
    socket.leave(feedRoom());
    const result = { ok: true };
    logSocketIn({
      userId,
      event: SOCKET_EVENTS.FEED_LEAVE,
      result,
    });
    callback?.(result);
  });

  socket.on(SOCKET_EVENTS.POST_JOIN, async ({ postId }, callback) => {
    if (!isMongoObjectId(postId)) {
      const result = { ok: false, message: 'Invalid post id' };
      logSocketIn({
        userId,
        socketId: socket.id,
        event: SOCKET_EVENTS.POST_JOIN,
        payload: { postId },
        result,
      });
      callback?.(result);
      return;
    }

    const post = await postsRepository.findActiveTopLevelById(postId);

    if (!post) {
      const result = { ok: false, message: 'Post not found' };
      logSocketIn({
        userId,
        socketId: socket.id,
        event: SOCKET_EVENTS.POST_JOIN,
        payload: { postId },
        result,
      });
      callback?.(result);
      return;
    }

    socket.join(postRoom(postId));
    const result = { ok: true };
    logSocketIn({
      userId,
      event: SOCKET_EVENTS.POST_JOIN,
      payload: { postId },
      result,
    });
    callback?.(result);
  });

  socket.on(SOCKET_EVENTS.POST_LEAVE, ({ postId }, callback) => {
    if (!isMongoObjectId(postId)) {
      const result = { ok: false, message: 'Invalid post id' };
      logSocketIn({
        userId,
        socketId: socket.id,
        event: SOCKET_EVENTS.POST_LEAVE,
        payload: { postId },
        result,
      });
      callback?.(result);
      return;
    }

    socket.leave(postRoom(postId));
    const result = { ok: true };
    logSocketIn({
      userId,
      event: SOCKET_EVENTS.POST_LEAVE,
      payload: { postId },
      result,
    });
    callback?.(result);
  });

  socket.on(SOCKET_EVENTS.PRESENCE_HEARTBEAT, (callback) => {
    const result = { ok: true, userId };
    logSocketIn({
      userId,
      event: SOCKET_EVENTS.PRESENCE_HEARTBEAT,
      result,
    });
    callback?.(result);
  });

  socket.on('disconnect', () => {
    logSocketDisconnect({ userId, socketId: socket.id });
    markOffline(io, userId, socket.id);
    socket.leave(userRoom(userId));
  });
}

module.exports = {
  registerConnectionHandlers,
};
