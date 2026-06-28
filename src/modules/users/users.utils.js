// ******************************************************
// USERS UTILS — safe shapes for data leaving the users layer
// ******************************************************

const { resolveProfilePictureForUser } = require('./users.profile');
const { getEntityId } = require('../../utils/entity-id');

/**
 * Returns a copy of a user object that is safe to send to clients.
 *
 * Use this at API boundaries (auth.service, users.service) before returning
 * user data in HTTP responses. It removes sensitive fields — currently
 * `password` — so hashes never leak in JSON.
 *
 * Works on plain objects (e.g. from `.lean()` or after `.toObject()`).
 * Does not mutate the original object.
 *
 * @param {object | null | undefined} user - User record from the repository
 * @returns {object | null} Same user without sensitive fields, or null if input is falsy
 */
function toPublicUser(user) {
  if (!user) return null;
  const {
    password: _password,
    authProviders: _authProviders,
    profilePicture: _profilePicture,
    twoFactorSecret: _twoFactorSecret,
    _id: _mongoId,
    ...publicUser
  } = user;

  return {
    id: getEntityId(user),
    ...publicUser,
  };
}

/**
 * Returns a client-safe user with profilePicture hydrated to the public
 * upload file shape (or null). Raw ObjectId refs are never exposed.
 */
async function toPublicUserWithProfile(user) {
  const publicUser = toPublicUser(user);

  if (!publicUser) {
    return null;
  }

  publicUser.profilePicture = await resolveProfilePictureForUser(
    getEntityId(user),
    user.profilePicture,
  );

  return publicUser;
}

/**
 * Converts a Mongoose document into a plain, client-safe user object.
 *
 * Mongoose queries like `UsersModel.create()` return a *document* — a rich
 * class instance with methods (`save()`, `toObject()`, etc.), not a simple
 * `{ key: value }` object. Call `.toObject()` to get a plain JavaScript
 * object. Our schema's `toObject` transform also strips `password`.
 *
 * This helper then runs `toPublicUser()` as an extra safety layer before
 * the value leaves the repository (e.g. after `create`).
 *
 * @param {import('mongoose').Document | null | undefined} doc - Mongoose document
 * @returns {object | null} Plain user object without sensitive fields
 */
function toPlainObject(doc) {
  if (!doc) return null;
  return toPublicUser(doc.toObject());
}

module.exports = {
  toPublicUser,
  toPublicUserWithProfile,
  toPlainObject,
};
