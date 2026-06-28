// ******************************************************
// AUTH UTILS — shared auth business rules
// ******************************************************

function assertUserIsActive(user) {
  if (user.status === 'inactive') {
    const error = new Error('Account is inactive');
    error.statusCode = 403;
    throw error;
  }
}

function assertEmailVerified(user) {
  if (!user.emailVerified) {
    const error = new Error('Email not verified');
    error.statusCode = 403;
    throw error;
  }
}

module.exports = {
  assertUserIsActive,
  assertEmailVerified,
};
