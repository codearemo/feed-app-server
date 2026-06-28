const express = require('express');
const authenticate = require('../../middleware/authenticate.middleware');
const { uploadLimiter } = require('../../middleware/rate-limit.middleware');
const {
  uploadFiles: uploadFilesMiddleware,
} = require('../../middleware/upload.middleware');
const filesController = require('./files.controller');

const router = express.Router();

router.post(
  '/',
  authenticate,
  uploadLimiter,
  uploadFilesMiddleware,
  filesController.uploadFiles,
);

router.delete(
  '/:fileId',
  authenticate,
  uploadLimiter,
  filesController.archiveFile,
);

router.get(
  '/:fileId/download',
  authenticate,
  uploadLimiter,
  filesController.downloadFile,
);

module.exports = router;
