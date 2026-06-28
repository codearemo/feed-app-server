// ******************************************************
// FILES SERVICE — validate uploads and delegate to storage driver
// ******************************************************

const { isMongoObjectId, validateFileName } = require('./files.validation');
const { toArchivedFile, toPublicFile } = require('./files.utils');
const filesRepository = require('./repositories');
const storage = require('./storage');

async function findActiveFileRecord(userId, rawIdentifier) {
  const identifier = decodeURIComponent(rawIdentifier);

  if (isMongoObjectId(identifier)) {
    return filesRepository.findActiveByIdAndUserId(identifier, userId);
  }

  const name = validateFileName(identifier);
  return filesRepository.findActiveByNameAndUserId(name, userId);
}

async function processUploadedFiles(userId, files) {
  if (!files?.length) {
    const error = new Error('At least one file is required');
    error.statusCode = 400;
    throw error;
  }

  const storedFiles = await storage.storeFiles(files);

  try {
    const records = await filesRepository.createMany(userId, storedFiles);
    return records.map(toPublicFile);
  } catch (error) {
    await storage.removeFiles(storedFiles);
    throw error;
  }
}

async function archiveUploadedFile(userId, rawIdentifier) {
  const fileRecord = await findActiveFileRecord(userId, rawIdentifier);

  if (!fileRecord) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  const archived = await storage.archiveFile(fileRecord.name);

  try {
    await filesRepository.markArchived(fileRecord.id, archived.archivedName);
  } catch (error) {
    await storage.restoreArchived(archived);
    throw error;
  }

  return toArchivedFile(fileRecord, archived);
}

async function getFileForDownload(userId, rawIdentifier) {
  const fileRecord = await findActiveFileRecord(userId, rawIdentifier);

  if (!fileRecord) {
    const error = new Error('File not found');
    error.statusCode = 404;
    throw error;
  }

  return fileRecord;
}

module.exports = {
  processUploadedFiles,
  archiveUploadedFile,
  findActiveFileRecord,
  getFileForDownload,
};
