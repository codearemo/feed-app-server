const mongoose = require('mongoose');

const refreshTokensSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

refreshTokensSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshTokensModel = mongoose.model('RefreshTokens', refreshTokensSchema);

module.exports = RefreshTokensModel;
