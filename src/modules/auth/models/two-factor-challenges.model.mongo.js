const mongoose = require('mongoose');
const {
  TWO_FACTOR_CHALLENGE_PURPOSE_VALUES,
} = require('../../../constants/two-factor');

const twoFactorChallengesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  purpose: {
    type: String,
    enum: TWO_FACTOR_CHALLENGE_PURPOSE_VALUES,
    required: true,
  },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

twoFactorChallengesSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TwoFactorChallengesModel = mongoose.model(
  'TwoFactorChallenges',
  twoFactorChallengesSchema,
);

module.exports = TwoFactorChallengesModel;
