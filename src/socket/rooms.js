// ******************************************************
// SOCKET ROOMS — channel names for targeted emits
// ******************************************************

function userRoom(userId) {
  return `user:${userId}`;
}

function postRoom(postId) {
  return `post:${postId}`;
}

function feedRoom() {
  return 'feed';
}

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

module.exports = {
  userRoom,
  postRoom,
  feedRoom,
  conversationRoom,
};
