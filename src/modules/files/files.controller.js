const filesService = require('./files.service');
const storage = require('./storage');
const { sendSuccess } = require('../../utils/api-response');
const path = require('path');

async function uploadFiles(req, res, next) {
  try {
    const files = await filesService.processUploadedFiles(
      req.user.id,
      req.files,
    );

    sendSuccess(res, {
      statusCode: 201,
      message: 'Files uploaded successfully',
      data: files,
    });
  } catch (error) {
    next(error);
  }
}

async function archiveFile(req, res, next) {
  try {
    const archived = await filesService.archiveUploadedFile(
      req.user.id,
      req.params.fileId,
    );

    sendSuccess(res, {
      message: 'File archived successfully',
      data: archived,
    });
  } catch (error) {
    next(error);
  }
}

async function downloadFile(req, res, next) {
  try {
    const fileRecord = await filesService.getFileForDownload(
      req.user.id,
      req.params.fileId,
    );
    const opened = await storage.openFile(fileRecord);

    res.setHeader('Content-Type', fileRecord.mimeType);

    if (opened.redirectUrl) {
      res.redirect(opened.redirectUrl);
      return;
    }

    if (opened.path) {
      res.sendFile(path.resolve(opened.path));
      return;
    }

    opened.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFiles,
  archiveFile,
  downloadFile,
};
