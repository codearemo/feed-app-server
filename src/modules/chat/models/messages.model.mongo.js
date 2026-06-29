const mongoose = require('mongoose');

const messagesSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversations',
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  content: { type: String, required: true, trim: true },
  deliveredAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

messagesSchema.index({ conversationId: 1, createdAt: -1 });

const MessagesModel = mongoose.model('Messages', messagesSchema);

module.exports = MessagesModel;
