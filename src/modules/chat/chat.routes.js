const express = require('express');
const authenticate = require('../../middleware/authenticate.middleware');
const { chatLimiter } = require('../../middleware/rate-limit.middleware');
const chatController = require('./chat.controller');

const router = express.Router();

router.get('/', authenticate, chatController.listConversations);
router.post('/', authenticate, chatLimiter, chatController.createConversation);

router.get('/:conversationId', authenticate, chatController.getConversation);
router.post(
  '/:conversationId/read',
  authenticate,
  chatController.markConversationRead,
);

router.post(
  '/:conversationId/messages/:messageId/delivered',
  authenticate,
  chatController.markMessageDelivered,
);
router.get(
  '/:conversationId/messages',
  authenticate,
  chatController.listMessages,
);
router.post(
  '/:conversationId/messages',
  authenticate,
  chatLimiter,
  chatController.sendMessage,
);

module.exports = router;
