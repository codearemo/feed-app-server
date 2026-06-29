// ******************************************************
// CONVERSATIONS REPOSITORY — MongoDB implementation
// ******************************************************

const mongoose = require('mongoose');
const ConversationsModel = require('../models/conversations.model.mongo');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

function sortParticipantIds(userIdA, userIdB) {
  return [String(userIdA), String(userIdB)]
    .sort()
    .map((id) => new mongoose.Types.ObjectId(id));
}

async function findByParticipantIds(userIdA, userIdB) {
  const participantIds = sortParticipantIds(userIdA, userIdB);
  const doc = await ConversationsModel.findOne({ participantIds }).lean();
  return normalize(doc);
}

async function create(userIdA, userIdB) {
  const participantIds = sortParticipantIds(userIdA, userIdB);
  const doc = await ConversationsModel.create({ participantIds });
  return normalize(doc.toObject());
}

async function findById(id) {
  const doc = await ConversationsModel.findById(id).lean();
  return normalize(doc);
}

async function listForUser(userId, { page, limit }) {
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ConversationsModel.find({ participantIds: userId })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ConversationsModel.countDocuments({ participantIds: userId }),
  ]);

  return {
    items: docs.map(normalize),
    total,
  };
}

async function touchLastMessageAt(conversationId, date = new Date()) {
  const doc = await ConversationsModel.findByIdAndUpdate(
    conversationId,
    { lastMessageAt: date, updatedAt: date },
    { returnDocument: 'after' },
  ).lean();

  return normalize(doc);
}

module.exports = {
  sortParticipantIds,
  findByParticipantIds,
  create,
  findById,
  listForUser,
  touchLastMessageAt,
};
