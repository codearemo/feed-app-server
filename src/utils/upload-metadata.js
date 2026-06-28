// ******************************************************
// UPLOAD METADATA — uniform file object returned by the API
// ******************************************************

/**
 * @param {object} params
 * @param {string} params.url
 * @param {string} params.name
 * @param {string} params.originalName
 * @param {string} params.mimeType
 * @param {number} params.size
 * @param {string} params.encoding
 * @param {string} [params.provider] - local | s3 | cloudinary
 */
function buildFileMetadata({
  url,
  name,
  originalName,
  mimeType,
  size,
  encoding,
  provider,
}) {
  const metadata = {
    url,
    name,
    originalName,
    mimeType,
    size,
    encoding,
  };

  if (provider) {
    metadata.provider = provider;
  }

  return metadata;
}

module.exports = {
  buildFileMetadata,
};
