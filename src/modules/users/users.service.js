// ******************************************************
// USERS SERVICE — business rules (no HTTP, no Mongoose)
// ******************************************************

const usersRepository = require('./repositories');
const { toPublicUserWithProfile } = require('./users.utils');
const { validateUpdateProfile } = require('./users.validation');
const { assertAssignableProfilePicture } = require('./users.profile');
const { mapMongoDuplicateKeyError } = require('../../utils/mongo-errors');

async function getLoggedInUserProfile(userId) {
  const user = await usersRepository.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return toPublicUserWithProfile(user);
}

async function updateLoggedInUserProfile(userId, body) {
  const payload = validateUpdateProfile(body);
  const user = await usersRepository.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (payload.username && payload.username !== user.username) {
    const existingByUsername = await usersRepository.findByUsername(
      payload.username,
    );

    if (existingByUsername) {
      const error = new Error('Username already in use');
      error.statusCode = 409;
      throw error;
    }
  }

  const updateFields = { ...payload };

  if (payload.profilePicture !== undefined) {
    if (payload.profilePicture === null) {
      updateFields.profilePicture = null;
    } else {
      updateFields.profilePicture = await assertAssignableProfilePicture(
        userId,
        payload.profilePicture,
      );
    }
  }

  try {
    const updated = await usersRepository.updateProfile(userId, updateFields);

    if (!updated) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return toPublicUserWithProfile(updated);
  } catch (error) {
    throw mapMongoDuplicateKeyError(error);
  }
}

module.exports = {
  getLoggedInUserProfile,
  updateLoggedInUserProfile,
};
