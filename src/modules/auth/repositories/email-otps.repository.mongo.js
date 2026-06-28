// ******************************************************
// EMAIL OTPS REPOSITORY — MongoDB implementation
// ******************************************************

const EmailOtpsModel = require('../models/email-otps.model.mongo');
const { normalizeEmail } = require('../../../utils/normalize-email');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

async function upsert(email, purpose, otpHash, expiresAt) {
  const normalizedEmail = normalizeEmail(email);

  return normalize(
    await EmailOtpsModel.findOneAndUpdate(
      { email: normalizedEmail, purpose },
      {
        email: normalizedEmail,
        purpose,
        otpHash,
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
      },
      { upsert: true, returnDocument: 'after', lean: true },
    ),
  );
}

async function findValid(email, purpose) {
  return normalize(
    await EmailOtpsModel.findOne({
      email: normalizeEmail(email),
      purpose,
      expiresAt: { $gt: new Date() },
    }).lean(),
  );
}

async function incrementAttempts(id) {
  return normalize(
    await EmailOtpsModel.findByIdAndUpdate(
      id,
      { $inc: { attempts: 1 } },
      { returnDocument: 'after', lean: true },
    ),
  );
}

async function deleteByEmailAndPurpose(email, purpose) {
  await EmailOtpsModel.deleteOne({
    email: normalizeEmail(email),
    purpose,
  });
}

module.exports = {
  upsert,
  findValid,
  incrementAttempts,
  deleteByEmailAndPurpose,
};
