// ******************************************************
// AUTHENTICATE MIDDLEWARE — protect routes with JWT
// ******************************************************

const { verifyToken } = require('../modules/auth/access-jwt');
const usersRepository = require('../modules/users/repositories');
const {
  assertUserIsActive,
  assertEmailVerified,
} = require('../modules/auth/auth.utils');

/**
 * Express middleware that requires a valid JWT.
 *
 * Expects: Authorization: Bearer <token>
 *
 * On success: sets req.user = { id: '<user id>' } and calls next().
 * On failure: passes a 401/403 error to the global error handler.
 */
async function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    next(error);
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = verifyToken(token);
    const user = await usersRepository.findById(payload.sub);

    if (!user) {
      const error = new Error('Invalid or expired token');
      error.statusCode = 401;
      next(error);
      return;
    }

    assertUserIsActive(user);
    assertEmailVerified(user);

    req.user = { id: payload.sub };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
