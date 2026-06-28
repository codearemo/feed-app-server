// ******************************************************
// STORAGE — local disk driver
// ******************************************************

const fs = require('fs');
const path = require('path');
const config = require('../../../config');
const { buildArchiveKey } = require('../../../utils/upload-archive');
const { buildFileMetadata } = require('../../../utils/upload-metadata');

function ensureArchiveDirectory() {
  fs.mkdirSync(config.upload.local.archiveDirectory, { recursive: true });
}

async function storeFiles(files) {
  return files.map((file) =>
    buildFileMetadata({
      url: `${config.upload.local.baseUrl}/uploads/${file.filename}`,
      name: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      encoding: file.encoding,
      provider: 'local',
    }),
  );
}

async function removeFile({ name }) {
  const activePath = path.join(config.upload.local.directory, name);

  if (fs.existsSync(activePath)) {
    fs.unlinkSync(activePath);
  }
}

async function archiveFile(name) {
  const archiveKey = buildArchiveKey(name, config.upload.archivePrefix);
  const activePath = path.join(config.upload.local.directory, name);
  const archivePath = path.join(config.upload.local.archiveDirectory, name);

  if (!fs.existsSync(activePath)) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  ensureArchiveDirectory();
  fs.renameSync(activePath, archivePath);

  return {
    name,
    archivedName: archiveKey,
    provider: 'local',
  };
}

async function restoreArchived({ name }) {
  const activePath = path.join(config.upload.local.directory, name);
  const archivePath = path.join(config.upload.local.archiveDirectory, name);

  if (!fs.existsSync(archivePath)) {
    return;
  }

  fs.mkdirSync(config.upload.local.directory, { recursive: true });
  fs.renameSync(archivePath, activePath);
}

function openFile({ name }) {
  const filePath = path.join(config.upload.local.directory, name);

  if (!fs.existsSync(filePath)) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  return { path: filePath };
}

module.exports = {
  storeFiles,
  removeFile,
  archiveFile,
  restoreArchived,
  openFile,
};
