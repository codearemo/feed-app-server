// ******************************************************
// CHAT SERVICE — conversations and direct messages
// ******************************************************

const { buildPagination } = require('../../utils/api-response');
const { getEntityId } = require('../../utils/entity-id');
const { mapMongoDuplicateKeyError } = require('../../utils/mongo-errors');
const usersRepository = require('../users/repositories');
const { validateUserId } = require('../users/users.validation');
const chatRepositories = require('./repositories');
const chatSocket = require('./chat.socket');
const {
  buildSendersMap,
  buildParticipantsMap,
  buildParticipantLastReadAtMap,
  getOtherParticipantId,
  toPublicConversationSummary,
  toPublicMessages,
} = require('./chat.utils');
const {
  validateConversationId,
  validateCreateConversation,
  validateListConversationsQuery,
  validateListMessagesQuery,
  validateMessageId,
  validateSendMessage,
} = require('./chat.validation');

const { conversations, messages, readState } = chatRepositories;

async function assertActiveParticipant(userId, participantId) {
  validateUserId(participantId);

  if (String(userId) === String(participantId)) {
    const error = new Error('You cannot start a conversation with yourself');
    error.statusCode = 400;
    throw error;
  }

  const participant = await usersRepository.findById(participantId);

  if (!participant || participant.status !== 'active') {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return participant;
}

async function getConversationForUser(userId, conversationId) {
  validateConversationId(conversationId);

  const conversation = await conversations.findById(conversationId);

  if (
    !conversation ||
    !conversation.participantIds.map(String).includes(String(userId))
  ) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  return conversation;
}

async function findOrCreateConversation(userId, participantId) {
  await assertActiveParticipant(userId, participantId);

  const existing = await conversations.findByParticipantIds(
    userId,
    participantId,
  );

  if (existing) {
    return existing;
  }

  try {
    return await conversations.create(userId, participantId);
  } catch (error) {
    const mapped = mapMongoDuplicateKeyError(error);

    if (mapped.statusCode === 409) {
      const conversation = await conversations.findByParticipantIds(
        userId,
        participantId,
      );

      if (conversation) {
        return conversation;
      }
    }

    throw mapped;
  }
}

async function getRecipientLastReadAt(conversation, viewerUserId) {
  const conversationId = getEntityId(conversation);
  const otherParticipantId = getOtherParticipantId(conversation, viewerUserId);
  const state = await readState.findByConversationAndUser(
    conversationId,
    otherParticipantId,
  );

  return state?.lastReadAt ?? null;
}

async function hydrateDeliveredMessage(record, senderId, recipientLastReadAt) {
  const sendersById = await buildSendersMap([senderId], usersRepository);
  const [message] = await toPublicMessages([record], sendersById, {
    viewerUserId: senderId,
    recipientLastReadAt,
  });

  return message;
}

async function emitDeliveredUpdates(conversation, deliveredRecords) {
  if (!deliveredRecords.length) {
    return;
  }

  const conversationId = getEntityId(conversation);

  await Promise.all(
    deliveredRecords.map(async (record) => {
      const senderId = String(record.senderId);
      const recipientLastReadAt = await getRecipientLastReadAt(
        conversation,
        senderId,
      );
      const message = await hydrateDeliveredMessage(
        record,
        senderId,
        recipientLastReadAt,
      );
      const payload = {
        conversationId,
        messageId: getEntityId(record),
        deliveredAt: record.deliveredAt,
        message,
      };

      chatSocket.emitMessageDelivered(conversationId, payload);
      chatSocket.notifyMessageDelivered(senderId, payload);
    }),
  );
}

async function markMessageDelivered(userId, conversationId, messageId) {
  const conversation = await getConversationForUser(userId, conversationId);
  validateMessageId(messageId);

  const existing = await messages.findByIdInConversation(
    messageId,
    conversationId,
  );

  if (!existing) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(existing.senderId) === String(userId)) {
    const error = new Error('You cannot mark your own message as delivered');
    error.statusCode = 400;
    throw error;
  }

  if (existing.deliveredAt) {
    const message = await hydrateDeliveredMessage(
      existing,
      existing.senderId,
      await getRecipientLastReadAt(conversation, existing.senderId),
    );

    return {
      conversationId,
      messageId: getEntityId(existing),
      deliveredAt: existing.deliveredAt,
      message,
    };
  }

  const record = await messages.markDelivered(messageId, conversationId);

  if (!record) {
    const refreshed = await messages.findByIdInConversation(
      messageId,
      conversationId,
    );
    const message = await hydrateDeliveredMessage(
      refreshed,
      refreshed.senderId,
      await getRecipientLastReadAt(conversation, refreshed.senderId),
    );

    return {
      conversationId,
      messageId: getEntityId(refreshed),
      deliveredAt: refreshed.deliveredAt,
      message,
    };
  }

  const payload = {
    conversationId,
    messageId: getEntityId(record),
    deliveredAt: record.deliveredAt,
    message: await hydrateDeliveredMessage(
      record,
      record.senderId,
      await getRecipientLastReadAt(conversation, record.senderId),
    ),
  };

  chatSocket.emitMessageDelivered(conversationId, payload);
  chatSocket.notifyMessageDelivered(String(record.senderId), payload);

  return payload;
}

async function deliverPendingMessages(userId, conversationId) {
  const conversation = await getConversationForUser(userId, conversationId);
  const deliveredRecords = await messages.markUndeliveredFromOthers(
    conversationId,
    userId,
  );

  await emitDeliveredUpdates(conversation, deliveredRecords);

  return deliveredRecords.length;
}

async function hydrateConversationSummary(conversation, viewerUserId) {
  const conversationId = getEntityId(conversation);
  const otherParticipantId = getOtherParticipantId(conversation, viewerUserId);
  const participantsById = await buildParticipantsMap(
    [otherParticipantId],
    usersRepository,
  );

  const lastMessageRecord =
    await messages.findLatestByConversationId(conversationId);
  const senderIds = lastMessageRecord
    ? [String(lastMessageRecord.senderId)]
    : [];
  const sendersById = await buildSendersMap(senderIds, usersRepository);

  const participantLastReadAtByConversationId =
    await buildParticipantLastReadAtMap([conversation], viewerUserId, readState);

  const readStateRecord = await readState.findByConversationAndUser(
    conversationId,
    viewerUserId,
  );
  const unreadCount = await messages.countUnreadForUser(
    conversationId,
    viewerUserId,
    readStateRecord?.lastReadAt,
  );

  return toPublicConversationSummary(conversation, {
    viewerUserId,
    participantsById,
    sendersById,
    lastMessagesByConversationId: new Map(
      lastMessageRecord ? [[conversationId, lastMessageRecord]] : [],
    ),
    unreadCountsByConversationId: new Map([[conversationId, unreadCount]]),
    participantLastReadAtByConversationId,
  });
}

async function listConversations(userId, query) {
  const { page, limit } = validateListConversationsQuery(query);
  const { items, total } = await conversations.listForUser(userId, {
    page,
    limit,
  });

  const conversationIds = items.map((item) => getEntityId(item));
  const otherParticipantIds = items.map((item) =>
    getOtherParticipantId(item, userId),
  );

  const participantsById = await buildParticipantsMap(
    [...new Set(otherParticipantIds)],
    usersRepository,
  );

  const readStates = await readState.findByConversationsAndUser(
    conversationIds,
    userId,
  );
  const readStateByConversationId = new Map(
    readStates.map((state) => [
      String(state.conversationId),
      state.lastReadAt,
    ]),
  );

  const unreadCountsByConversationId =
    await messages.countUnreadByConversationIds(
      conversationIds,
      userId,
      readStateByConversationId,
    );

  const lastMessages = await Promise.all(
    conversationIds.map((conversationId) =>
      messages.findLatestByConversationId(conversationId),
    ),
  );
  const lastMessagesByConversationId = new Map(
    lastMessages
      .filter(Boolean)
      .map((message) => [String(message.conversationId), message]),
  );

  const senderIds = [
    ...new Set(
      lastMessages.filter(Boolean).map((message) => String(message.senderId)),
    ),
  ];
  const sendersById = await buildSendersMap(senderIds, usersRepository);

  const participantLastReadAtByConversationId =
    await buildParticipantLastReadAtMap(items, userId, readState);

  const data = await Promise.all(
    items.map((conversation) =>
      toPublicConversationSummary(conversation, {
        viewerUserId: userId,
        participantsById,
        sendersById,
        lastMessagesByConversationId,
        unreadCountsByConversationId,
        participantLastReadAtByConversationId,
      }),
    ),
  );

  return {
    data,
    pagination: buildPagination({ page, limit, total }),
  };
}

async function createConversation(userId, body) {
  const { participantId } = validateCreateConversation(body);
  const conversation = await findOrCreateConversation(userId, participantId);
  const summary = await hydrateConversationSummary(conversation, userId);

  return summary;
}

async function getConversation(userId, conversationId) {
  const conversation = await getConversationForUser(userId, conversationId);
  return hydrateConversationSummary(conversation, userId);
}

async function listMessages(userId, conversationId, query) {
  const conversation = await getConversationForUser(userId, conversationId);
  const { page, limit } = validateListMessagesQuery(query);

  const { items, total } = await messages.listByConversationId(
    conversationId,
    { page, limit },
  );

  const senderIds = [...new Set(items.map((item) => String(item.senderId)))];
  const sendersById = await buildSendersMap(senderIds, usersRepository);
  const recipientLastReadAt = await getRecipientLastReadAt(
    conversation,
    userId,
  );

  const data = await toPublicMessages(items, sendersById, {
    viewerUserId: userId,
    recipientLastReadAt,
  });

  return {
    data,
    pagination: buildPagination({ page, limit, total }),
  };
}

async function sendMessage(userId, conversationId, body) {
  await getConversationForUser(userId, conversationId);
  const { content } = validateSendMessage(body);

  const record = await messages.create({
    conversationId,
    senderId: userId,
    content,
  });

  await conversations.touchLastMessageAt(conversationId, record.createdAt);

  const sendersById = await buildSendersMap([userId], usersRepository);
  const [message] = await toPublicMessages([record], sendersById, {
    viewerUserId: userId,
    recipientLastReadAt: null,
  });

  chatSocket.emitMessageCreated(conversationId, message);
  chatSocket.notifyMessageSent(userId, message);

  const conversation = await conversations.findById(conversationId);
  const recipientId = getOtherParticipantId(conversation, userId);

  chatSocket.notifyMessageReceived(recipientId, {
    conversationId,
    message,
  });

  return message;
}

async function markConversationRead(userId, conversationId) {
  await getConversationForUser(userId, conversationId);
  await deliverPendingMessages(userId, conversationId);

  const readStateRecord = await readState.upsertReadState(
    conversationId,
    userId,
  );
  const readAt = readStateRecord.lastReadAt;

  const conversation = await conversations.findById(conversationId);
  const otherParticipantId = getOtherParticipantId(conversation, userId);
  const payload = { conversationId, userId, readAt };

  chatSocket.emitConversationRead(conversationId, payload);
  chatSocket.notifyConversationRead(otherParticipantId, payload);

  return hydrateConversationSummary(conversation, userId);
}

async function assertConversationParticipant(userId, conversationId) {
  return getConversationForUser(userId, conversationId);
}

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  listMessages,
  sendMessage,
  markMessageDelivered,
  markConversationRead,
  assertConversationParticipant,
};
