// ******************************************************
// USERS REPOSITORY — MongoDB implementation
// ******************************************************

const UsersModel = require('../models/users.model.mongo');
const { toPlainObject } = require('../users.utils');
const { normalizeEmail } = require('../../../utils/normalize-email');
const { withEntityId } = require('../../../utils/entity-id');

function normalize(doc) {
  return withEntityId(doc);
}

async function create(payload) {
  const doc = await UsersModel.create(payload);
  return toPlainObject(doc);
}

async function findById(id) {
  const doc = await UsersModel.findById(id).lean();
  return normalize(doc);
}

async function findByIds(ids) {
  if (!ids.length) {
    return [];
  }

  const docs = await UsersModel.find({ _id: { $in: ids } }).lean();
  return docs.map(normalize);
}

async function findByEmail(email) {
  const doc = await UsersModel.findOne({ email: normalizeEmail(email) }).lean();
  return normalize(doc);
}

async function findByEmailWithPassword(email) {
  const doc = await UsersModel.findOne({ email: normalizeEmail(email) })
    .select('+password')
    .lean();
  return normalize(doc);
}

async function findByUsername(username) {
  const doc = await UsersModel.findOne({ username }).lean();
  return normalize(doc);
}

async function findByUsernameWithPassword(username) {
  const doc = await UsersModel.findOne({ username }).select('+password').lean();
  return normalize(doc);
}

async function updatePassword(userId, hashedPassword) {
  await UsersModel.findByIdAndUpdate(userId, {
    password: hashedPassword,
    updatedAt: new Date(),
  });
}

async function clearPassword(userId) {
  await UsersModel.findByIdAndUpdate(userId, {
    $unset: { password: 1 },
    updatedAt: new Date(),
  });
}

async function markEmailVerified(userId) {
  await UsersModel.findByIdAndUpdate(userId, {
    emailVerified: true,
    updatedAt: new Date(),
  });
}

async function findByAuthProvider(provider, providerId) {
  const doc = await UsersModel.findOne({
    authProviders: { $elemMatch: { provider, providerId } },
  }).lean();

  return normalize(doc);
}

async function addAuthProvider(userId, provider, providerId) {
  await UsersModel.findByIdAndUpdate(userId, {
    $addToSet: { authProviders: { provider, providerId } },
    updatedAt: new Date(),
  });
}

async function updateProfile(userId, fields) {
  const doc = await UsersModel.findByIdAndUpdate(
    userId,
    { ...fields, updatedAt: new Date() },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  return normalize(doc);
}

async function findByIdWithTwoFactorSecret(id) {
  const doc = await UsersModel.findById(id).select('+twoFactorSecret').lean();
  return normalize(doc);
}

async function findByIdWithPasswordAndTwoFactorSecret(id) {
  const doc = await UsersModel.findById(id)
    .select('+password +twoFactorSecret')
    .lean();
  return normalize(doc);
}

async function enableTwoFactor(userId, encryptedSecret) {
  await UsersModel.findByIdAndUpdate(userId, {
    twoFactorEnabled: true,
    twoFactorSecret: encryptedSecret,
    updatedAt: new Date(),
  });
}

async function disableTwoFactor(userId) {
  await UsersModel.findByIdAndUpdate(userId, {
    twoFactorEnabled: false,
    $unset: { twoFactorSecret: 1 },
    updatedAt: new Date(),
  });
}

module.exports = {
  create,
  findById,
  findByIds,
  findByEmail,
  findByEmailWithPassword,
  findByUsername,
  findByUsernameWithPassword,
  updatePassword,
  clearPassword,
  markEmailVerified,
  findByAuthProvider,
  addAuthProvider,
  updateProfile,
  findByIdWithTwoFactorSecret,
  findByIdWithPasswordAndTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
};
