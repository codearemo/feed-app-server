// ******************************************************
// POSTS SOCKET — real-time emits after REST mutations
// ******************************************************

const { SOCKET_EVENTS } = require('../../constants/socket-events');
const { getIo, userRoom, postRoom, feedRoom } = require('../../socket');
const { logSocketOut } = require('../../socket/logger');

function emitIfEnabled(emitFn) {
  const io = getIo();

  if (!io) {
    return;
  }

  emitFn(io);
}

function emitToRoom(room, event, payload) {
  emitIfEnabled((io) => {
    io.to(room).emit(event, payload);
    logSocketOut({ room, event, payload });
  });
}

function notifyUser(userId, event, payload) {
  emitToRoom(userRoom(userId), event, payload);
}

function emitToPostRoom(postId, event, payload) {
  emitToRoom(postRoom(postId), event, payload);
}

function emitToFeed(event, payload) {
  emitToRoom(feedRoom(), event, payload);
}

function emitFeedPostCreated(post) {
  emitToFeed(SOCKET_EVENTS.FEED_POST_CREATED, post);
}

function emitFeedPostUpdated(post) {
  emitToFeed(SOCKET_EVENTS.FEED_POST_UPDATED, post);
  emitToPostRoom(post.id, SOCKET_EVENTS.POST_UPDATED, post);
}

function emitFeedPostDeleted({ id }) {
  const payload = { id };
  emitToFeed(SOCKET_EVENTS.FEED_POST_DELETED, payload);
  emitToPostRoom(id, SOCKET_EVENTS.POST_DELETED, payload);
}

function emitCommentCreated(postId, comment) {
  emitToPostRoom(postId, SOCKET_EVENTS.COMMENT_CREATED, comment);
}

function emitCommentUpdated(postId, comment) {
  emitToPostRoom(postId, SOCKET_EVENTS.COMMENT_UPDATED, comment);
}

function emitCommentDeleted(postId, payload) {
  emitToPostRoom(postId, SOCKET_EVENTS.COMMENT_DELETED, payload);
}

function emitPostLiked(postId, payload) {
  emitToPostRoom(postId, SOCKET_EVENTS.POST_LIKED, payload);
}

function emitPostUnliked(postId, payload) {
  emitToPostRoom(postId, SOCKET_EVENTS.POST_UNLIKED, payload);
}

function emitCommentLiked(postId, payload) {
  emitToPostRoom(postId, SOCKET_EVENTS.COMMENT_LIKED, payload);
}

function emitCommentUnliked(postId, payload) {
  emitToPostRoom(postId, SOCKET_EVENTS.COMMENT_UNLIKED, payload);
}

function notifyPostCommented(authorId, actorId, payload) {
  if (String(authorId) === String(actorId)) {
    return;
  }

  notifyUser(authorId, SOCKET_EVENTS.POST_COMMENTED, payload);
}

function notifyPostLiked(authorId, actorId, payload) {
  if (String(authorId) === String(actorId)) {
    return;
  }

  notifyUser(authorId, SOCKET_EVENTS.POST_LIKED, payload);
}

function notifyCommentLiked(authorId, actorId, payload) {
  if (String(authorId) === String(actorId)) {
    return;
  }

  notifyUser(authorId, SOCKET_EVENTS.COMMENT_LIKED, payload);
}

module.exports = {
  emitFeedPostCreated,
  emitFeedPostUpdated,
  emitFeedPostDeleted,
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
  emitPostLiked,
  emitPostUnliked,
  emitCommentLiked,
  emitCommentUnliked,
  notifyPostCommented,
  notifyPostLiked,
  notifyCommentLiked,
};
