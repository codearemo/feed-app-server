// ******************************************************
// POSTS IMAGES — validate uploaded file references
// ******************************************************

const { POST_IMAGE_MIME_TYPES } = require('../../constants/posts');
const filesRepository = require('../files/repositories');

function extractImageIds(images) {
  return images.map((image) => String(image.id));
}

async function assertAssignableImages(userId, images) {
  if (!images?.length) {
    return [];
  }

  const uniqueIds = [...new Set(extractImageIds(images))];
  const files = await filesRepository.findActiveByIdsAndUserId(
    uniqueIds,
    userId,
  );

  if (files.length !== uniqueIds.length) {
    const error = new Error('One or more images are invalid');
    error.statusCode = 400;
    throw error;
  }

  for (const file of files) {
    if (!POST_IMAGE_MIME_TYPES.includes(file.mimeType)) {
      const error = new Error('Post images must be image files');
      error.statusCode = 400;
      throw error;
    }
  }

  const fileById = new Map(files.map((file) => [String(file._id), file]));
  return uniqueIds.map((id) => fileById.get(id)._id);
}

module.exports = {
  assertAssignableImages,
};
