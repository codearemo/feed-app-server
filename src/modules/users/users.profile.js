// ******************************************************
// USERS PROFILE — profile picture resolution and hydration
// ******************************************************

const { PROFILE_PICTURE_MIME_TYPES } = require('../../constants/upload');
const filesRepository = require('../files/repositories');
const { toPublicFile } = require('../files/files.utils');

async function resolveProfilePictureForUser(userId, fileId) {
  if (!fileId) {
    return null;
  }

  const file = await filesRepository.findActiveByIdAndUserId(
    String(fileId),
    userId,
  );

  if (!file) {
    return null;
  }

  return toPublicFile(file);
}

async function assertAssignableProfilePicture(userId, fileId) {
  const file = await filesRepository.findActiveByIdAndUserId(fileId, userId);

  if (!file) {
    const error = new Error('Invalid profile picture');
    error.statusCode = 400;
    throw error;
  }

  if (!PROFILE_PICTURE_MIME_TYPES.includes(file.mimeType)) {
    const error = new Error('Profile picture must be an image');
    error.statusCode = 400;
    throw error;
  }

  return fileId;
}

module.exports = {
  resolveProfilePictureForUser,
  assertAssignableProfilePicture,
};
