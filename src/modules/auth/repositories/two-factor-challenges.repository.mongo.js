// ******************************************************
// TWO-FACTOR CHALLENGES REPOSITORY — MongoDB implementation
// ******************************************************

const TwoFactorChallengesModel = require('../models/two-factor-challenges.model.mongo');
const {
  generateTwoFactorChallengeToken,
  hashTwoFactorChallengeToken,
  getTwoFactorChallengeExpiresAt,
} = require('../../../utils/two-factor-challenge');
const {
  TWO_FACTOR_CHALLENGE_PURPOSES,
} = require('../../../constants/two-factor');

async function createForUser(
  userId,
  purpose = TWO_FACTOR_CHALLENGE_PURPOSES.LOGIN,
) {
  const rawToken = generateTwoFactorChallengeToken();
  const tokenHash = hashTwoFactorChallengeToken(rawToken);
  const expiresAt = getTwoFactorChallengeExpiresAt();

  await TwoFactorChallengesModel.create({
    userId,
    tokenHash,
    purpose,
    expiresAt,
  });

  return rawToken;
}

async function consumeValidByRawToken(rawToken, purpose) {
  const tokenHash = hashTwoFactorChallengeToken(rawToken);

  return TwoFactorChallengesModel.findOneAndDelete({
    tokenHash,
    purpose,
    expiresAt: { $gt: new Date() },
  }).lean();
}

module.exports = {
  createForUser,
  consumeValidByRawToken,
};
