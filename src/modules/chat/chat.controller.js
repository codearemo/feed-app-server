const chatService = require('./chat.service');
const { sendSuccess } = require('../../utils/api-response');

async function listConversations(req, res, next) {
  try {
    const result = await chatService.listConversations(req.user.id, req.query);

    sendSuccess(res, {
      message: 'Conversations fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function createConversation(req, res, next) {
  try {
    const conversation = await chatService.createConversation(
      req.user.id,
      req.body,
    );

    sendSuccess(res, {
      statusCode: 201,
      message: 'Conversation ready',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const conversation = await chatService.getConversation(
      req.user.id,
      req.params.conversationId,
    );

    sendSuccess(res, {
      message: 'Conversation fetched successfully',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const result = await chatService.listMessages(
      req.user.id,
      req.params.conversationId,
      req.query,
    );

    sendSuccess(res, {
      message: 'Messages fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const message = await chatService.sendMessage(
      req.user.id,
      req.params.conversationId,
      req.body,
    );

    sendSuccess(res, {
      statusCode: 201,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

async function markConversationRead(req, res, next) {
  try {
    const conversation = await chatService.markConversationRead(
      req.user.id,
      req.params.conversationId,
    );

    sendSuccess(res, {
      message: 'Conversation marked as read',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

async function markMessageDelivered(req, res, next) {
  try {
    const result = await chatService.markMessageDelivered(
      req.user.id,
      req.params.conversationId,
      req.params.messageId,
    );

    sendSuccess(res, {
      message: 'Message marked as delivered',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  listMessages,
  sendMessage,
  markMessageDelivered,
  markConversationRead,
};
