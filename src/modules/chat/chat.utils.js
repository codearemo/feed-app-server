// ******************************************************
// CHAT UTILS — API shapes for conversations and messages
// ******************************************************

const { getEntityId } = require('../../utils/entity-id');
const { toPublicAuthor } = require('../posts/posts.utils');
const { toPublicProfileView } = require('../users/users.utils');

function getOtherParticipantId(conversation, userId) {
  const participantIds = conversation.participantIds.map(String);
  return participantIds.find((id) => id !== String(userId));
}

function isMessageReadByRecipient(record, recipientLastReadAt) {
  if (!recipientLastReadAt) {
    return false;
  }

  return new Date(record.createdAt) <= new Date(recipientLastReadAt);
}

function isMessageDeliveredToRecipient(record) {
  return Boolean(record.deliveredAt);
}

async function toPublicMessage(record, sendersById, options = {}) {
  const { viewerUserId, recipientLastReadAt } = options;
  const senderId = String(record.senderId);

  const message = {
    id: getEntityId(record),
    conversationId: String(record.conversationId),
    sender: sendersById.get(senderId) ?? null,
    content: record.content,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  if (
    viewerUserId !== undefined &&
    String(record.senderId) === String(viewerUserId)
  ) {
    message.deliveredToRecipient = isMessageDeliveredToRecipient(record);
    message.readByRecipient = isMessageReadByRecipient(
      record,
      recipientLastReadAt,
    );
  }

  return message;
}

async function toPublicMessages(records, sendersById, options = {}) {
  return Promise.all(
    records.map((record) => toPublicMessage(record, sendersById, options)),
  );
}

async function toPublicConversationSummary(conversation, context) {
  const {
    viewerUserId,
    participantsById,
    sendersById,
    lastMessagesByConversationId,
    unreadCountsByConversationId,
    participantLastReadAtByConversationId,
  } = context;

  const otherParticipantId = getOtherParticipantId(conversation, viewerUserId);
  const conversationId = getEntityId(conversation);
  const lastMessageRecord = lastMessagesByConversationId.get(conversationId);
  const recipientLastReadAt =
    participantLastReadAtByConversationId?.get(conversationId) ?? null;

  let lastMessage = null;

  if (lastMessageRecord) {
    const [hydrated] = await toPublicMessages(
      [lastMessageRecord],
      sendersById,
      { viewerUserId, recipientLastReadAt },
    );
    lastMessage = hydrated;
  }

  return {
    id: conversationId,
    participant: participantsById.get(otherParticipantId) ?? null,
    participantLastReadAt: recipientLastReadAt,
    lastMessage,
    unreadCount: unreadCountsByConversationId.get(conversationId) ?? 0,
    updatedAt: conversation.lastMessageAt ?? conversation.updatedAt,
  };
}

async function buildParticipantsMap(userIds, usersRepository) {
  const users = await usersRepository.findByIds(userIds);
  const entries = await Promise.all(
    users.map(async (user) => [
      String(getEntityId(user)),
      await toPublicProfileView(user),
    ]),
  );

  return new Map(entries);
}

async function buildSendersMap(userIds, usersRepository) {
  const users = await usersRepository.findByIds(userIds);
  const entries = await Promise.all(
    users.map(async (user) => [
      String(getEntityId(user)),
      await toPublicAuthor(user),
    ]),
  );

  return new Map(entries);
}

async function buildParticipantLastReadAtMap(
  conversations,
  viewerUserId,
  readStateRepository,
) {
  const entries = await Promise.all(
    conversations.map(async (conversation) => {
      const conversationId = getEntityId(conversation);
      const otherParticipantId = getOtherParticipantId(
        conversation,
        viewerUserId,
      );
      const state = await readStateRepository.findByConversationAndUser(
        conversationId,
        otherParticipantId,
      );

      return [conversationId, state?.lastReadAt ?? null];
    }),
  );

  return new Map(entries);
}

module.exports = {
  getOtherParticipantId,
  isMessageReadByRecipient,
  isMessageDeliveredToRecipient,
  toPublicMessage,
  toPublicMessages,
  toPublicConversationSummary,
  buildParticipantsMap,
  buildSendersMap,
  buildParticipantLastReadAtMap,
};
