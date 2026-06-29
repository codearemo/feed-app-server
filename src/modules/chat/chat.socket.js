// ******************************************************
// CHAT SOCKET — real-time chat emits
// ******************************************************

const { SOCKET_EVENTS } = require('../../constants/socket-events');
const { conversationRoom, userRoom } = require('../../socket/rooms');
const { logSocketOut } = require('../../socket/logger');

function getIo() {
  return require('../../socket').getIo();
}

function emitToRoom(room, event, payload) {
  const io = getIo();

  if (!io) {
    return;
  }

  io.to(room).emit(event, payload);
  logSocketOut({ room, event, payload });
}

function emitMessageCreated(conversationId, message) {
  emitToRoom(
    conversationRoom(conversationId),
    SOCKET_EVENTS.MESSAGE_CREATED,
    message,
  );
}

function notifyMessageReceived(recipientId, payload) {
  emitToRoom(userRoom(recipientId), SOCKET_EVENTS.MESSAGE_RECEIVED, payload);
}

function notifyMessageSent(senderId, message) {
  emitToRoom(userRoom(senderId), SOCKET_EVENTS.MESSAGE_SENT, message);
}

function notifyMessageDelivered(senderId, payload) {
  emitToRoom(userRoom(senderId), SOCKET_EVENTS.MESSAGE_DELIVERED, payload);
}

function emitMessageDelivered(conversationId, payload) {
  emitToRoom(
    conversationRoom(conversationId),
    SOCKET_EVENTS.MESSAGE_DELIVERED,
    payload,
  );
}

function emitMessageTyping(conversationId, payload) {
  emitToRoom(
    conversationRoom(conversationId),
    SOCKET_EVENTS.MESSAGE_TYPING,
    payload,
  );
}

function emitMessageStopTyping(conversationId, payload) {
  emitToRoom(
    conversationRoom(conversationId),
    SOCKET_EVENTS.MESSAGE_STOP_TYPING,
    payload,
  );
}

function emitConversationRead(conversationId, payload) {
  emitToRoom(
    conversationRoom(conversationId),
    SOCKET_EVENTS.CONVERSATION_READ,
    payload,
  );
}

function notifyConversationRead(recipientId, payload) {
  emitToRoom(userRoom(recipientId), SOCKET_EVENTS.CONVERSATION_READ, payload);
}

module.exports = {
  emitMessageCreated,
  notifyMessageReceived,
  notifyMessageSent,
  notifyMessageDelivered,
  emitMessageDelivered,
  emitMessageTyping,
  emitMessageStopTyping,
  emitConversationRead,
  notifyConversationRead,
};
