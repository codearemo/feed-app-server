// ******************************************************
// TWO-FACTOR SETUPS REPOSITORY — MongoDB implementation
// ******************************************************

const TwoFactorSetupsModel = require('../models/two-factor-setups.model.mongo');
const {
  getTwoFactorSetupExpiresAt,
} = require('../../../utils/two-factor-challenge');

async function upsert(userId, encryptedSecret) {
  const expiresAt = getTwoFactorSetupExpiresAt();

  return TwoFactorSetupsModel.findOneAndUpdate(
    { userId },
    {
      userId,
      encryptedSecret,
      expiresAt,
      createdAt: new Date(),
    },
    { upsert: true, returnDocument: 'after', lean: true },
  );
}

async function findValidByUserId(userId) {
  return TwoFactorSetupsModel.findOne({
    userId,
    expiresAt: { $gt: new Date() },
  }).lean();
}

async function deleteByUserId(userId) {
  await TwoFactorSetupsModel.deleteOne({ userId });
}

module.exports = {
  upsert,
  findValidByUserId,
  deleteByUserId,
};
