// ******************************************************
// MESSAGES REPOSITORY — MongoDB implementation
// ******************************************************

const MessagesModel = require('../models/messages.model.mongo');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

async function create({ conversationId, senderId, content }) {
  const doc = await MessagesModel.create({
    conversationId,
    senderId,
    content,
  });

  return normalize(doc.toObject());
}

async function findLatestByConversationId(conversationId) {
  const doc = await MessagesModel.findOne({ conversationId })
    .sort({ createdAt: -1 })
    .lean();

  return normalize(doc);
}

async function listByConversationId(conversationId, { page, limit }) {
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    MessagesModel.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MessagesModel.countDocuments({ conversationId }),
  ]);

  return {
    items: docs.map(normalize).reverse(),
    total,
  };
}

async function countUnreadForUser(conversationId, userId, lastReadAt) {
  const query = {
    conversationId,
    senderId: { $ne: userId },
  };

  if (lastReadAt) {
    query.createdAt = { $gt: lastReadAt };
  }

  return MessagesModel.countDocuments(query);
}

async function countUnreadByConversationIds(conversationIds, userId, readStateByConversationId) {
  if (!conversationIds.length) {
    return new Map();
  }

  const counts = await Promise.all(
    conversationIds.map(async (conversationId) => {
      const lastReadAt = readStateByConversationId.get(conversationId);
      const count = await countUnreadForUser(conversationId, userId, lastReadAt);
      return [conversationId, count];
    }),
  );

  return new Map(counts);
}

async function findByIdInConversation(messageId, conversationId) {
  const doc = await MessagesModel.findOne({
    _id: messageId,
    conversationId,
  }).lean();

  return normalize(doc);
}

async function markDelivered(messageId, conversationId, deliveredAt = new Date()) {
  const doc = await MessagesModel.findOneAndUpdate(
    {
      _id: messageId,
      conversationId,
      deliveredAt: null,
    },
    { $set: { deliveredAt, updatedAt: deliveredAt } },
    { returnDocument: 'after' },
  ).lean();

  return normalize(doc);
}

async function markUndeliveredFromOthers(conversationId, recipientUserId, deliveredAt = new Date()) {
  const docs = await MessagesModel.find({
    conversationId,
    senderId: { $ne: recipientUserId },
    deliveredAt: null,
  }).lean();

  if (!docs.length) {
    return [];
  }

  await MessagesModel.updateMany(
    {
      conversationId,
      senderId: { $ne: recipientUserId },
      deliveredAt: null,
    },
    { $set: { deliveredAt, updatedAt: deliveredAt } },
  );

  return docs.map((doc) => normalize({ ...doc, deliveredAt, updatedAt: deliveredAt }));
}

module.exports = {
  create,
  findByIdInConversation,
  findLatestByConversationId,
  listByConversationId,
  countUnreadForUser,
  countUnreadByConversationIds,
  markDelivered,
  markUndeliveredFromOthers,
};
