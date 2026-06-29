// ******************************************************
// CHAT SOCKET HANDLERS — real-time conversation events
// ******************************************************

const { SOCKET_EVENTS } = require('../constants/socket-events');
const { isMongoObjectId } = require('../modules/files/files.validation');
const chatService = require('../modules/chat/chat.service');
const usersRepository = require('../modules/users/repositories');
const { toPublicAuthor } = require('../modules/posts/posts.utils');
const chatSocket = require('../modules/chat/chat.socket');
const { conversationRoom } = require('./rooms');
const { logSocketIn } = require('./logger');

function registerChatSocketHandlers(socket) {
  const { id: userId } = socket.user;

  socket.on(
    SOCKET_EVENTS.CONVERSATION_JOIN,
    async ({ conversationId }, callback) => {
      if (!isMongoObjectId(conversationId)) {
        const result = { ok: false, message: 'Invalid conversation id' };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.CONVERSATION_JOIN,
          payload: { conversationId },
          result,
        });
        callback?.(result);
        return;
      }

      try {
        await chatService.assertConversationParticipant(userId, conversationId);
        socket.join(conversationRoom(conversationId));
        const result = { ok: true };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.CONVERSATION_JOIN,
          payload: { conversationId },
          result,
        });
        callback?.(result);
      } catch (error) {
        const result = {
          ok: false,
          message:
            error.statusCode === 404 ? 'Conversation not found' : error.message,
        };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.CONVERSATION_JOIN,
          payload: { conversationId },
          result,
        });
        callback?.(result);
      }
    },
  );

  socket.on(
    SOCKET_EVENTS.CONVERSATION_LEAVE,
    ({ conversationId }, callback) => {
      if (!isMongoObjectId(conversationId)) {
        const result = { ok: false, message: 'Invalid conversation id' };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.CONVERSATION_LEAVE,
          payload: { conversationId },
          result,
        });
        callback?.(result);
        return;
      }

      socket.leave(conversationRoom(conversationId));
      const result = { ok: true };
      logSocketIn({
        userId,
        event: SOCKET_EVENTS.CONVERSATION_LEAVE,
        payload: { conversationId },
        result,
      });
      callback?.(result);
    },
  );

  socket.on(
    SOCKET_EVENTS.MESSAGE_TYPING,
    async ({ conversationId }, callback) => {
      if (!isMongoObjectId(conversationId)) {
        callback?.({ ok: false, message: 'Invalid conversation id' });
        return;
      }

      try {
        await chatService.assertConversationParticipant(userId, conversationId);
        const user = await usersRepository.findById(userId);
        const sender = await toPublicAuthor(user);

        chatSocket.emitMessageTyping(conversationId, {
          conversationId,
          user: sender,
        });

        logSocketIn({
          userId,
          event: SOCKET_EVENTS.MESSAGE_TYPING,
          payload: { conversationId },
          result: { ok: true },
        });
        callback?.({ ok: true });
      } catch {
        callback?.({ ok: false, message: 'Conversation not found' });
      }
    },
  );

  socket.on(
    SOCKET_EVENTS.MESSAGE_STOP_TYPING,
    async ({ conversationId }, callback) => {
      if (!isMongoObjectId(conversationId)) {
        callback?.({ ok: false, message: 'Invalid conversation id' });
        return;
      }

      try {
        await chatService.assertConversationParticipant(userId, conversationId);

        chatSocket.emitMessageStopTyping(conversationId, {
          conversationId,
          userId,
        });

        logSocketIn({
          userId,
          event: SOCKET_EVENTS.MESSAGE_STOP_TYPING,
          payload: { conversationId },
          result: { ok: true },
        });
        callback?.({ ok: true });
      } catch {
        callback?.({ ok: false, message: 'Conversation not found' });
      }
    },
  );

  socket.on(
    SOCKET_EVENTS.MESSAGE_DELIVERED,
    async ({ conversationId, messageId }, callback) => {
      if (!isMongoObjectId(conversationId) || !isMongoObjectId(messageId)) {
        const result = {
          ok: false,
          message: 'Invalid conversation or message id',
        };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.MESSAGE_DELIVERED,
          payload: { conversationId, messageId },
          result,
        });
        callback?.(result);
        return;
      }

      try {
        const result = await chatService.markMessageDelivered(
          userId,
          conversationId,
          messageId,
        );

        const response = { ok: true, data: result };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.MESSAGE_DELIVERED,
          payload: { conversationId, messageId },
          result: response,
        });
        callback?.(response);
      } catch (error) {
        const response = {
          ok: false,
          message:
            error.statusCode === 404
              ? 'Message not found'
              : error.message || 'Failed to mark message delivered',
        };
        logSocketIn({
          userId,
          event: SOCKET_EVENTS.MESSAGE_DELIVERED,
          payload: { conversationId, messageId },
          result: response,
        });
        callback?.(response);
      }
    },
  );
}

module.exports = {
  registerChatSocketHandlers,
};
