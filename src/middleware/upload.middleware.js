// ******************************************************
// UPLOAD — multer config and multipart error handling
// ******************************************************

const fs = require('fs');
const multer = require('multer');
const config = require('../config');
const { UPLOAD_FIELD_NAME } = require('../constants/upload');
const { buildStoredFilename } = require('../utils/upload-filename');

function ensureUploadDirectory() {
  fs.mkdirSync(config.upload.local.directory, { recursive: true });
}

function createMulterStorage() {
  if (config.uploadDriver === 'local') {
    return multer.diskStorage({
      destination(_req, _file, cb) {
        try {
          ensureUploadDirectory();
          cb(null, config.upload.local.directory);
        } catch (error) {
          cb(error);
        }
      },
      filename(_req, file, cb) {
        cb(null, buildStoredFilename(file.originalname));
      },
    });
  }

  // S3 and Cloudinary read file buffers in memory, then upload via storage driver
  return multer.memoryStorage();
}

function fileFilter(_req, file, cb) {
  const allowed = config.upload.allowedMimeTypes;

  if (!allowed.includes(file.mimetype)) {
    const error = new Error(
      `File type not allowed. Allowed types: ${allowed.join(', ')}`,
    );
    error.statusCode = 400;
    return cb(error);
  }

  cb(null, true);
}

function createUploadMiddleware() {
  return multer({
    storage: createMulterStorage(),
    fileFilter,
    limits: {
      fileSize: config.upload.maxFileSize,
      files: config.upload.maxFiles,
    },
  });
}

const upload = createUploadMiddleware();

/**
 * Accept multiple files under the `files` field name.
 * Maps multer errors to HTTP-friendly errors for the global handler.
 */
function uploadFiles(req, res, next) {
  upload.array(UPLOAD_FIELD_NAME, config.upload.maxFiles)(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err.statusCode) {
      next(err);
      return;
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      const error = new Error('File too large');
      error.statusCode = 413;
      next(error);
      return;
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      const error = new Error(
        `Too many files. Maximum is ${config.upload.maxFiles}`,
      );
      error.statusCode = 400;
      next(error);
      return;
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      const error = new Error(
        `Unexpected file field. Use \`${UPLOAD_FIELD_NAME}\` for uploads`,
      );
      error.statusCode = 400;
      next(error);
      return;
    }

    next(err);
  });
}

module.exports = {
  uploadFiles,
};
