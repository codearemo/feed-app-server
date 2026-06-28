// ******************************************************
// SOCKET EVENTS — names shared by server and clients
// ******************************************************

const SOCKET_EVENTS = {
  CONNECTED: 'connected',

  POST_JOIN: 'post:join',
  POST_LEAVE: 'post:leave',
  FEED_JOIN: 'feed:join',
  FEED_LEAVE: 'feed:leave',
  PRESENCE_HEARTBEAT: 'presence:heartbeat',

  FEED_POST_CREATED: 'feed:post_created',
  FEED_POST_UPDATED: 'feed:post_updated',
  FEED_POST_DELETED: 'feed:post_deleted',

  POST_UPDATED: 'post:updated',
  POST_DELETED: 'post:deleted',
  POST_LIKED: 'post:liked',
  POST_UNLIKED: 'post:unliked',

  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  COMMENT_LIKED: 'comment:liked',
  COMMENT_UNLIKED: 'comment:unliked',

  POST_COMMENTED: 'post:commented',

  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
};

module.exports = {
  SOCKET_EVENTS,
};
