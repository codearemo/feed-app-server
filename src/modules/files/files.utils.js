// ******************************************************
// FILES UTILS — API shapes for stored file records
// ******************************************************

const config = require('../../config');
const { getEntityId } = require('../../utils/entity-id');

function buildProtectedDownloadUrl(fileId) {
  const baseUrl = config.upload.local.baseUrl.replace(/\/$/, '');
  return `${baseUrl}/api/v1/uploads/${fileId}/download`;
}

function toPublicFile(record) {
  const file = {
    id: getEntityId(record),
    url: record.url,
    name: record.name,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    encoding: record.encoding,
    provider: record.provider,
  };

  if (!config.upload.publicAccess) {
    file.url = buildProtectedDownloadUrl(file.id);
  }

  return file;
}

function toArchivedFile(record, archived) {
  return {
    id: getEntityId(record),
    name: archived.name,
    archivedName: archived.archivedName,
    provider: archived.provider,
  };
}

module.exports = {
  toPublicFile,
  toArchivedFile,
};
