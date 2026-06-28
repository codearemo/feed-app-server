// ******************************************************
// UPLOAD FILENAME — unique stored names for uploaded files
// ******************************************************

const crypto = require('crypto');
const path = require('path');

function buildStoredFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${crypto.randomBytes(16).toString('hex')}${ext}`;
}

module.exports = {
  buildStoredFilename,
};
