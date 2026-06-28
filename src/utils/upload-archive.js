// ******************************************************
// UPLOAD ARCHIVE — shared soft-delete paths and validation
// ******************************************************

const STORED_FILENAME_PATTERN = /^[a-f0-9]{32}(\.[a-z0-9]+)?$/i;

/**
 * Reject path traversal and other unsafe stored identifiers.
 */
function assertSafeStoredName(name) {
  if (!name || typeof name !== 'string') {
    const error = new Error('File name is required');
    error.statusCode = 400;
    throw error;
  }

  if (
    name.includes('..') ||
    name.includes('\\') ||
    name.startsWith('/') ||
    name.trim() !== name
  ) {
    const error = new Error('Invalid file name');
    error.statusCode = 400;
    throw error;
  }
}

function isArchivedKey(name, archivePrefix) {
  return name === archivePrefix || name.startsWith(`${archivePrefix}/`);
}

/**
 * Active object key / relative path for local and S3 drivers.
 */
function buildArchiveKey(activeName, archivePrefix) {
  assertSafeStoredName(activeName);

  if (isArchivedKey(activeName, archivePrefix)) {
    const error = new Error('File is already archived');
    error.statusCode = 400;
    throw error;
  }

  if (!STORED_FILENAME_PATTERN.test(activeName)) {
    const error = new Error('Invalid file name');
    error.statusCode = 400;
    throw error;
  }

  return `${archivePrefix}/${activeName}`;
}

/**
 * Cloudinary public_id under the configured upload folder.
 */
function buildCloudinaryArchiveId(publicId, folder, archivePrefix) {
  assertSafeStoredName(publicId);

  const folderPrefix = `${folder}/`;

  if (!publicId.startsWith(folderPrefix)) {
    const error = new Error('Invalid file name');
    error.statusCode = 400;
    throw error;
  }

  const relative = publicId.slice(folderPrefix.length);

  if (isArchivedKey(relative, archivePrefix)) {
    const error = new Error('File is already archived');
    error.statusCode = 400;
    throw error;
  }

  if (!relative || relative.includes('/')) {
    const error = new Error('Invalid file name');
    error.statusCode = 400;
    throw error;
  }

  return `${folder}/${archivePrefix}/${relative}`;
}

module.exports = {
  STORED_FILENAME_PATTERN,
  assertSafeStoredName,
  isArchivedKey,
  buildArchiveKey,
  buildCloudinaryArchiveId,
};
