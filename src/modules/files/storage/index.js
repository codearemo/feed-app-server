// ******************************************************
// STORAGE — driver switch (local | s3 | cloudinary)
// ******************************************************

const config = require('../../../config');

const driverModules = {
  local: './storage.local',
  s3: './storage.s3',
  cloudinary: './storage.cloudinary',
};

function getStorageDriver() {
  const modulePath = driverModules[config.uploadDriver];

  if (!modulePath) {
    throw new Error(
      `No storage driver for UPLOAD_DRIVER: "${config.uploadDriver}"`,
    );
  }

  return require(modulePath);
}

async function storeFiles(files) {
  return getStorageDriver().storeFiles(files);
}

async function removeFiles(files) {
  await Promise.allSettled(
    files.map((file) => getStorageDriver().removeFile(file)),
  );
}

async function archiveFile(name) {
  return getStorageDriver().archiveFile(name);
}

async function restoreArchived(archived) {
  return getStorageDriver().restoreArchived(archived);
}

async function openFile(fileRecord) {
  return getStorageDriver().openFile(fileRecord);
}

module.exports = {
  storeFiles,
  removeFiles,
  archiveFile,
  restoreArchived,
  openFile,
};
