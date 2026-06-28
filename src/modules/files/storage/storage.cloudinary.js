// ******************************************************
// STORAGE — Cloudinary driver
// ******************************************************

const cloudinary = require('cloudinary').v2;
const config = require('../../../config');
const { buildCloudinaryArchiveId } = require('../../../utils/upload-archive');
const { storeFilesWithRollback } = require('../../../utils/upload-batch');
const { buildFileMetadata } = require('../../../utils/upload-metadata');

let configured = false;
let testUploader = null;

function ensureConfigured() {
  if (configured || testUploader) {
    return;
  }

  const { cloudName, apiKey, apiSecret } = config.cloudinary;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  configured = true;
}

function getUploader() {
  if (testUploader) {
    return testUploader;
  }

  ensureConfigured();
  return cloudinary.uploader;
}

function uploadBuffer(file) {
  return new Promise((resolve, reject) => {
    const upload = getUploader().upload_stream(
      {
        folder: config.cloudinary.folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    upload.end(file.buffer);
  });
}

async function uploadOne(file) {
  const result = await uploadBuffer(file);

  return buildFileMetadata({
    url: result.secure_url,
    name: result.public_id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: result.bytes ?? file.size,
    encoding: file.encoding,
    provider: 'cloudinary',
  });
}

async function rollbackOne(metadata) {
  await removeFile(metadata);
}

async function storeFiles(files) {
  return storeFilesWithRollback(files, uploadOne, rollbackOne);
}

async function removeFile({ name }) {
  await getUploader().destroy(name, {
    resource_type: 'auto',
  });
}

async function archiveFile(name) {
  const { folder } = config.cloudinary;
  const archiveId = buildCloudinaryArchiveId(
    name,
    folder,
    config.upload.archivePrefix,
  );

  try {
    await getUploader().rename(name, archiveId, {
      resource_type: 'auto',
    });
  } catch (error) {
    if (error.http_code === 404) {
      const notFound = new Error('File not found');
      notFound.statusCode = 404;
      throw notFound;
    }

    throw error;
  }

  return {
    name,
    archivedName: archiveId,
    provider: 'cloudinary',
  };
}

async function restoreArchived({ name, archivedName }) {
  await getUploader().rename(archivedName, name, {
    resource_type: 'auto',
  });
}

function openFile({ url }) {
  return { redirectUrl: url };
}

module.exports = {
  storeFiles,
  removeFile,
  archiveFile,
  restoreArchived,
  openFile,
  __setUploaderForTests(uploader) {
    testUploader = uploader;
  },
  __resetUploaderForTests() {
    testUploader = null;
    configured = false;
  },
};
