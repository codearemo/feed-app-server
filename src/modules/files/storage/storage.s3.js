// ******************************************************
// STORAGE — AWS S3 driver
// ******************************************************

const {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const config = require('../../../config');
const { buildArchiveKey } = require('../../../utils/upload-archive');
const { storeFilesWithRollback } = require('../../../utils/upload-batch');
const { buildStoredFilename } = require('../../../utils/upload-filename');
const { buildFileMetadata } = require('../../../utils/upload-metadata');

let s3Client;
let testClient;

function getS3Client() {
  if (testClient) {
    return testClient;
  }

  if (!s3Client) {
    const { region, accessKeyId, secretAccessKey } = config.s3;

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

function buildPublicUrl(key) {
  const { bucket, region, publicUrlBase } = config.s3;

  if (publicUrlBase) {
    return `${publicUrlBase.replace(/\/$/, '')}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadOne(file) {
  const { bucket } = config.s3;
  const client = getS3Client();
  const key = buildStoredFilename(file.originalname);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return buildFileMetadata({
    url: buildPublicUrl(key),
    name: key,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    encoding: file.encoding,
    provider: 's3',
  });
}

async function rollbackOne(metadata) {
  await removeFile(metadata);
}

async function storeFiles(files) {
  return storeFilesWithRollback(files, uploadOne, rollbackOne);
}

async function removeFile({ name }) {
  const { bucket } = config.s3;
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: name,
    }),
  );
}

async function archiveFile(name) {
  const { bucket } = config.s3;
  const client = getS3Client();
  const archiveKey = buildArchiveKey(name, config.upload.archivePrefix);

  try {
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${name}`,
        Key: archiveKey,
      }),
    );
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      const notFound = new Error('File not found');
      notFound.statusCode = 404;
      throw notFound;
    }

    throw error;
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: name,
      }),
    );
  } catch (error) {
    await client
      .send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: archiveKey,
        }),
      )
      .catch(() => {});

    throw error;
  }

  return {
    name,
    archivedName: archiveKey,
    provider: 's3',
  };
}

async function restoreArchived({ name, archivedName }) {
  const { bucket } = config.s3;
  const client = getS3Client();

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${archivedName}`,
      Key: name,
    }),
  );

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: archivedName,
    }),
  );
}

async function openFile({ name, mimeType }) {
  const { bucket } = config.s3;
  const client = getS3Client();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: name,
      }),
    );

    return {
      stream: response.Body,
      mimeType,
    };
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      const notFound = new Error('File not found');
      notFound.statusCode = 404;
      throw notFound;
    }

    throw error;
  }
}

module.exports = {
  storeFiles,
  removeFile,
  archiveFile,
  restoreArchived,
  openFile,
  __setClientForTests(client) {
    testClient = client;
  },
  __resetClientForTests() {
    testClient = null;
    s3Client = null;
  },
};
