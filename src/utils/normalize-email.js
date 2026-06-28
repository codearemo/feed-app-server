// ******************************************************
// EMAIL NORMALIZATION — consistent lowercase storage and lookup
// ******************************************************

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

module.exports = {
  normalizeEmail,
};
