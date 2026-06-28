// ******************************************************
// SOCIAL USERNAME — generate unique usernames for social sign-up
// ******************************************************

const crypto = require('crypto');

function generateSocialUsername() {
  return `user_${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = {
  generateSocialUsername,
};
