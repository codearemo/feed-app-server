const mongoose = require('mongoose');

const conversationsSchema = new mongoose.Schema({
  participantIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    required: true,
    validate: {
      validator: (value) => Array.isArray(value) && value.length === 2,
      message: 'Conversation must have exactly two participants',
    },
  },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationsSchema.index({ participantIds: 1 }, { unique: true });
conversationsSchema.index({ participantIds: 1, lastMessageAt: -1 });

const ConversationsModel = mongoose.model('Conversations', conversationsSchema);

module.exports = ConversationsModel;
