const mongoose = require('mongoose');

const conversationReadStateSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversations',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  lastReadAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationReadStateSchema.index(
  { conversationId: 1, userId: 1 },
  { unique: true },
);

const ConversationReadStateModel = mongoose.model(
  'ConversationReadStates',
  conversationReadStateSchema,
);

module.exports = ConversationReadStateModel;
