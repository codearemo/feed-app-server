// ******************************************************
// CONVERSATION READ STATE — MongoDB implementation
// ******************************************************

const ConversationReadStateModel = require('../models/conversation-read-state.model.mongo');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

async function findByConversationAndUser(conversationId, userId) {
  const doc = await ConversationReadStateModel.findOne({
    conversationId,
    userId,
  }).lean();

  return normalize(doc);
}

async function findByConversationsAndUser(conversationIds, userId) {
  if (!conversationIds.length) {
    return [];
  }

  const docs = await ConversationReadStateModel.find({
    conversationId: { $in: conversationIds },
    userId,
  }).lean();

  return docs.map(normalize);
}

async function upsertReadState(
  conversationId,
  userId,
  lastReadAt = new Date(),
) {
  const doc = await ConversationReadStateModel.findOneAndUpdate(
    { conversationId, userId },
    { lastReadAt, updatedAt: new Date() },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  return normalize(doc);
}

module.exports = {
  findByConversationAndUser,
  findByConversationsAndUser,
  upsertReadState,
};
